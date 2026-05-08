import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/backendApiUrl";

export async function GET() {
  try {
    const res = await fetch(`${backendApiUrl()}/api/feedback/requests`, {
      method: "GET",
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
    return NextResponse.json({ requests: [] }, { status: 502 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.text();
    const res = await fetch(`${backendApiUrl()}/api/feedback/requests`, {
      method: "DELETE",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
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
