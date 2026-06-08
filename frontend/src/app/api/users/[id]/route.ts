import { NextRequest, NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/backendApiUrl";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const body = await req.text();
    const res = await fetch(`${backendApiUrl()}/api/users/${encodeURIComponent(id)}`, {
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

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const res = await fetch(`${backendApiUrl()}/api/users/${encodeURIComponent(id)}`, {
      method: "DELETE",
      cache: "no-store",
      headers: { Accept: "application/json" },
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
