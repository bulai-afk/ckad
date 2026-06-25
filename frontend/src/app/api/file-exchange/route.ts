import { NextResponse } from "next/server";
import { backendApiUrl } from "@/lib/backendApiUrl";

export async function GET() {
  try {
    const res = await fetch(`${backendApiUrl()}/api/file-exchange`, {
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
    return NextResponse.json({ files: [] }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "file is required" }, { status: 400 });
      }
      const description = typeof formData.get("description") === "string"
        ? String(formData.get("description"))
        : "";
      const buffer = Buffer.from(await file.arrayBuffer());
      const res = await fetch(`${backendApiUrl()}/api/file-exchange/upload`, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
          "X-Mime-Type": file.type || "application/octet-stream",
          "X-Description": encodeURIComponent(description),
          "Content-Length": String(buffer.length),
        },
        body: buffer,
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

  try {
    const body = await request.text();
    const res = await fetch(`${backendApiUrl()}/api/file-exchange`, {
      method: "POST",
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

export async function DELETE(request: Request) {
  try {
    const body = await request.text();
    const res = await fetch(`${backendApiUrl()}/api/file-exchange`, {
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
