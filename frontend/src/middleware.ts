import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isLikelyStaticPublicFile(pathname: string): boolean {
  if (pathname === "/favicon.ico") return true;
  return /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|txt|xml|json|map)$/i.test(pathname);
}

function withNoIndex(res: NextResponse): NextResponse {
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
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
    pathname === "/favicon.ico" ||
    isLikelyStaticPublicFile(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return withNoIndex(NextResponse.next());
  }

  if (pathname === "/services" || pathname.startsWith("/services/")) {
    return withNoIndex(NextResponse.next());
  }

  const res = NextResponse.next();

  /*
   * Публичные страницы: CDN может держать HTML коротко (s-maxage), браузер — с ревалидацией (max-age=0).
   * Полный no-store раздувает «critical path» на каждом заходе (HAR: многомегабайтный документ снова с нуля).
   * Админка и редиректы ниже — только no-store.
   */
  if (!pathname.startsWith("/admin")) {
    res.headers.set(
      "Cache-Control",
      "public, max-age=0, s-maxage=120, stale-while-revalidate=600",
    );
    return res;
  }

  res.headers.set("Cache-Control", "no-store, must-revalidate");
  withNoIndex(res);

  const isAdminLoginRoute = pathname === "/admin/login";
  const isAuthorized = req.cookies.get("admin_auth")?.value === "1";

  if (isAdminLoginRoute && isAuthorized) {
    const redirectRes = NextResponse.redirect(new URL("/admin/dashboard", req.url));
    redirectRes.headers.set("Cache-Control", "no-store, must-revalidate");
    return withNoIndex(redirectRes);
  }

  if (!isAdminLoginRoute && !isAuthorized) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    const redirectRes = NextResponse.redirect(loginUrl);
    redirectRes.headers.set("Cache-Control", "no-store, must-revalidate");
    return withNoIndex(redirectRes);
  }

  return res;
}

export const config = {
  matcher: [
    /* Всё, кроме статики Next и favicon (см. ранний return в middleware). */
    "/((?!_next/|favicon.ico).*)",
  ],
};
