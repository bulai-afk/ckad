import { NextRequest, NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/backendApiUrl";
import { isAdminSessionRequest, upstreamPagesListInit } from "@/lib/bffUpstreamFetch";

/** Список страниц (публичный навбар; админка — без кэша по cookie admin_auth). */
export async function GET(req: NextRequest) {
  try {
    const url = `${backendApiUrl()}/api/pages`;
    const res = await fetch(url, {
      method: "GET",
      ...upstreamPagesListInit(req),
    });
    if (!res.ok) {
      return NextResponse.json([], {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const data = (await res.json()) as unknown;
    const upstreamCc = res.headers.get("cache-control");
    const cacheControl = isAdminSessionRequest(req)
      ? "no-store, max-age=0"
      : upstreamCc && upstreamCc.trim().length > 0
        ? upstreamCc
        : "public, s-maxage=120, stale-while-revalidate=600";
    return NextResponse.json(Array.isArray(data) ? data : [], {
      headers: { "Cache-Control": cacheControl },
    });
  } catch {
    return NextResponse.json([], {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const res = await fetch(`${backendApiUrl()}/api/pages`, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json({ error: "proxy failed" }, { status: 502 });
  }
}
