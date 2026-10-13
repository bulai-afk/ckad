import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";
import { cookies } from "next/headers";
import { PreventHorizontalPageScroll } from "@/components/PreventHorizontalPageScroll";
import { SiteFooter } from "@/components/SiteFooter";
import { GlobalFeedbackForm } from "@/components/GlobalFeedbackForm";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteMainColumn } from "@/components/SiteMainColumn";
import { LayoutClientEnhancements } from "@/components/LayoutClientEnhancements";
import { OrganizationJsonLd } from "@/components/OrganizationJsonLd";
import { NAV_FOLDERS_COOKIE_NAME, parseNavFoldersCookie } from "@/lib/navFoldersCookie";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import {
  buildRootSectionLabelMap,
  DEFAULT_ROOT_SECTION_LABELS,
} from "@/lib/rootSectionLabels";
import { DEFAULT_OG_IMAGE_PATH, PUBLIC_SITE_NAME } from "@/lib/hubFolderMetadata";
import { PUBLIC_SITE_ORIGIN } from "@/lib/publicSiteConstants";
import { slimLayoutSiteSettings, type LayoutSiteSettings } from "@/lib/siteSettingsPublic";
import "./globals.css";

const metadataBaseUrl = PUBLIC_SITE_ORIGIN;

export const revalidate = 120;

const exo2 = Exo_2({
  /* Без кириллицы весь русский текст сначала идёт из fallback, потом «подскакивает» при подгрузке Exo 2. */
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "fallback",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(metadataBaseUrl),
  title: "ЦКиАД",
  description: PUBLIC_SITE_NAME,
  openGraph: {
    type: "website",
    siteName: PUBLIC_SITE_NAME,
    locale: "ru_RU",
    images: [{ url: DEFAULT_OG_IMAGE_PATH, alt: PUBLIC_SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    images: [DEFAULT_OG_IMAGE_PATH],
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=logo", sizes: "any" },
      { url: "/favicon.png?v=logo", type: "image/png" },
    ],
  },
};

type SiteSettings = LayoutSiteSettings;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialFolderNavItems = parseNavFoldersCookie(
    cookieStore.get(NAV_FOLDERS_COOKIE_NAME)?.value,
  );

  let initialRootSectionLabels: Record<string, string> = { ...DEFAULT_ROOT_SECTION_LABELS };
  let siteSettings: SiteSettings | null = null;
  const base = apiBaseUrl();
  try {
    const fetchJson = async <T,>(
      path: string,
      timeoutMs: number,
      useDataCache = true,
    ): Promise<T> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(
          `${base}${path}`,
          useDataCache
            ? { cache: "force-cache", next: { revalidate: 120 }, signal: controller.signal }
            : { cache: "no-store", signal: controller.signal },
        );
        if (!res.ok) throw new Error(`GET ${path} failed with ${res.status}`);
        return (await res.json()) as T;
      } finally {
        clearTimeout(timeoutId);
      }
    };
    const [settingsRes, foldersRes] = await Promise.allSettled([
      fetchJson<{ settings?: unknown }>("/api/pages/site-settings", 10_000, true),
      fetchJson<{ folders?: { slug: string; name?: string }[] }>("/api/pages/folders", 10_000, true),
    ]);
    if (settingsRes.status === "fulfilled" && settingsRes.value?.settings) {
      siteSettings = slimLayoutSiteSettings(settingsRes.value.settings);
    }
    if (foldersRes.status === "fulfilled" && Array.isArray(foldersRes.value?.folders)) {
      initialRootSectionLabels = buildRootSectionLabelMap(foldersRes.value.folders);
    }
  } catch {
    siteSettings = null;
  }

  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${exo2.className} flex min-h-screen flex-col antialiased`}
        style={{ backgroundColor: "#f3f4f6", color: "#020617" }}
      >
        <OrganizationJsonLd siteSettings={siteSettings} />
        <PreventHorizontalPageScroll />
        <LayoutClientEnhancements />
        <SiteNavbar
          initialFolderNavItems={initialFolderNavItems}
          initialRootSectionLabels={initialRootSectionLabels}
          siteSettings={siteSettings}
          initialPages={[]}
          initialOrderBySection={{}}
        />
        {/* overflow-x-hidden здесь, не на body — иначе sticky-шапка не прилипает к viewport (clip в старых WebKit давал артефакты). */}
        <SiteMainColumn>
          <div
            id="main-content"
            role="main"
            className="flex w-full min-h-0 flex-col"
          >
            {children}
          </div>
          <GlobalFeedbackForm />
          <SiteFooter
            siteSettings={siteSettings}
            initialPages={[]}
            initialOrderBySection={{}}
          />
        </SiteMainColumn>
      </body>
    </html>
  );
}
