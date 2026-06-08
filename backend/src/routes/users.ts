import { Router } from "express";
import { prisma } from "../prisma";
import { hashPassword } from "../lib/password";

export const usersRouter = Router();

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

usersRouter.get("/", async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { id: "asc" },
    });
    return res.json({ users });
  } catch {
    return res.status(500).json({ error: "failed_to_load_users" });
  }
});

usersRouter.post("/", async (req, res) => {
  const body = (req.body ?? {}) as {
    email?: unknown;
    password?: unknown;
    name?: unknown;
    role?: unknown;
  };

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";
  const name =
    typeof body.name === "string" && body.name.trim() ? body.name.trim() : null;
  const role = body.role === "ADMIN" || body.role === "EDITOR" ? body.role : "EDITOR";

  if (!email || !password) {
    return res.status(400).json({ error: "email_and_password_required" });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: "password_too_short" });
  }

  try {
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        name,
        role,
      },
      select: userSelect,
    });
    return res.status(201).json({ user });
  } catch (error: unknown) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
        ? "email_already_exists"
        : "failed_to_create_user";
    return res.status(code === "email_already_exists" ? 409 : 500).json({ error: code });
  }
});

usersRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  const body = (req.body ?? {}) as {
    email?: unknown;
    password?: unknown;
    name?: unknown;
    role?: unknown;
  };

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";
  const nameProvided = typeof body.name === "string";
  const name = nameProvided ? (body.name as string).trim() || null : undefined;
  const role =
    body.role === "ADMIN" || body.role === "EDITOR" ? body.role : undefined;

  if (!email) {
    return res.status(400).json({ error: "email_required" });
  }

  if (password && password.length < 4) {
    return res.status(400).json({ error: "password_too_short" });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const data: {
      email: string;
      name?: string | null;
      role?: "ADMIN" | "EDITOR";
      password?: string;
    } = { email };

    if (nameProvided) data.name = name;
    if (role) data.role = role;
    if (password) data.password = await hashPassword(password);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });
    return res.json({ user });
  } catch (error: unknown) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
        ? "email_already_exists"
        : "failed_to_update_user";
    return res.status(code === "email_already_exists" ? 409 : 500).json({ error: code });
  }
});

usersRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "invalid_user_id" });
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });
    if (!existing) {
      return res.status(404).json({ error: "user_not_found" });
    }

    const totalUsers = await prisma.user.count();
    if (totalUsers <= 1) {
      return res.status(400).json({ error: "cannot_delete_last_user" });
    }

    if (existing.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return res.status(400).json({ error: "cannot_delete_last_admin" });
      }
    }

    const pagesCount = await prisma.page.count({ where: { authorId: id } });
    if (pagesCount > 0) {
      return res.status(400).json({ error: "user_has_pages" });
    }

    await prisma.user.delete({ where: { id } });
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "failed_to_delete_user" });
  }
});
