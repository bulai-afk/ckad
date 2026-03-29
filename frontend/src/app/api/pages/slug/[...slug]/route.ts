import { NextResponse } from "next/server";

function backendBase(): string {
  return (
    process.env.BACKEND_API_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:4000"
  );
}

/**
 * GET /api/pages/slug/a/b/c → бэкенд /api/pages/slug/a/b/c (без %2F внутри сегмента).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await context.params;
  const segments = Array.isArray(slug) ? slug : [];
  if (segments.length === 0) {
    return NextResponse.json({ error: "slug is required" }, { status: 400 });
  }
  const path = segments.map((s) => encodeURIComponent(s)).join("/");
  try {
    const url = `${backendBase()}/api/pages/slug/${path}`;
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
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
    return NextResponse.json(
      { error: "proxy failed" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
