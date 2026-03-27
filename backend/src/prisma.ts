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
});

export const prisma = new PrismaClient({ adapter });

