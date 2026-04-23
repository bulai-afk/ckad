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
    const url = `${backendBase()}/api/pages/display-order`;
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ orderBySection: {} }, {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const data = (await res.json()) as unknown;
    const orderBySection =
      typeof data === "object" &&
      data !== null &&
      typeof (data as { orderBySection?: unknown }).orderBySection === "object" &&
      (data as { orderBySection?: unknown }).orderBySection !== null
        ? (data as { orderBySection: unknown }).orderBySection
        : {};
    return NextResponse.json(
      { orderBySection },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json(
      { orderBySection: {} },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.text();
    const res = await fetch(`${backendBase()}/api/pages/display-order`, {
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
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}

