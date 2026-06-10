import type { Metadata } from "next";
import { SiteContactsSection } from "@/components/SiteContactsSection";
import { fetchPublicSiteSettings, resolveContactFields } from "@/lib/siteSettingsPublic";
import { buildStaticPageMetadata } from "@/lib/staticPageMetadata";

const CONTACTS_TITLE = "Контакты";
const CONTACTS_DESCRIPTION =
  "Связь с центром каталогизации и анализа данных: телефон, электронная почта, адрес и реквизиты организации.";

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticPageMetadata({
    title: CONTACTS_TITLE,
    description: CONTACTS_DESCRIPTION,
    pathname: "/contacts",
  });
}

export default async function ContactsPage() {
  const siteSettings = await fetchPublicSiteSettings();
  const contacts = resolveContactFields(siteSettings);

  return (
    <main className="about-page relative isolate overflow-hidden bg-slate-100 pb-8 sm:pb-10" lang="ru">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div
          className="relative left-1/2 aspect-[1155/678] w-[72rem] -translate-x-1/2 rotate-[18deg] bg-gradient-to-tr from-[#496db3] via-[#5f7ebe] to-[#8aa9db] opacity-30"
          style={{
            clipPath:
              "polygon(73.6% 51.7%,91.7% 11.8%,100% 46.4%,97.4% 82.2%,92.5% 84.9%,75.7% 64%,55.3% 47.5%,46.5% 49.4%,45% 62.9%,50.3% 87.2%,21.3% 64.1%,0.1% 100%,5.4% 51.1%,21.4% 63.9%,58.9% 0.2%,73.6% 51.7%)",
          }}
        />
      </div>

      <section className="relative isolate left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-slate-100">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[rgba(248,250,252,0.32)] backdrop-blur-[1px]" />
        <div className="home-section-intro py-8 sm:py-10">
          <h1 className="about-template-fallback__title text-balance sm:-mt-2">Контакты</h1>
          <p className="home-section-intro__lead">
            Телефон, электронная почта, адрес офиса и реквизиты организации.
          </p>
        </div>
      </section>

      <SiteContactsSection contacts={contacts} className="mt-4 sm:mt-6" />
    </main>
  );
}
