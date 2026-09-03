import { Ollama } from "ollama";
import { z } from "zod";
import { config } from "../config.js";
import { AppError } from "../utils/errors.js";
import { extractJsonObject } from "../utils/json.js";
import {
  noopTimingLogger,
  type TimingLogger,
} from "../utils/timing.js";

export interface OllamaService {
  status(): Promise<{
    reachable: boolean;
    baseUrl: string;
    model: string;
    embedModel: string;
    modelAvailable?: boolean;
    embedModelAvailable?: boolean;
    error?: string;
  }>;
  chat(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  ): Promise<string>;
  chatStream?(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    onChunk: (chunk: string) => void,
  ): Promise<string>;
  generateJson<T>(
    prompt: string,
    schema: z.ZodType<T>,
    system?: string,
  ): Promise<T>;
  embed(text: string): Promise<number[]>;
}

export class LocalOllamaService implements OllamaService {
  private readonly client: Ollama;

  constructor(
    private readonly baseUrl = config.ollamaBaseUrl,
    private readonly model = config.ollamaModel,
    private readonly embedModel = config.ollamaEmbedModel,
    private readonly logger: TimingLogger = noopTimingLogger,
  ) {
    this.client = new Ollama({ host: baseUrl });
  }

  async status() {
    try {
      const response = await this.client.list();
      const models = response.models.map((entry) => entry.name);
      return {
        reachable: true,
        baseUrl: this.baseUrl,
        model: this.model,
        embedModel: this.embedModel,
        modelAvailable: hasConfiguredModel(models, this.model),
        embedModelAvailable: hasConfiguredModel(models, this.embedModel),
      };
    } catch (error) {
      return {
        reachable: false,
        baseUrl: this.baseUrl,
        model: this.model,
        embedModel: this.embedModel,
        error:
          error instanceof Error ? error.message : "Unable to reach Ollama.",
      };
    }
  }

  async chat(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  ) {
    const startedAt = performance.now();
    try {
      const response = await this.client.chat({
        model: this.model,
        messages,
        stream: false,
        think: false,
        options: {
          temperature: 0.2,
        },
      });
      this.logOllamaCall("chat", this.model, startedAt, true);
      return response.message.content;
    } catch (error) {
      this.logOllamaCall("chat", this.model, startedAt, false, error);
      throw new AppError(
        normalizeOllamaError(
          error,
          `Unable to generate with model "${this.model}".`,
        ),
        503,
        "OLLAMA_GENERATION_FAILED",
      );
    }
  }

  async chatStream(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
    onChunk: (chunk: string) => void,
  ) {
    const startedAt = performance.now();
    let responseText = "";
    try {
      const response = await this.client.chat({
        model: this.model,
        messages,
        stream: true,
        think: false,
        options: {
          temperature: 0.2,
        },
      });

      for await (const part of response) {
        const chunk = part.message.content;
        if (!chunk) continue;
        responseText += chunk;
        onChunk(chunk);
      }

      this.logOllamaCall("chat_stream", this.model, startedAt, true);
      return responseText;
    } catch (error) {
      this.logOllamaCall("chat_stream", this.model, startedAt, false, error);
      throw new AppError(
        normalizeOllamaError(
          error,
          `Unable to generate with model "${this.model}".`,
        ),
        503,
        "OLLAMA_GENERATION_FAILED",
      );
    }
  }

  async generateJson<T>(
    prompt: string,
    schema: z.ZodType<T>,
    system = "Return only valid JSON.",
  ) {
    const messages = [
      {
        role: "system" as const,
        content: `${system}\nDo not include markdown or commentary.`,
      },
      { role: "user" as const, content: prompt },
    ];

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const raw = await this.chat(messages);
      try {
        return schema.parse(extractJsonObject(raw));
      } catch (error) {
        if (attempt === 1) {
          throw new AppError(
            `The model returned malformed structured data: ${
              error instanceof Error ? error.message : "validation failed"
            }`,
            502,
            "STRUCTURED_OUTPUT_INVALID",
          );
        }
        messages.push({
          role: "user" as const,
          content:
            "Repair the previous response. Return a single JSON object matching the requested schema exactly.",
        });
      }
    }

    throw new AppError(
      "Structured output generation failed.",
      502,
      "STRUCTURED_OUTPUT_INVALID",
    );
  }

  async embed(text: string) {
    const startedAt = performance.now();
    try {
      const response = await this.client.embeddings({
        model: this.embedModel,
        prompt: text,
      });
      this.logOllamaCall("embeddings", this.embedModel, startedAt, true);
      return response.embedding;
    } catch (error) {
      this.logOllamaCall("embeddings", this.embedModel, startedAt, false, error);
      throw new AppError(
        normalizeOllamaError(
          error,
          `Unable to create embeddings with model "${this.embedModel}".`,
        ),
        503,
        "OLLAMA_EMBEDDING_FAILED",
      );
    }
  }

  private logOllamaCall(
    operation: string,
    model: string,
    startedAt: number,
    success: boolean,
    error?: unknown,
  ) {
    this.logger(
      {
        event: "ollama_timing",
        model,
        operation,
        durationMs: Math.round(performance.now() - startedAt),
        success,
        ...(error
          ? { error: error instanceof Error ? error.message : String(error) }
          : {}),
      },
      success ? "Ollama call completed" : "Ollama call failed",
    );
  }
}

function hasConfiguredModel(models: string[], configuredModel: string) {
  return models.some(
    (model) =>
      model === configuredModel ||
      (!configuredModel.includes(":") && model === `${configuredModel}:latest`),
  );
}

function normalizeOllamaError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  if (error.message.toLowerCase().includes("model")) {
    return `${fallback} Check that the configured Ollama model is pulled locally.`;
  }
  return error.message || fallback;
}
