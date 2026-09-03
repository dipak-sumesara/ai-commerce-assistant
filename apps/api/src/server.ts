import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  chatRequestSchema,
  productSearchRequestSchema,
  type Product,
} from "@ai-commerce/shared";
import { config } from "./config.js";
import { ChatService } from "./chat/chatService.js";
import { KnowledgeBase } from "./knowledge/knowledgeBase.js";
import {
  LocalOllamaService,
  type OllamaService,
} from "./ollama/ollamaService.js";
import { loadProducts } from "./products/productRepository.js";
import {
  parseProductSearchIntent,
  searchProducts,
} from "./search/productSearchService.js";
import { AppError } from "./utils/errors.js";
import type { TimingLogger } from "./utils/timing.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const dataDir = path.join(rootDir, "data");

export async function buildServer(deps?: {
  ollama?: OllamaService;
  knowledgeBase?: KnowledgeBase;
  products?: Product[];
}) {
  const app = Fastify({
    logger: true,
  });
  await app.register(cors, { origin: true });

  const timingLogger: TimingLogger = (event, message) =>
    app.log.info(event, message);
  const ollama =
    deps?.ollama ??
    new LocalOllamaService(
      config.ollamaBaseUrl,
      config.ollamaModel,
      config.ollamaEmbedModel,
      timingLogger,
    );
  const knowledgeBase =
    deps?.knowledgeBase ??
    new KnowledgeBase(path.join(dataDir, "knowledge"), ollama, timingLogger);
  const products =
    deps?.products ?? (await loadProducts(path.join(dataDir, "products.json")));
  const chatService = new ChatService(ollama, knowledgeBase, timingLogger);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply
        .status(error.statusCode)
        .send({ error: error.message, code: error.code });
      return;
    }

    if (typeof error === "object" && error !== null && "validation" in error) {
      reply
        .status(400)
        .send({ error: "Invalid request payload.", code: "VALIDATION_ERROR" });
      return;
    }

    app.log.error(error);
    reply
      .status(500)
      .send({ error: "Unexpected server error.", code: "INTERNAL_ERROR" });
  });

  app.get("/health", async () => ({ ok: true }));

  app.get("/api/ollama/status", async () => ollama.status());

  app.post("/api/knowledge/reload", async () => knowledgeBase.reload());

  app.get("/api/products", async () => ({ products }));

  app.post("/api/chat", async (request, reply) => {
    const parsed = chatRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({
        error: "Message is required and must be under 2000 characters.",
        code: "INVALID_CHAT",
      });
      return;
    }

    return chatService.answer(parsed.data.message, parsed.data.history);
  });

  app.post("/api/product-search", async (request, reply) => {
    const parsed = productSearchRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      reply
        .status(400)
        .send({ error: "Search query is required.", code: "INVALID_SEARCH" });
      return;
    }

    const intent = await parseProductSearchIntent(parsed.data.query, ollama);
    const results = searchProducts(products, intent);
    return {
      intent,
      products: results,
      message:
        results.length === 0
          ? "No products matched the required filters."
          : undefined,
    };
  });

  return app;
}

if (process.env.NODE_ENV !== "test") {
  const app = await buildServer();
  try {
    try {
      await app.inject({ method: "POST", url: "/api/knowledge/reload" });
    } catch (error) {
      app.log.warn(
        { error },
        "Knowledge reload failed. Use POST /api/knowledge/reload after Ollama is available.",
      );
    }
    await app.listen({ port: config.port, host: "0.0.0.0" });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}
