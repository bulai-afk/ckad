import { NextResponse } from "next/server";

function backendBase(): string {
  return (
    process.env.BACKEND_API_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:4000"
  );
}

/** Список страниц для публичного навбара (клиент ходит сюда same-origin). */
export async function GET() {
  try {
    const url = `${backendBase()}/api/pages`;
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json([], {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const data = (await res.json()) as unknown;
    return NextResponse.json(Array.isArray(data) ? data : [], {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json([], {
      status: 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
