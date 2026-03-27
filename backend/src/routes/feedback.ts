import { Router } from "express";
import { promises as fs } from "node:fs";
import path from "node:path";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FEEDBACK_REQUESTS_DATA_PATH = path.resolve(process.cwd(), "data", "feedbackRequests.json");

export const feedbackRouter = Router();

type FeedbackRequestRecord = {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  name: string;
  message: string;
};

async function readFeedbackRequestsFromFile(): Promise<FeedbackRequestRecord[]> {
  try {
    const raw = await fs.readFile(FEEDBACK_REQUESTS_DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is FeedbackRequestRecord => {
      return (
        typeof item === "object" &&
        item !== null &&
        typeof (item as { id?: unknown }).id === "string" &&
        typeof (item as { createdAt?: unknown }).createdAt === "string"
      );
    });
  } catch {
    return [];
  }
}

async function writeFeedbackRequestsToFile(items: FeedbackRequestRecord[]): Promise<void> {
  await fs.mkdir(path.dirname(FEEDBACK_REQUESTS_DATA_PATH), { recursive: true });
  await fs.writeFile(FEEDBACK_REQUESTS_DATA_PATH, JSON.stringify(items, null, 2), "utf-8");
}

feedbackRouter.get("/requests", async (_req, res) => {
  const requests = await readFeedbackRequestsFromFile();
  return res.json({ requests });
});

feedbackRouter.delete("/requests", async (req, res) => {
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
  const existing = await readFeedbackRequestsFromFile();
  const next = existing.filter((r) => !ids.includes(r.id));
  await writeFeedbackRequestsToFile(next);
  return res.json({ ok: true, removed: existing.length - next.length, requests: next });
});

feedbackRouter.post("/", async (req, res) => {
  const body = req.body as Record<string, unknown> | undefined;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!name || name.length > 200) {
    return res.status(400).json({ error: "invalid_name" });
  }
  if (!message || message.length < 5 || message.length > 8000) {
    return res.status(400).json({ error: "invalid_message" });
  }
  if (phone.length > 60) {
    return res.status(400).json({ error: "invalid_phone" });
  }
  if (email.length > 200) {
    return res.status(400).json({ error: "invalid_email" });
  }
  if (email && !emailRe.test(email)) {
    return res.status(400).json({ error: "invalid_email_format" });
  }
  if (!phone && !email) {
    return res.status(400).json({ error: "contact_required" });
  }

  // eslint-disable-next-line no-console
  console.log("[feedback]", new Date().toISOString(), { name, phone, email, message });

  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts[0] || name;
  const lastName = parts.slice(1).join(" ");
  const requests = await readFeedbackRequestsFromFile();
  requests.unshift({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    firstName,
    lastName,
    phone,
    email,
    name,
    message,
  });
  await writeFeedbackRequestsToFile(requests);

  res.json({ ok: true });
});
