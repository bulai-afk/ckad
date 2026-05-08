import { NextResponse } from "next/server";

function backendBase(): string {
  return (
    process.env.BACKEND_API_URL ||
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:4000"
  );
}

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
    const upstream = await fetch(`${backendBase()}/api/pages/uploads/${safePath}`, {
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
