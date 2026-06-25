import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { backendDataPath, backendRootDir } from "../backendPaths";

const DEFAULT_SITE_URL = "https://xn----8sbaaoishcaoovty5ae8dp.xn--p1ai";

type PageListItem = { slug: string; title?: string; status?: string };
type ExportedBlock = { type: string; order: number; data: unknown };
type ExportedPage = {
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  description: string | null;
  preview: string | null;
  blocks: ExportedBlock[];
};

function parseArgs(argv: string[]) {
  const flags = new Set<string>();
  const positional: string[] = [];
  for (const arg of argv) {
    if (arg.startsWith("--")) flags.add(arg);
    else positional.push(arg);
  }
  return {
    outDir: positional[0]?.trim() || backendDataPath("prod-sync"),
    siteUrl: (process.env.SYNC_SITE_URL || DEFAULT_SITE_URL).replace(/\/+$/, ""),
    apply: flags.has("--apply"),
    withUploads: !flags.has("--no-uploads"),
  };
}

async function fetchJson<T>(baseUrl: string, apiPath: string): Promise<T> {
  const url = `${baseUrl}${apiPath.startsWith("/") ? apiPath : `/${apiPath}`}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`GET ${url} failed with ${res.status}`);
  }
  return (await res.json()) as T;
}

function toImportPage(raw: {
  title?: string;
  slug?: string;
  status?: string;
  description?: string | null;
  preview?: string | null;
  blocks?: { type?: string; order?: number; data?: unknown }[];
}): ExportedPage | null {
  const title = String(raw.title || "").trim();
  const slug = String(raw.slug || "").trim();
  if (!title || !slug) return null;
  return {
    title,
    slug,
    status: String(raw.status).toUpperCase() === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    description: typeof raw.description === "string" ? raw.description : null,
    preview: typeof raw.preview === "string" ? raw.preview : null,
    blocks: Array.isArray(raw.blocks)
      ? raw.blocks.map((b, index) => ({
          type: String(b.type || "text"),
          order: typeof b.order === "number" ? b.order : index,
          data: b.data ?? {},
        }))
      : [],
  };
}

function collectUploadPaths(value: unknown, out: Set<string>): void {
  if (typeof value === "string") {
    const re = /\/api\/pages\/uploads\/([A-Za-z0-9._/-]+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(value)) !== null) {
      const rel = m[1].replace(/\\/g, "/").replace(/&quot;$/i, "").replace(/['"]+$/g, "");
      if (rel) out.add(rel);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectUploadPaths(item, out);
    return;
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value as Record<string, unknown>)) collectUploadPaths(v, out);
  }
}

async function downloadUploads(baseUrl: string, uploadPaths: Set<string>) {
  const root = backendDataPath("uploads");
  let saved = 0;
  for (const rel of uploadPaths) {
    const segments = rel.split("/").filter(Boolean);
    if (segments.some((s) => s === "." || s === "..")) continue;
    const dest = path.join(root, ...segments);
    await mkdir(path.dirname(dest), { recursive: true });
    const url = `${baseUrl}/api/pages/uploads/${segments.map(encodeURIComponent).join("/")}`;
    const res = await fetch(url);
    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[sync_from_prod] skip upload ${rel}: HTTP ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    saved += 1;
  }
  return saved;
}

async function writeJson(filePath: string, data: unknown) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function main() {
  const { outDir, siteUrl, apply, withUploads } = parseArgs(process.argv.slice(2));
  // eslint-disable-next-line no-console
  console.log(`[sync_from_prod] source=${siteUrl} out=${outDir} apply=${apply}`);

  const list = await fetchJson<PageListItem[]>(siteUrl, "/api/pages");
  if (!Array.isArray(list)) {
    throw new Error("Unexpected /api/pages response");
  }

  const pages: ExportedPage[] = [];
  for (const item of list) {
    const slug = String(item.slug || "").trim();
    if (!slug) continue;
    const encoded = slug.split("/").map(encodeURIComponent).join("/");
    const full = await fetchJson<Record<string, unknown>>(siteUrl, `/api/pages/slug/${encoded}`);
    const page = toImportPage(full);
    if (page) pages.push(page);
  }

  const [foldersPayload, settingsPayload, bannersPayload, partnersPayload, reviewsPayload, orderPayload] =
    await Promise.all([
      fetchJson<{ folders?: unknown }>(siteUrl, "/api/pages/folders"),
      fetchJson<{ settings?: unknown }>(siteUrl, "/api/pages/site-settings"),
      fetchJson<unknown>(siteUrl, "/api/pages/banners"),
      fetchJson<unknown>(siteUrl, "/api/pages/partners"),
      fetchJson<unknown>(siteUrl, "/api/pages/reviews"),
      fetchJson<unknown>(siteUrl, "/api/pages/display-order"),
    ]);

  const folders = Array.isArray(foldersPayload.folders) ? foldersPayload.folders : [];
  const settings = settingsPayload.settings ?? settingsPayload;

  await writeJson(path.join(outDir, "pages.json"), pages);
  await writeJson(path.join(outDir, "folders.json"), folders);
  await writeJson(path.join(outDir, "siteSettings.json"), settings);
  await writeJson(path.join(outDir, "banners.json"), bannersPayload);
  await writeJson(path.join(outDir, "partners.json"), partnersPayload);
  await writeJson(path.join(outDir, "reviews.json"), reviewsPayload);
  await writeJson(path.join(outDir, "display-order.json"), orderPayload);
  await writeJson(path.join(outDir, "manifest.json"), {
    syncedAt: new Date().toISOString(),
    siteUrl,
    pages: pages.length,
    published: pages.filter((p) => p.status === "PUBLISHED").length,
  });

  let uploadsSaved = 0;
  if (withUploads) {
    const uploadPaths = new Set<string>();
    collectUploadPaths(pages, uploadPaths);
    collectUploadPaths(folders, uploadPaths);
    collectUploadPaths(settings, uploadPaths);
    collectUploadPaths(bannersPayload, uploadPaths);
    uploadsSaved = await downloadUploads(siteUrl, uploadPaths);
  }

  if (apply) {
    const dataRoot = path.join(backendRootDir(), "data");
    await writeJson(path.join(dataRoot, "pages.import.json"), pages);
    await writeJson(path.join(dataRoot, "folders.json"), folders);
    await writeJson(path.join(dataRoot, "siteSettings.json"), settings);
    await writeJson(path.join(dataRoot, "banners.json"), bannersPayload);
    await writeJson(path.join(dataRoot, "partners.json"), partnersPayload);
    await writeJson(path.join(dataRoot, "reviews.json"), reviewsPayload);
    await writeJson(path.join(dataRoot, "display-order.json"), orderPayload);
    // eslint-disable-next-line no-console
    console.log(`[sync_from_prod] applied JSON snapshots to ${dataRoot}`);
    // eslint-disable-next-line no-console
    console.log("[sync_from_prod] run: npm run pages:import -- data/pages.import.json");
  }

  // eslint-disable-next-line no-console
  console.log(
    `[sync_from_prod] done: ${pages.length} pages (${pages.filter((p) => p.status === "PUBLISHED").length} published), ${folders.length} folders, ${uploadsSaved} uploads`,
  );
}

void main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[sync_from_prod] failed", e);
  process.exitCode = 1;
});
