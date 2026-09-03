import {
  productSearchIntentSchema,
  type Product,
  type ProductSearchIntent,
} from "@ai-commerce/shared";
import type { OllamaService } from "../ollama/ollamaService.js";

export async function parseProductSearchIntent(
  query: string,
  ollama: OllamaService,
): Promise<ProductSearchIntent> {
  const prompt = `Translate this B2B merchandise product search request into structured search intent.

The LLM only extracts meaning. It does not query products or enforce business rules.

Return JSON with this shape:
{
  "requiredFilters": {
    "brand": "Nike",
    "category": "Apparel",
    "subcategory": "T-Shirt",
    "maxPrice": 50
  },
  "preferences": {
    "colors": [{"value": "black", "weight": 1}],
    "keywords": []
  }
}

Use only these broad categories when present: Apparel, Drinkware, Bags, Headwear, Outdoor.
Common subcategories: T-Shirt, Hoodie, Polo, Jacket, Water Bottle, Tumbler, Backpack, Tote, Cap.
Only include hard filters explicitly requested as requirements, such as a brand, product type, category, or maximum unit price.
Put optional desires such as preferred colors into preferences so they affect ranking but not exclusion.
If no filters or preferences are clear, return empty objects/arrays.

Search request: ${JSON.stringify(query)}`;

  const parsed = await ollama.generateJson(
    prompt,
    productSearchIntentSchema,
    "You extract validated commerce product search intent and return only JSON.",
  );
  return {
    requiredFilters: parsed.requiredFilters ?? {},
    preferences: {
      colors: (parsed.preferences?.colors ?? []).map((preference) => ({
        value: preference.value,
        weight: preference.weight ?? 1,
      })),
      keywords: (parsed.preferences?.keywords ?? []).map((preference) => ({
        value: preference.value,
        weight: preference.weight ?? 1,
      })),
    },
  };
}

export function searchProducts(
  products: Product[],
  intent: ProductSearchIntent,
) {
  const filters = intent.requiredFilters;
  const normalizedBrand = normalize(filters.brand);
  const normalizedCategory = normalize(filters.category);
  const normalizedSubcategory = normalizeSubcategory(filters.subcategory);

  const filtered = products.filter((product) => {
    if (normalizedBrand && normalize(product.brand) !== normalizedBrand)
      return false;
    if (
      normalizedCategory &&
      normalize(product.category) !== normalizedCategory
    )
      return false;
    if (
      normalizedSubcategory &&
      normalizeSubcategory(product.subcategory) !== normalizedSubcategory
    )
      return false;
    if (filters.maxPrice !== undefined && product.price > filters.maxPrice)
      return false;
    return true;
  });

  return filtered
    .map((product) => ({
      product,
      score: preferenceScore(product, intent),
    }))
    .sort((a, b) => b.score - a.score || a.product.price - b.product.price)
    .map((result) => result.product);
}

function preferenceScore(product: Product, intent: ProductSearchIntent) {
  let score = product.inventory > 0 ? 1 : 0;
  const productColors = product.colors.map(normalize);
  for (const color of intent.preferences.colors) {
    if (productColors.includes(normalize(color.value))) {
      score += 10 * color.weight;
    }
  }

  const searchableText =
    `${product.name} ${product.brand} ${product.category} ${product.subcategory}`
      .trim()
      .toLowerCase();
  for (const keyword of intent.preferences.keywords) {
    if (searchableText.includes(keyword.value.trim().toLowerCase())) {
      score += 2 * keyword.weight;
    }
  }
  return score;
}

function normalize(value: string | undefined) {
  return value?.trim().toLowerCase();
}

function normalizeSubcategory(value: string | undefined) {
  const normalized = normalize(value);
  if (!normalized) return normalized;
  const synonyms = new Map([
    ["t-shirts", "t-shirt"],
    ["tee", "t-shirt"],
    ["tees", "t-shirt"],
    ["shirts", "t-shirt"],
    ["water bottles", "water bottle"],
    ["bottles", "water bottle"],
    ["tumblers", "tumbler"],
    ["hoodies", "hoodie"],
    ["polos", "polo"],
    ["jackets", "jacket"],
    ["backpacks", "backpack"],
    ["totes", "tote"],
    ["caps", "cap"],
    ["hats", "cap"],
  ]);
  return synonyms.get(normalized) ?? normalized;
}
