import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isLikelyStaticPublicFile(pathname: string): boolean {
  if (pathname === "/favicon.ico") return true;
  return /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|txt|xml|json|map)$/i.test(pathname);
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  const res = NextResponse.next();

  /* HTML и маршруты приложения: не отдавать из кэша браузера (актуальные папки/услуги и т.д.) */
  if (!pathname.startsWith("/_next/") && !isLikelyStaticPublicFile(pathname)) {
    res.headers.set("Cache-Control", "no-store, must-revalidate");
  }

  if (!pathname.startsWith("/admin")) {
    return res;
  }

  const isAdminLoginRoute = pathname === "/admin/login";
  const isAuthorized = req.cookies.get("admin_auth")?.value === "1";

  if (isAdminLoginRoute && isAuthorized) {
    const redirectRes = NextResponse.redirect(new URL("/admin/dashboard", req.url));
    redirectRes.headers.set("Cache-Control", "no-store, must-revalidate");
    return redirectRes;
  }

  if (!isAdminLoginRoute && !isAuthorized) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const redirectRes = NextResponse.redirect(loginUrl);
    redirectRes.headers.set("Cache-Control", "no-store, must-revalidate");
    return redirectRes;
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
