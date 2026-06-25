import { Router } from "express";
import express from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { backendDataPath } from "../backendPaths";

const FILE_EXCHANGE_DATA_PATH = backendDataPath("fileExchange.json");
const FILE_EXCHANGE_UPLOADS_DIR = backendDataPath("uploads", "file-exchange");
const MAX_FILE_BYTES = 50 * 1024 * 1024;

export const fileExchangeRouter = Router();

type FileExchangeRecord = {
  id: string;
  createdAt: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  description?: string;
};

function sanitizeOriginalName(name: string): string {
  const base = path.basename(name).replace(/[^\w.\- ()а-яА-ЯёЁ]+/gu, "_").trim();
  return base.slice(0, 240) || "file";
}

function guessMimeType(fileName: string, fallback?: string): string {
  if (fallback && fallback.trim()) return fallback.trim().slice(0, 120);
  const ext = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".zip": "application/zip",
    ".rar": "application/vnd.rar",
    ".7z": "application/x-7z-compressed",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".json": "application/json",
    ".xml": "application/xml",
    ".html": "text/html",
    ".htm": "text/html",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".mp4": "video/mp4",
    ".mp3": "audio/mpeg",
  };
  return map[ext] || "application/octet-stream";
}

function contentDispositionAttachment(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7E]+/g, "_").replace(/["\\]/g, "_") || "file";
  const encoded = encodeURIComponent(fileName);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

async function readFileExchangeRecords(): Promise<FileExchangeRecord[]> {
  try {
    const raw = await fs.readFile(FILE_EXCHANGE_DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is FileExchangeRecord => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as { id?: unknown }).id === "string" &&
        typeof (item as { createdAt?: unknown }).createdAt === "string" &&
        typeof (item as { originalName?: unknown }).originalName === "string" &&
        typeof (item as { storedName?: unknown }).storedName === "string"
      );
    });
  } catch {
    return [];
  }
}

async function writeFileExchangeRecords(items: FileExchangeRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(FILE_EXCHANGE_DATA_PATH), { recursive: true });
  await fs.writeFile(FILE_EXCHANGE_DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
}

function recordToPublicItem(record: FileExchangeRecord) {
  return {
    id: record.id,
    createdAt: record.createdAt,
    originalName: record.originalName,
    mimeType: record.mimeType,
    size: record.size,
    description: record.description || "",
    downloadUrl: `/api/file-exchange/download/${record.id}`,
  };
}

function decodeHeaderValue(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    return decodeURIComponent(value.trim());
  } catch {
    return value.trim();
  }
}

async function persistUploadedFile(opts: {
  bytes: Buffer;
  fileNameRaw: string;
  mimeTypeRaw?: string;
  descriptionRaw?: string;
}): Promise<FileExchangeRecord> {
  const { bytes, fileNameRaw, mimeTypeRaw = "", descriptionRaw = "" } = opts;

  if (!fileNameRaw) {
    throw new Error("fileName is required");
  }
  if (descriptionRaw.length > 500) {
    throw new Error("description_too_long");
  }
  if (bytes.length === 0) {
    throw new Error("empty_file");
  }
  if (bytes.length > MAX_FILE_BYTES) {
    throw new Error("file_too_large");
  }

  const originalName = sanitizeOriginalName(fileNameRaw);
  const ext = path.extname(originalName).toLowerCase();
  const storedName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const mimeType = guessMimeType(originalName, mimeTypeRaw);

  await fs.mkdir(FILE_EXCHANGE_UPLOADS_DIR, { recursive: true });
  const absPath = path.join(FILE_EXCHANGE_UPLOADS_DIR, storedName);
  await fs.writeFile(absPath, bytes);

  const record: FileExchangeRecord = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    originalName,
    storedName,
    mimeType,
    size: bytes.length,
    ...(descriptionRaw ? { description: descriptionRaw } : {}),
  };

  const records = await readFileExchangeRecords();
  records.unshift(record);
  await writeFileExchangeRecords(records);
  return record;
}

const uploadRawBody = express.raw({
  limit: MAX_FILE_BYTES,
  type: "application/octet-stream",
});

fileExchangeRouter.get("/", async (_req, res) => {
  const records = await readFileExchangeRecords();
  return res.json({ files: records.map(recordToPublicItem) });
});

fileExchangeRouter.post("/upload", uploadRawBody, async (req, res) => {
  const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  const fileNameRaw = decodeHeaderValue(req.headers["x-file-name"]);
  const mimeTypeRaw = decodeHeaderValue(req.headers["x-mime-type"]);
  const descriptionRaw = decodeHeaderValue(req.headers["x-description"]);

  try {
    const record = await persistUploadedFile({
      bytes,
      fileNameRaw,
      mimeTypeRaw,
      descriptionRaw,
    });
    return res.status(201).json({ ok: true, file: recordToPublicItem(record) });
  } catch (err) {
    const code = err instanceof Error ? err.message : "upload_failed";
    if (code === "fileName is required") {
      return res.status(400).json({ error: "fileName is required" });
    }
    if (code === "description_too_long") {
      return res.status(400).json({ error: "description_too_long" });
    }
    if (code === "empty_file") {
      return res.status(400).json({ error: "empty_file" });
    }
    if (code === "file_too_large") {
      return res.status(400).json({ error: "file_too_large" });
    }
    return res.status(500).json({ error: "upload_failed" });
  }
});

fileExchangeRouter.post("/", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const fileNameRaw = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const dataBase64 = typeof body.dataBase64 === "string" ? body.dataBase64.trim() : "";
  const mimeTypeRaw = typeof body.mimeType === "string" ? body.mimeType.trim() : "";
  const descriptionRaw = typeof body.description === "string" ? body.description.trim() : "";

  if (!dataBase64) {
    return res.status(400).json({ error: "dataBase64 is required" });
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(dataBase64, "base64");
  } catch {
    return res.status(400).json({ error: "invalid_base64" });
  }

  try {
    const record = await persistUploadedFile({
      bytes,
      fileNameRaw,
      mimeTypeRaw,
      descriptionRaw,
    });
    return res.status(201).json({ ok: true, file: recordToPublicItem(record) });
  } catch (err) {
    const code = err instanceof Error ? err.message : "upload_failed";
    if (code === "fileName is required") {
      return res.status(400).json({ error: "fileName is required" });
    }
    if (code === "description_too_long") {
      return res.status(400).json({ error: "description_too_long" });
    }
    if (code === "empty_file") {
      return res.status(400).json({ error: "empty_file" });
    }
    if (code === "file_too_large") {
      return res.status(400).json({ error: "file_too_large" });
    }
    return res.status(500).json({ error: "upload_failed" });
  }
});

fileExchangeRouter.delete("/", async (req, res) => {
  const body = (req.body ?? {}) as { ids?: unknown };
  const idsRaw = body.ids;
  if (!Array.isArray(idsRaw)) {
    return res.status(400).json({ error: "ids array is required" });
  }
  const ids = idsRaw
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    return res.status(400).json({ error: "ids array is empty" });
  }

  const existing = await readFileExchangeRecords();
  const toRemove = existing.filter((r) => ids.includes(r.id));
  const next = existing.filter((r) => !ids.includes(r.id));

  await Promise.all(
    toRemove.map(async (r) => {
      const abs = path.join(FILE_EXCHANGE_UPLOADS_DIR, r.storedName);
      try {
        await fs.unlink(abs);
      } catch {
        /* file may already be missing */
      }
    }),
  );

  await writeFileExchangeRecords(next);
  return res.json({
    ok: true,
    removed: toRemove.length,
    files: next.map(recordToPublicItem),
  });
});

fileExchangeRouter.get("/download/:id", async (req, res) => {
  const id = String(req.params.id || "").trim();
  if (!id) return res.status(400).json({ error: "id is required" });

  const records = await readFileExchangeRecords();
  const record = records.find((r) => r.id === id);
  if (!record) return res.status(404).json({ error: "not_found" });

  const abs = path.resolve(FILE_EXCHANGE_UPLOADS_DIR, record.storedName);
  const root = path.resolve(FILE_EXCHANGE_UPLOADS_DIR);
  if (!abs.startsWith(`${root}${path.sep}`)) {
    return res.status(400).json({ error: "invalid_path" });
  }

  try {
    const data = await fs.readFile(abs);
    res.set("Content-Type", record.mimeType || guessMimeType(record.originalName));
    res.set("Content-Disposition", contentDispositionAttachment(record.originalName));
    res.set("Content-Length", String(data.length));
    res.set("Cache-Control", "private, max-age=3600");
    return res.send(data);
  } catch {
    return res.status(404).json({ error: "file_missing" });
  }
});
