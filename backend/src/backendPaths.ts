import fs from "node:fs";
import path from "node:path";

/**
 * Каталог пакета backend (где лежит package.json).
 * Не используем process.cwd(): в systemd часто задают WorkingDirectory на корень репозитория,
 * тогда path.resolve(process.cwd(), "data", …) указывает не на backend/data.
 */
export function backendRootDir(): string {
  const here = __dirname;
  const oneUp = path.resolve(here, "..");
  if (fs.existsSync(path.join(oneUp, "package.json"))) {
    return oneUp;
  }
  const twoUp = path.resolve(here, "..", "..");
  if (fs.existsSync(path.join(twoUp, "package.json"))) {
    return twoUp;
  }
  return twoUp;
}

export function backendDataPath(...segments: string[]): string {
  return path.join(backendRootDir(), "data", ...segments);
}
