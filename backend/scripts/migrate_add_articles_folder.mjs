import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd());
const FOLDERS_PATH = path.join(ROOT, "data", "folders.json");

function normalizeSlug(s) {
  return String(s || "")
    .trim()
    .replace(/^\/+/u, "")
    .replace(/\/+$/u, "")
    .replace(/\/+/gu, "/")
    .toLowerCase();
}

function isObject(x) {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

async function main() {
  const raw = await fs.readFile(FOLDERS_PATH, "utf8").catch((e) => {
    throw new Error(`Не удалось прочитать folders.json: ${e?.message || String(e)}`);
  });

  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("folders.json должен быть массивом");
  }

  const folders = parsed
    .filter((x) => isObject(x))
    .map((x) => ({
      name: typeof x.name === "string" ? x.name : "",
      slug: typeof x.slug === "string" ? x.slug : "",
      description: typeof x.description === "string" ? x.description : "",
      preview: typeof x.preview === "string" ? x.preview : "",
      showInNavbar: Boolean(x.showInNavbar),
      _rest: Object.fromEntries(Object.entries(x).filter(([k]) => !["name", "slug", "description", "preview", "showInNavbar"].includes(k))),
    }));

  const targetSlug = "articles";

  const idxBySlug = folders.findIndex((f) => normalizeSlug(f.slug) === targetSlug);
  const idxByName = folders.findIndex((f) => String(f.name || "").trim().toLowerCase() === "статьи");
  const idx = idxBySlug >= 0 ? idxBySlug : idxByName;

  const nextRow = {
    name: "Статьи",
    slug: targetSlug,
    description: "",
    preview: "",
    showInNavbar: false,
  };

  if (idx >= 0) {
    const current = folders[idx];
    folders[idx] = {
      ...current,
      ...nextRow,
      // сохраняем любые дополнительные поля, если они были
      ...current._rest,
    };
  } else {
    folders.push(nextRow);
  }

  // Запись обратно в исходный формат (без _rest)
  const output = folders.map((f) => ({
    name: f.name,
    slug: normalizeSlug(f.slug),
    description: f.description || "",
    preview: f.preview || "",
    showInNavbar: Boolean(f.showInNavbar),
  }));

  await fs.writeFile(FOLDERS_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  // eslint-disable-next-line no-console
  console.log(`OK: папка "Статьи" (${targetSlug}) ${idx >= 0 ? "обновлена" : "создана"} в ${FOLDERS_PATH}`);
}

await main();

