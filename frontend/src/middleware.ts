import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLoginRoute = pathname === "/admin/login";
  const isAuthorized = req.cookies.get("admin_auth")?.value === "1";

  if (!isAdminRoute) return NextResponse.next();

  if (isAdminLoginRoute && isAuthorized) {
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  if (!isAdminLoginRoute && !isAuthorized) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};

