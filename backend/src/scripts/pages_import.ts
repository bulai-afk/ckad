import { readFile } from "node:fs/promises";
import { prisma } from "../prisma";
import { hashPassword } from "../lib/password";

type ImportedBlock = {
  type: string;
  order: number;
  data: unknown;
};

type ImportedPage = {
  title: string;
  slug: string;
  status?: "DRAFT" | "PUBLISHED";
  blocks?: ImportedBlock[];
};

async function ensureDemoAdminUser() {
  const email = "demo";
  const plainPassword = "demo";
  const passwordHash = await hashPassword(plainPassword);
  const user = await prisma.user.upsert({
    where: { email },
    update: { password: passwordHash, role: "ADMIN" },
    create: { email, password: passwordHash, role: "ADMIN" },
    select: { id: true },
  });
  return user.id;
}

function sanitizePages(raw: unknown): ImportedPage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((p) => typeof p === "object" && p !== null)
    .map((p) => p as Record<string, unknown>)
    .map((p) => ({
      title: typeof p.title === "string" ? p.title : "",
      slug: typeof p.slug === "string" ? p.slug : "",
      status: p.status === "PUBLISHED" ? ("PUBLISHED" as const) : ("DRAFT" as const),
      blocks: Array.isArray(p.blocks)
        ? p.blocks
            .filter((b) => typeof b === "object" && b !== null)
            .map((b) => b as Record<string, unknown>)
            .map((b) => ({
              type: typeof b.type === "string" ? b.type : "paragraph",
              order: typeof b.order === "number" ? b.order : 0,
              data: (b.data ?? {}) as unknown,
            }))
        : [],
    }))
    .filter((p) => p.title.trim() && p.slug.trim());
}

async function main() {
  const inPath = process.argv[2]?.trim() || "";
  if (!inPath) {
    throw new Error("Usage: pages_import.ts <input.json>");
  }

  const authorId = await ensureDemoAdminUser();
  const raw = JSON.parse(await readFile(inPath, "utf8")) as unknown;
  const pages = sanitizePages(raw);

  let upserted = 0;
  for (const p of pages) {
    const blocks = p.blocks ?? [];

    await prisma.$transaction(async (tx) => {
      const page = await tx.page.upsert({
        where: { slug: p.slug },
        update: {
          title: p.title,
          status: p.status ?? "DRAFT",
        },
        create: {
          title: p.title,
          slug: p.slug,
          status: p.status ?? "DRAFT",
          authorId,
        },
        select: { id: true },
      });

      await tx.block.deleteMany({ where: { pageId: page.id } });
      if (blocks.length > 0) {
        await tx.block.createMany({
          data: blocks.map((b) => ({
            pageId: page.id,
            type: b.type,
            order: b.order,
            data: b.data as never,
          })),
        });
      }
    });

    upserted += 1;
  }

  // eslint-disable-next-line no-console
  console.log(`[pages_import] upserted ${upserted} pages from ${inPath}`);
}

void main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[pages_import] failed", e);
  process.exitCode = 1;
});

