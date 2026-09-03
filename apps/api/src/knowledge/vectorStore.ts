import type { KnowledgeChunk } from "./chunker.js";

export interface SearchResult extends KnowledgeChunk {
  score: number;
}

export class InMemoryVectorStore {
  private chunks: Required<KnowledgeChunk>[] = [];

  replace(chunks: Required<KnowledgeChunk>[]) {
    this.chunks = chunks;
  }

  count() {
    return this.chunks.length;
  }

  search(queryEmbedding: number[], topK = 4): SearchResult[] {
    return this.chunks
      .map((chunk) => ({
        ...chunk,
        score: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    magA += a[index] * a[index];
    magB += b[index] * b[index];
  }

  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}
