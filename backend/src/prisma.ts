import { PrismaClient } from "../generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { config as loadDotenv } from "dotenv";

// Force local .env values for backend runtime.
loadDotenv({ override: true });

// Настройки подключения берём из DATABASE_URL через prisma.config.ts,
// здесь конфигурируем драйвер-адаптер напрямую из DATABASE_URL.
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL env var");
}

const url = new URL(databaseUrl);

const adapter = new PrismaMariaDb({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: url.username,
  password: url.password,
  database: url.pathname.replace(/^\//, ""),
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10_000),
  acquireTimeout: Number(process.env.DB_ACQUIRE_TIMEOUT_MS || 10_000),
  connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
});

export const prisma = new PrismaClient({ adapter });

export async function waitForDatabaseReady(options?: {
  retries?: number;
  retryDelayMs?: number;
}): Promise<void> {
  const retries = options?.retries ?? Number(process.env.DB_CONNECT_RETRIES || 15);
  const retryDelayMs = options?.retryDelayMs ?? Number(process.env.DB_RETRY_DELAY_MS || 2_000);

  let lastError: unknown = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await prisma.$queryRawUnsafe("SELECT 1");
      return;
    } catch (err) {
      lastError = err;
      // eslint-disable-next-line no-console
      console.error(
        `[DB] attempt ${attempt}/${retries} failed:`,
        err instanceof Error ? err.message : String(err),
      );
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

