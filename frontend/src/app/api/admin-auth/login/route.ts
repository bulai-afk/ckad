import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function POST(req: Request) {
  let username = "";
  let password = "";

  try {
    // Safer in production: avoids edge cases where req.json() fails.
    const raw = await req.text();
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    const body = (parsed ?? {}) as { username?: unknown; password?: unknown };
    username = typeof body.username === "string" ? body.username.trim() : "";
    password = typeof body.password === "string" ? body.password.trim() : "";
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "username_and_password_required" },
      { status: 400 },
    );
  }

  try {
    const upstream = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { ok: false, error: "invalid_credentials" },
        { status: 401 },
      );
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_auth", "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[admin-auth/login] failed", e);
    return NextResponse.json(
      { ok: false, error: "login_failed" },
      { status: 500 },
    );
  }
}

