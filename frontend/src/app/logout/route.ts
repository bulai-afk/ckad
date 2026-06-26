import { NextResponse } from "next/server";
import { adminAuthCookieSecure } from "@/lib/adminAuthCookie";
import { requestPublicOrigin } from "@/lib/requestPublicOrigin";

export async function GET(req: Request) {
  const redirectTo = new URL("/admin/login", requestPublicOrigin(req));
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

