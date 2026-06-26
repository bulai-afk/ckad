import type { Metadata } from "next";
import { buildSocialSharingFields } from "@/lib/hubFolderMetadata";

export async function buildStaticPageMetadata(input: {
  title: string;
  description: string;
  pathname: string;
  keywords?: string;
}): Promise<Metadata> {
  const keywords = input.keywords?.trim() || undefined;
  const social = await buildSocialSharingFields({
    title: input.title,
    description: input.description,
    pathname: input.pathname,
  });

  return {
    title: input.title,
    description: input.description,
    keywords,
    ...social,
  };
}
