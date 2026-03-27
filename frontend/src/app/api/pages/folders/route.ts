import { NextResponse } from "next/server";

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
    const url = `${backendBase()}/api/pages/folders`;
    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json({ folders: [] }, {
        status: 502,
        headers: { "Cache-Control": "no-store" },
      });
    }
    const data = (await res.json()) as unknown;
    const folders =
      typeof data === "object" &&
      data !== null &&
      Array.isArray((data as { folders?: unknown[] }).folders)
        ? (data as { folders: unknown[] }).folders
        : [];
    return NextResponse.json(
      { folders },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json(
      { folders: [] },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

