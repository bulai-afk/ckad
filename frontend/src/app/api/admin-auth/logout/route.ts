import { NextResponse } from "next/server";
import { adminAuthCookieSecure } from "@/lib/adminAuthCookie";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin_auth", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: adminAuthCookieSecure(req),
    path: "/",
    maxAge: 0,
  });
  return res;
}

