import { Router } from "express";
import { prisma } from "../prisma";
import { verifyPassword } from "../lib/password";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const body = (req.body ?? {}) as { username?: unknown; password?: unknown };
  const username =
    typeof body.username === "string" ? body.username.trim() : "";
  const password =
    typeof body.password === "string" ? body.password.trim() : "";

  if (!username || !password) {
    return res.status(400).json({ error: "username_and_password_required" });
  }

  const user = await prisma.user.findUnique({
    where: { email: username },
    select: { id: true, email: true, password: true, role: true },
  });

  if (!user) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  return res.json({
    ok: true,
    user: {
      id: user.id,
      username: user.email,
      role: user.role,
    },
  });
});

