import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isLikelyStaticPublicFile(pathname: string): boolean {
  if (pathname === "/favicon.ico") return true;
  return /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|txt|xml|json|map)$/i.test(pathname);
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  /*
   * Статика Next (CSS/JS чанки), API и типичные файлы из public не трогаем.
   * Иначе при сбое matcher middleware может отработать на `/_next/static/...css` и Safari
   * получит не CSS, а HTML с чужим MIME — «Did not parse stylesheet... non CSS MIME types».
   */
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/favicon.ico" ||
    isLikelyStaticPublicFile(pathname)
  ) {
    return NextResponse.next();
  }

  const res = NextResponse.next();

  /* HTML и маршруты приложения: не отдавать из кэша браузера (актуальные папки/услуги и т.д.) */
  res.headers.set("Cache-Control", "no-store, must-revalidate");

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
  matcher: [
    /* Всё, кроме статики Next, API и корня favicon (см. также ранний return в middleware). */
    "/((?!_next/|api/|favicon.ico).*)",
  ],
};
