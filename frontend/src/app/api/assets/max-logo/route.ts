import { promises as fs } from "node:fs";

const MAX_LOGO_PATH = "/Users/bulai-afk/Downloads/max-messenger-sign-logo.svg";

export async function GET() {
  try {
    const svg = await fs.readFile(MAX_LOGO_PATH, "utf-8");
    return new Response(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

