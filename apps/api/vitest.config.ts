import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      OLLAMA_BASE_URL: "http://test-ollama.local",
      OLLAMA_MODEL: "test-generation-model",
      OLLAMA_EMBED_MODEL: "test-embedding-model",
    },
  },
});
