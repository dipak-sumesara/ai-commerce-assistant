import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";

const envPath = findUp(".env", process.cwd());
if (envPath) {
  loadEnv({ path: envPath });
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  ollamaBaseUrl: requireEnv("OLLAMA_BASE_URL"),
  ollamaModel: requireEnv("OLLAMA_MODEL"),
  ollamaEmbedModel: requireEnv("OLLAMA_EMBED_MODEL"),
  maxHistoryMessages: Number(process.env.MAX_HISTORY_MESSAGES ?? 8),
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} must be configured. Copy .env.example to .env or export the variable.`,
    );
  }
  return value;
}

function findUp(fileName: string, startDir: string) {
  let current = startDir;
  while (true) {
    const candidate = path.join(current, fileName);
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}
