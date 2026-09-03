import { describe, expect, it } from "vitest";
import type { Product, ProductSearchIntent } from "@ai-commerce/shared";
import { searchProducts } from "../search/productSearchService.js";

const products: Product[] = [
  {
    id: "1",
    name: "Nike Black Tee",
    brand: "Nike",
    category: "Apparel",
    subcategory: "T-Shirt",
    price: 30,
    colors: ["black"],
    sizes: ["M"],
    inventory: 10,
  },
  {
    id: "2",
    name: "Nike White Tee",
    brand: "Nike",
    category: "Apparel",
    subcategory: "T-Shirt",
    price: 25,
    colors: ["white"],
    sizes: ["M"],
    inventory: 10,
  },
  {
    id: "3",
    name: "Adidas Black Tee",
    brand: "Adidas",
    category: "Apparel",
    subcategory: "T-Shirt",
    price: 28,
    colors: ["black"],
    sizes: ["M"],
    inventory: 10,
  },
  {
    id: "4",
    name: "Nike Black Hoodie",
    brand: "Nike",
    category: "Apparel",
    subcategory: "Hoodie",
    price: 60,
    colors: ["black"],
    sizes: ["M"],
    inventory: 10,
  },
  {
    id: "5",
    name: "YETI Black Bottle",
    brand: "YETI",
    category: "Drinkware",
    subcategory: "Water Bottle",
    price: 35,
    colors: ["black"],
    sizes: ["18 oz"],
    inventory: 10,
  },
];

function intent(overrides: Partial<ProductSearchIntent>): ProductSearchIntent {
  return {
    requiredFilters: overrides.requiredFilters ?? {},
    ...overrides,
    preferences: {
      colors: overrides.preferences?.colors ?? [],
      keywords: overrides.preferences?.keywords ?? [],
    },
  };
}

describe("searchProducts", () => {
  it("applies product brand filtering deterministically", () => {
    const results = searchProducts(
      products,
      intent({ requiredFilters: { brand: "Nike" } }),
    );
    expect(results).toHaveLength(3);
    expect(results.every((product) => product.brand === "Nike")).toBe(true);
  });

  it("applies product category filtering", () => {
    const results = searchProducts(
      products,
      intent({ requiredFilters: { category: "Apparel" } }),
    );
    expect(results).toHaveLength(4);
    expect(results.every((product) => product.category === "Apparel")).toBe(
      true,
    );
  });

  it("applies product price filtering", () => {
    const results = searchProducts(
      products,
      intent({ requiredFilters: { maxPrice: 30 } }),
    );
    expect(results.map((product) => product.id)).toEqual(["2", "3", "1"]);
  });

  it("ranks preferred colors higher without excluding other valid products", () => {
    const results = searchProducts(
      products,
      intent({
        requiredFilters: {
          brand: "Nike",
          subcategory: "T-Shirt",
          maxPrice: 50,
        },
        preferences: { colors: [{ value: "black", weight: 1 }], keywords: [] },
      }),
    );

    expect(results.map((product) => product.id)).toEqual(["1", "2"]);
  });
});
