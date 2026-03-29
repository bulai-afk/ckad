import { prisma } from "../prisma";

/**
 * Заполняет Page.description и Page.preview из блоков summary/preview
 * для страниц с slug `services/...` (миграция данных после add_page_service_descriptions).
 */
async function main() {
  const pages = await prisma.page.findMany({
    where: { slug: { startsWith: "services/" } },
    include: {
      blocks: {
        where: { type: { in: ["summary", "preview"] } },
        select: { type: true, data: true },
      },
    },
  });

  let updated = 0;
  for (const p of pages) {
    const summary = p.blocks.find((b) => b.type === "summary");
    const previewBlock = p.blocks.find((b) => b.type === "preview");
    const fromSummary =
      summary && typeof (summary.data as { text?: unknown })?.text === "string"
        ? String((summary.data as { text: string }).text).trim()
        : "";
    const fromPreview =
      previewBlock && typeof (previewBlock.data as { src?: unknown })?.src === "string"
        ? String((previewBlock.data as { src: string }).src).trim()
        : "";

    const nextDesc = fromSummary !== "" ? fromSummary : p.description ?? null;
    const nextPreview = fromPreview !== "" ? fromPreview : p.preview ?? null;

    if (p.description === nextDesc && p.preview === nextPreview) continue;

    await prisma.page.update({
      where: { id: p.id },
      data: {
        description: nextDesc,
        preview: nextPreview,
      },
    });
    updated += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`OK: обновлено страниц услуг: ${updated} из ${pages.length}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });
