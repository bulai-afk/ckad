import { NextResponse } from "next/server";
import { adminAuthCookieSecure } from "@/lib/adminAuthCookie";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = new URL("/admin/login", url.origin);
  const res = NextResponse.redirect(redirectTo);
  res.cookies.set("admin_auth", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: adminAuthCookieSecure(req),
    path: "/",
    maxAge: 0,
  });
  return res;
}

