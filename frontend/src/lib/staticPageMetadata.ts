import type { Metadata } from "next";
import { buildSocialSharingFields } from "@/lib/hubFolderMetadata";

export async function buildStaticPageMetadata(input: {
  title: string;
  description: string;
  pathname: string;
}): Promise<Metadata> {
  const social = await buildSocialSharingFields({
    title: input.title,
    description: input.description,
    pathname: input.pathname,
  });

  return {
    title: input.title,
    description: input.description,
    ...social,
  };
}
