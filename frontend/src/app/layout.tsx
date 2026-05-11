import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";
import { cookies } from "next/headers";
import { PreventHorizontalPageScroll } from "@/components/PreventHorizontalPageScroll";
import { SiteFooter } from "@/components/SiteFooter";
import { GlobalFeedbackForm } from "@/components/GlobalFeedbackForm";
import { SiteNavbar } from "@/components/SiteNavbar";
import { SiteMainColumn } from "@/components/SiteMainColumn";
import { LayoutClientEnhancements } from "@/components/LayoutClientEnhancements";
import { NAV_FOLDERS_COOKIE_NAME, parseNavFoldersCookie } from "@/lib/navFoldersCookie";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import "./globals.css";

export const revalidate = 120;

const exo2 = Exo_2({
  /* Без кириллицы весь русский текст сначала идёт из fallback, потом «подскакивает» при подгрузке Exo 2. */
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "fallback",
  adjustFontFallback: true,
});

export const metadata: Metadata = {
  title: "ЦКиАД",
  description: "Центр каталогизации и анализа данных",
  icons: {
    icon: [
      { url: "/favicon.ico?v=logo", sizes: "any" },
      { url: "/favicon.png?v=logo", type: "image/png" },
    ],
  },
};

type SiteSettings = {
  email: string;
  phone: string;
  address: string;
  social: {
    vk: string;
    telegram: string;
    max: string;
    whatsapp: string;
  };
  requisites: {
    companyName: string;
    inn: string;
    kpp: string;
    ogrn: string;
  };
  documents?: {
    name: string;
    size: number;
    dataUrl: string;
  }[];
  topRibbonMessages?: string[];
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialFolderNavItems = parseNavFoldersCookie(
    cookieStore.get(NAV_FOLDERS_COOKIE_NAME)?.value,
  );

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
    const [settingsRes] = await Promise.allSettled([
      fetchJson<{ settings?: SiteSettings }>("/api/pages/site-settings", 10_000, true),
    ]);
    if (settingsRes.status === "fulfilled" && settingsRes.value?.settings) {
      // Убираем тяжёлые dataUrl документов из критического SSR payload.
      siteSettings = { ...settingsRes.value.settings, documents: [] };
    }
  } catch {
    siteSettings = null;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${exo2.className} flex min-h-screen flex-col antialiased`}
        style={{ backgroundColor: "#f3f4f6", color: "#020617" }}
      >
        <PreventHorizontalPageScroll />
        <LayoutClientEnhancements />
        <SiteNavbar
          initialFolderNavItems={initialFolderNavItems}
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
