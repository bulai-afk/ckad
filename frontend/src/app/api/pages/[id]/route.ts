import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { apiPagesSlugDataCacheTag } from "@/lib/apiPagesSlugUrl";
import { backendApiUrl } from "@/lib/backendApiUrl";

/** Прокси GET/PUT/DELETE /api/pages/:id → Express (админка, same-origin). */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const res = await fetch(`${backendApiUrl()}/api/pages/${encodeURIComponent(id)}`, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
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

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const body = await req.text();
    let slugForRevalidate: string | null = null;
    try {
      const parsed = JSON.parse(body) as { slug?: unknown };
      if (typeof parsed.slug === "string") {
        const s = parsed.slug.trim().replace(/^\/+/, "");
        if (s) slugForRevalidate = s;
      }
    } catch {
      /* не JSON или без slug — просто не инвалидируем путь */
    }
    const res = await fetch(`${backendApiUrl()}/api/pages/${encodeURIComponent(id)}`, {
      method: "PUT",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body,
    });
    const text = await res.text();
    if (res.ok && slugForRevalidate) {
      try {
        revalidateTag(apiPagesSlugDataCacheTag(slugForRevalidate), "max");
        revalidatePath(`/${slugForRevalidate}`, "layout");
      } catch {
        /* в нестандартной среде revalidatePath может быть недоступен */
      }
    }
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

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  try {
    const res = await fetch(`${backendApiUrl()}/api/pages/${encodeURIComponent(id)}`, {
      method: "DELETE",
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
