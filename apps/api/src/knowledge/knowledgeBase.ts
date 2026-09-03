import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { OllamaService } from "../ollama/ollamaService.js";
import { AppError } from "../utils/errors.js";
import { chunkDocument, type KnowledgeChunk } from "./chunker.js";
import { InMemoryVectorStore, type SearchResult } from "./vectorStore.js";
import {
  noopTimingLogger,
  timeOperation,
  type TimingLogger,
} from "../utils/timing.js";

export class KnowledgeBase {
  private readonly store = new InMemoryVectorStore();

  constructor(
    private readonly knowledgeDir: string,
    private readonly ollama: OllamaService,
    private readonly logger: TimingLogger = noopTimingLogger,
  ) {}

  async reload() {
    const files = (await readdir(this.knowledgeDir))
      .filter((file) => file.endsWith(".md"))
      .sort();
    const chunks: Required<KnowledgeChunk>[] = [];

    for (const file of files) {
      const source = file.replace(/\.md$/, "");
      const content = await readFile(
        path.join(this.knowledgeDir, file),
        "utf8",
      );
      const documentChunks = chunkDocument(source, content);
      for (const chunk of documentChunks) {
        chunks.push({
          ...chunk,
          embedding: await this.ollama.embed(chunk.text),
        });
      }
    }

    this.store.replace(chunks);
    return { files: files.length, chunks: chunks.length };
  }

  async retrieve(question: string) {
    if (this.store.count() === 0) {
      throw new AppError(
        "The knowledge base is empty. Reload knowledge before asking questions.",
        503,
        "EMPTY_KB",
      );
    }

    const embedding = await timeOperation(
      this.logger,
      "embedding generation",
      "embed_query",
      () => this.ollama.embed(question),
    );
    return timeOperation(
      this.logger,
      "vector retrieval",
      "search_vector_store",
      async () => this.store.search(embedding, 4),
    );
  }

  buildContext(results: SearchResult[], minScore = 0.2) {
    const relevant = results.filter((result) => result.score >= minScore);
    return {
      relevant,
      context: relevant
        .map((result) => `Source: ${result.source}\n${result.text}`)
        .join("\n\n---\n\n"),
    };
  }
}
