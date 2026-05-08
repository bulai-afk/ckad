import { NextRequest, NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/backendApiUrl";

/** Список страниц для публичного навбара (клиент ходит сюда same-origin). */
export async function GET() {
  try {
    const url = `${backendApiUrl()}/api/pages`;
    const res = await fetch(url, {
      method: "GET",
      cache: "force-cache",
      next: { revalidate: 120 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json([], {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const data = (await res.json()) as unknown;
    const upstreamCc = res.headers.get("cache-control");
    return NextResponse.json(Array.isArray(data) ? data : [], {
      headers: {
        "Cache-Control":
          upstreamCc && upstreamCc.trim().length > 0
            ? upstreamCc
            : "public, s-maxage=120, stale-while-revalidate=600",
      },
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
