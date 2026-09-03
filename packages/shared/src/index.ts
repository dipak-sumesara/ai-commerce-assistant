import { z } from "zod";

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string(),
  category: z.string(),
  subcategory: z.string(),
  price: z.number().nonnegative(),
  colors: z.array(z.string()).min(1),
  sizes: z.array(z.string()).min(1),
  inventory: z.number().int().nonnegative(),
  leadTimeDays: z.number().int().positive().optional(),
});

export const preferenceSchema = z.object({
  value: z.string().min(1),
  weight: z.number().min(0).max(1).default(1),
});

export const productSearchIntentSchema = z.object({
  requiredFilters: z
    .object({
      brand: z.string().min(1).optional(),
      category: z.string().min(1).optional(),
      subcategory: z.string().min(1).optional(),
      maxPrice: z.number().positive().optional(),
    })
    .default({}),
  preferences: z
    .object({
      colors: z.array(preferenceSchema).default([]),
      keywords: z.array(preferenceSchema).default([]),
    })
    .default({
      colors: [],
      keywords: [],
    }),
});

export const scopeIntentSchema = z.object({
  inScope: z.boolean(),
  intent: z.enum([
    "delivery_policy",
    "returns_policy",
    "cancellation_policy",
    "shipping_policy",
    "product_info",
    "ordering",
    "services",
    "general_chat",
    "unknown",
  ]),
  confidence: z.number().min(0).max(1),
});

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  history: z.array(chatMessageSchema).max(12).default([]),
});

export const productSearchRequestSchema = z.object({
  query: z.string().trim().min(1).max(1000),
});

export const productSearchResponseSchema = z.object({
  intent: productSearchIntentSchema,
  products: z.array(productSchema),
  message: z.string().optional(),
});

export const chatResponseSchema = z.object({
  answer: z.string(),
  inScope: z.boolean(),
  intent: z.string(),
  sources: z.array(z.string()).default([]),
});

export type Product = z.infer<typeof productSchema>;
export type ProductSearchIntent = z.infer<typeof productSearchIntentSchema>;
export type ScopeIntent = z.infer<typeof scopeIntentSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatRequest = z.infer<typeof chatRequestSchema>;
