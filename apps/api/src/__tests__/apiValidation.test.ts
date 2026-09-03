import { describe, expect, it, vi } from "vitest";
import type { Product } from "@ai-commerce/shared";
import { buildServer } from "../server.js";
import type { OllamaService } from "../ollama/ollamaService.js";

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
];

describe("API input handling", () => {
  it("rejects empty chat input", async () => {
    const app = await buildServer({ products, ollama: mockOllama() });
    const response = await app.inject({
      method: "POST",
      url: "/api/chat",
      payload: { message: "" },
    });
    expect(response.statusCode).toBe(400);
  });

  it("rejects empty product search input", async () => {
    const app = await buildServer({ products, ollama: mockOllama() });
    const response = await app.inject({
      method: "POST",
      url: "/api/product-search",
      payload: { query: "" },
    });
    expect(response.statusCode).toBe(400);
  });
});

function mockOllama(): OllamaService {
  return {
    status: vi.fn(),
    chat: vi.fn(),
    generateJson: vi.fn(),
    embed: vi.fn(),
  };
}
