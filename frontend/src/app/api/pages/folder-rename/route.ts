import { NextRequest, NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/backendApiUrl";

export async function PUT(req: NextRequest) {
  try {
    const body = await req.text();
    const res = await fetch(`${backendApiUrl()}/api/pages/folder-rename`, {
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
    return NextResponse.json({ error: "proxy failed" }, { status: 502 });
  }
}
