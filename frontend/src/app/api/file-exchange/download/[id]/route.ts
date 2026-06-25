import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/backendApiUrl";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const safeId = encodeURIComponent(id);
  try {
    const upstream = await fetch(`${backendApiUrl()}/api/file-exchange/download/${safeId}`, {
      method: "GET",
      cache: "no-store",
    });
    const body = await upstream.arrayBuffer();
    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");
    const contentDisposition = upstream.headers.get("content-disposition");
    const contentLength = upstream.headers.get("content-length");
    if (contentType) headers.set("Content-Type", contentType);
    if (contentDisposition) headers.set("Content-Disposition", contentDisposition);
    if (contentLength) headers.set("Content-Length", contentLength);
    headers.set("Cache-Control", "private, max-age=3600");
    return new NextResponse(body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return NextResponse.json({ error: "proxy failed" }, { status: 502 });
  }
}
