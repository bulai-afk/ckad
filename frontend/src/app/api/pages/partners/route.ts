import { NextRequest, NextResponse } from "next/server";

function backendBase(): string {
  return (
    process.env.BACKEND_API_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:4000"
  );
}

async function proxyToBackend(init: RequestInit & { method: string }): Promise<Response> {
  const url = `${backendBase()}/api/pages/partners`;
  return fetch(url, {
    ...init,
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(init.headers as Record<string, string>),
    },
  });
}

export async function GET() {
  try {
    const res = await proxyToBackend({ method: "GET" });
    if (!res.ok) {
      return NextResponse.json(
        { slides: [], error: `backend ${res.status}` },
        { status: 502 },
      );
    }
    const data = (await res.json()) as unknown;
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ slides: [], error: "proxy failed" }, { status: 502 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.text();
    const res = await proxyToBackend({
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
