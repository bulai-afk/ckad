import { writeFile } from "node:fs/promises";
import { prisma } from "../prisma";

type ExportedBlock = {
  type: string;
  order: number;
  data: unknown;
};

type ExportedPage = {
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  blocks: ExportedBlock[];
};

async function main() {
  const outPath = process.argv[2]?.trim() || "";
  if (!outPath) {
    throw new Error("Usage: pages_export.ts <output.json>");
  }

  const pages = await prisma.page.findMany({
    orderBy: { id: "asc" },
    include: { blocks: { orderBy: { order: "asc" } } },
  });

  const exported: ExportedPage[] = pages.map((p) => ({
    title: p.title,
    slug: p.slug,
    status: p.status,
    blocks: p.blocks.map((b) => ({
      type: b.type,
      order: b.order,
      data: b.data,
    })),
  }));

  await writeFile(outPath, JSON.stringify(exported, null, 2), "utf8");
  // eslint-disable-next-line no-console
  console.log(`[pages_export] exported ${exported.length} pages -> ${outPath}`);
}

void main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[pages_export] failed", e);
  process.exitCode = 1;
});

