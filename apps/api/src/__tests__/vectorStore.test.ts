import { describe, expect, it } from "vitest";
import {
  cosineSimilarity,
  InMemoryVectorStore,
} from "../knowledge/vectorStore.js";

describe("vector utilities", () => {
  it("calculates cosine similarity", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("ranks chunks by vector similarity", () => {
    const store = new InMemoryVectorStore();
    store.replace([
      {
        id: "a",
        source: "delivery",
        text: "delivery times",
        embedding: [1, 0],
      },
      { id: "b", source: "returns", text: "returns", embedding: [0, 1] },
    ]);

    expect(store.search([0.9, 0.1], 2)[0].source).toBe("delivery");
  });
});
