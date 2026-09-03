import { scopeIntentSchema, type ScopeIntent } from "@ai-commerce/shared";
import type { OllamaService } from "../ollama/ollamaService.js";

export const OUT_OF_SCOPE_RESPONSE =
  "I can help with questions about our products, ordering, delivery, returns, cancellation, shipping, and services.";

const inScopeHints = [
  "delivery",
  "deliver",
  "return",
  "refund",
  "cancel",
  "shipping",
  "ship",
  "order",
  "products",
  "catalog",
  "services",
  "merchandise",
  "hoodie",
  "shirt",
  "bottle",
  "bag",
];

const outOfScopeHints = [
  "joke",
  "python",
  "code",
  "president",
  "quantum",
  "email",
  "poem",
  "recipe",
  "weather",
];

export async function classifyScope(
  message: string,
  ollama: OllamaService,
): Promise<ScopeIntent> {
  const lowered = message.toLowerCase();
  if (outOfScopeHints.some((hint) => lowered.includes(hint))) {
    return { inScope: false, intent: "general_chat", confidence: 0.9 };
  }

  if (inScopeHints.some((hint) => lowered.includes(hint))) {
    return { inScope: true, intent: inferIntent(lowered), confidence: 0.82 };
  }

  const prompt = `Classify whether the user request is in scope for a fictional B2B merchandise commerce assistant.

Supported scope: products, ordering, delivery, returns, cancellation, shipping, and services for the commerce business.
Out of scope: jokes, coding, general writing, current events, science explanations, personal advice, or unrelated chat.

Return JSON exactly like:
{"inScope":true,"intent":"delivery_policy","confidence":0.95}

Allowed intent values: delivery_policy, returns_policy, cancellation_policy, shipping_policy, product_info, ordering, services, general_chat, unknown.

User request: ${JSON.stringify(message)}`;

  return ollama.generateJson(
    prompt,
    scopeIntentSchema,
    "You are a strict commerce-domain intent classifier.",
  );
}

function inferIntent(lowered: string): ScopeIntent["intent"] {
  if (lowered.includes("deliver")) return "delivery_policy";
  if (lowered.includes("return") || lowered.includes("refund"))
    return "returns_policy";
  if (lowered.includes("cancel")) return "cancellation_policy";
  if (lowered.includes("ship")) return "shipping_policy";
  if (lowered.includes("order")) return "ordering";
  if (lowered.includes("service")) return "services";
  if (lowered.includes("product") || lowered.includes("catalog"))
    return "product_info";
  return "unknown";
}
