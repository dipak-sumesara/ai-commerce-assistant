import { describe, expect, it, vi } from "vitest";
import { scopeIntentSchema } from "@ai-commerce/shared";
import { ChatService } from "../chat/chatService.js";
import {
  classifyScope,
  OUT_OF_SCOPE_RESPONSE,
} from "../chat/scopeClassifier.js";
import type { KnowledgeBase } from "../knowledge/knowledgeBase.js";
import type { OllamaService } from "../ollama/ollamaService.js";

const ollama: OllamaService = {
  status: vi.fn(),
  chat: vi.fn(),
  generateJson: vi.fn(),
  embed: vi.fn(),
};

describe("scope guardrail", () => {
  it("detects out-of-scope requests before RAG", async () => {
    const knowledgeBase = {
      retrieve: vi.fn(),
      buildContext: vi.fn(),
    } as unknown as KnowledgeBase;
    const service = new ChatService(ollama, knowledgeBase);

    const result = await service.answer("Tell me a joke.");

    expect(result.answer).toBe(OUT_OF_SCOPE_RESPONSE);
    expect(result.inScope).toBe(false);
    expect(knowledgeBase.retrieve).not.toHaveBeenCalled();
  });

  it("detects in-scope delivery questions", async () => {
    const result = await classifyScope(
      "What is your average delivery time?",
      ollama,
    );
    expect(result).toMatchObject({ inScope: true, intent: "delivery_policy" });
  });

  it("validates scope classifier structured output with Zod", () => {
    expect(() =>
      scopeIntentSchema.parse({
        inScope: "yes",
        intent: "delivery_policy",
        confidence: 2,
      }),
    ).toThrow();
  });
});
