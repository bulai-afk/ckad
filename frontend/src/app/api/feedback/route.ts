import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/backendApiUrl";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const res = await fetch(`${backendApiUrl()}/api/feedback`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": request.headers.get("Content-Type") || "application/json",
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
