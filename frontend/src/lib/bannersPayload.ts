import type { CoverAspectPresetId } from "@/lib/bannerCoverPresets";

export type BannersApiPayload = {
  coverAspect?: CoverAspectPresetId;
  slides?: unknown[];
};

export function parseBannersCoverAspect(raw: unknown): CoverAspectPresetId {
  if (raw === "1-4" || raw === "6-1") return raw;
  return "1-8";
}

/** Ответ API: `{ coverAspect, slides }` или legacy-массив слайдов. */
export function parseBannersApiPayload(data: unknown): {
  coverAspect: CoverAspectPresetId;
  slides: unknown[];
} {
  if (Array.isArray(data)) {
    return { coverAspect: "1-8", slides: data };
  }
  if (!data || typeof data !== "object") {
    return { coverAspect: "1-8", slides: [] };
  }
  const row = data as BannersApiPayload;
  const slides = Array.isArray(row.slides) ? row.slides : [];
  return { coverAspect: parseBannersCoverAspect(row.coverAspect), slides };
}
