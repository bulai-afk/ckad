import { NextRequest, NextResponse } from "next/server";

function backendBase(): string {
  return (
    process.env.BACKEND_API_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:4000"
  );
}

export async function GET() {
  try {
    const res = await fetch(`${backendBase()}/api/pages/site-settings`, {
      method: "GET",
      cache: "force-cache",
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });
    const text = await res.text();
    const upstreamCacheControl = res.headers.get("cache-control");
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control":
          upstreamCacheControl && upstreamCacheControl.trim()
            ? upstreamCacheControl
            : "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return NextResponse.json(
      { settings: null },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.text();
    const res = await fetch(`${backendBase()}/api/pages/site-settings`, {
      method: "PUT",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
