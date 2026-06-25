import { NextResponse } from "next/server";

/** Корень /api без подпути — не страница сайта, только 404 для роботов и случайных заходов. */
export function GET() {
  return new NextResponse("Not Found", {
    status: 404,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow",
      "Cache-Control": "no-store",
    },
  });
}
