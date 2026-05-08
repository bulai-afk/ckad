import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/backendApiUrl";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const segments = Array.isArray(path) ? path : [];
  if (segments.length === 0) {
    return NextResponse.json({ error: "path is required" }, { status: 400 });
  }
  const safePath = segments.map((s) => encodeURIComponent(s)).join("/");
  try {
    const upstream = await fetch(`${backendApiUrl()}/api/pages/uploads/${safePath}`, {
      method: "GET",
      cache: "force-cache",
      next: { revalidate: 86400 },
    });
    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") || "application/octet-stream",
        "Cache-Control":
          upstream.headers.get("cache-control") ||
          "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "proxy failed" }, { status: 502 });
  }
}
