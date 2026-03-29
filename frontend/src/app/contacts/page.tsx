import Link from "next/link";
import { apiBaseUrl } from "@/lib/apiBaseUrl";
import { ChevronRightIcon, HomeIcon } from "@heroicons/react/20/solid";
import { HomeReviewsCarousel } from "@/components/HomeReviewsCarousel";
import { HomePartnersCarousel } from "@/components/HomePartnersCarousel";
import {
  AtSymbolIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
} from "@heroicons/react/20/solid";

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
};

const SOCIAL_DEFS = [
  {
    key: "vk",
    label: "ВКонтакте",
    svg: (
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.392 0 15.684 0zm3.692 17.229h-1.743c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202C4.624 10.857 4 8.657 4 8.086c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.863 2.455 2.303 4.607 2.896 4.607.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.71 0-.203.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.135.813-.542 1.253-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.203.813-1.338 2.658-2.337 3.912-.186.237-.254.373 0 .678.186.237.797.779 1.016 1.253.305.678.508 1.186.186 1.27z" />
    ),
  },
  {
    key: "telegram",
    label: "Telegram",
    svg: (
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    ),
  },
  {
    key: "max",
    label: "Max",
    externalSvgSrc: "/max-logo-indigo.svg",
    svg: (
      <path d="M6 18V6h3l3 5 3-5h3v12h-2V9l-4 7-4-7v9H6z" />
    ),
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    svg: (
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    ),
  },
] as const;

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
  const base = apiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);
  let siteSettings: SiteSettings | null = null;
  try {
    const res = await fetch(`${base}/api/pages/site-settings`, {
      cache: "no-store",
      signal: controller.signal,
    });
    if (res.ok) {
      const data = (await res.json()) as { settings?: SiteSettings };
      if (data?.settings) siteSettings = data.settings;
    }
  } catch {
    siteSettings = null;
  } finally {
    clearTimeout(timeoutId);
  }

  const phone = (siteSettings?.phone || "").trim() || "+7 (495) 123-45-67";
  const phoneHref = (() => {
    const raw = (siteSettings?.phone || "").trim();
    const digits = raw.replace(/[^\d+]/g, "");
    return digits ? `tel:${digits}` : "tel:+74951234567";
  })();
  const email = (siteSettings?.email || "").trim() || "info@центр-каталогизации.рф";
  const address = (siteSettings?.address || "").trim() || "г. Москва, ул. Примерная, д. 15, офис 304";
  const workHours = "Пн-Пт: 09:00-18:00 (МСК)";
  const reqCompany =
    (siteSettings?.requisites?.companyName || "").trim() ||
    "ООО «Центр каталогизации и анализа данных»";
  const reqInn = (siteSettings?.requisites?.inn || "").trim() || "0000000000";
  const reqKpp = (siteSettings?.requisites?.kpp || "").trim() || "000000000";
  const reqOgrn = (siteSettings?.requisites?.ogrn || "").trim() || "0000000000000";
  const socials = SOCIAL_DEFS.map((d) => ({
    href: String(siteSettings?.social?.[d.key as keyof SiteSettings["social"]] ?? "").trim(),
    label: d.label,
    svg: d.svg,
    externalSvgSrc: "externalSvgSrc" in d ? d.externalSvgSrc : undefined,
  })).filter((s) => s.href);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-10">
        <section className="mx-auto w-full max-w-[1200px] px-6 pb-16 pt-2 text-[#496db3] sm:px-8 sm:pb-16 sm:pt-3">
          <nav
            aria-label="Хлебные крошки"
            className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-slate-500"
          >
            <Link
              href="/"
              className="inline-flex items-center rounded p-1 hover:bg-slate-200 hover:text-slate-700"
              aria-label="Главная"
            >
              <HomeIcon className="h-4 w-4" />
            </Link>
            <ChevronRightIcon className="h-4 w-4 text-slate-400" />
            <span className="rounded px-1 py-0.5 text-slate-700">Контакты</span>
          </nav>

          <div
            className="mb-4 flex items-center justify-center text-[13px] font-semibold tracking-tight"
            style={{ fontSize: "clamp(10px, 1.2vw, 16px)" }}
          >
            <h1
              className="text-center uppercase text-[#496db3]"
              style={{
                fontSize: "230%",
                lineHeight: 1.1,
                fontWeight: 950,
                textShadow:
                  "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor",
              }}
            >
              Контакты
            </h1>
          </div>

          <div className="contacts-grid">
            <div className="min-w-0">
              <article className="contacts-card rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-[#496db3] sm:p-5">
                <div className="thanks-inner">
                  <div className="thanks-inner__logo">
                    <img
                      src="/logo_1.svg"
                      alt="Логотип Центра каталогизации и анализа данных"
                      className="h-24 w-24 shrink-0 object-contain object-center md:h-28 md:w-28 lg:h-32 lg:w-32 [filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.08))]"
                      width={128}
                      height={128}
                    />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="font-semibold text-[#496db3]"
                      style={{ fontSize: "clamp(13px, 0.7vw, 14px)" }}
                    >
                      <span style={{ fontSize: "112%", lineHeight: 1.35 }}>
                        Спасибо за проявленный интерес. Мы ценим ваше внимание к Центру каталогизации и
                        анализа данных. Готовы ответить на вопросы, обсудить задачу и предложить
                        оптимальный формат сотрудничества.
                      </span>
                    </p>
                  </div>
                </div>
              </article>

              <article className="contacts-card mt-4 rounded-xl border border-slate-200/80 bg-slate-50 p-4 text-[#496db3] sm:p-5">
                <h2 className="text-lg font-black uppercase tracking-tight text-[#496db3]">Контакты</h2>
                <div className="mt-3 space-y-3.5">
                  <a
                    href={phoneHref}
                    className="contact-row group"
                  >
                    <PhoneIcon className="contact-row__icon" aria-hidden />
                    <span className="contact-emphasis group-hover:text-[#e53935]">
                      {phone}
                    </span>
                  </a>
                  <a
                    href={`mailto:${email}`}
                    className="contact-row group"
                  >
                    <AtSymbolIcon className="contact-row__icon" aria-hidden />
                    <span className="contact-emphasis min-w-0 break-all group-hover:text-[#e53935]">
                      {email}
                    </span>
                  </a>
                </div>

                <div className="mt-3.5 space-y-3.5">
                  <div className="contact-row">
                    <MapPinIcon className="contact-row__icon" aria-hidden />
                    <span className="contact-emphasis text-slate-700">{address}</span>
                  </div>
                  <div className="contact-row">
                    <ClockIcon className="contact-row__icon" aria-hidden />
                    <span className="contact-emphasis text-slate-600">{workHours}</span>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-black uppercase tracking-tight text-[#496db3]">
                      Социальные сети и мессенджеры
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2.5">
                    {socials.map((social) => (
                      <a
                        key={social.label}
                        href={social.href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={social.label}
                        title={social.label}
                        className="inline-flex h-10 w-10 items-center justify-center text-[#496db3] transition hover:text-[#e53935]"
                      >
                        {"externalSvgSrc" in social && social.externalSvgSrc ? (
                          <img
                            src={social.externalSvgSrc}
                            alt=""
                            aria-hidden
                            className="h-7 w-7 object-contain"
                          />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-7 w-7">
                            {social.svg}
                          </svg>
                        )}
                      </a>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-lg font-black uppercase tracking-tight text-[#496db3]">Реквизиты</p>
                  <div className="mt-2 space-y-1.5">
                    <p className="contact-emphasis">{reqCompany}</p>
                    <p className="contact-emphasis">ИНН: {reqInn}</p>
                    <p className="contact-emphasis">КПП: {reqKpp}</p>
                    <p className="contact-emphasis">ОГРН: {reqOgrn}</p>
                  </div>
                </div>
              </article>
            </div>

            <div className="min-w-0 h-full">
              <article className="contacts-card flex h-full min-h-[560px] flex-col rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-[#496db3] sm:p-4">
                <p className="mb-3 text-sm font-semibold text-[#496db3]">Мы на Яндекс.Картах</p>
                <div className="contacts-map-frame min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200/80 bg-white">
                  <iframe
                    title="Карта офиса на Яндекс.Картах"
                    src="https://yandex.ru/map-widget/v1/?ll=37.617644%2C55.755819&z=11"
                    width="100%"
                    loading="lazy"
                    className="block h-full w-full"
                  />
                </div>
              </article>
            </div>
          </div>

          <style>{`
            .contacts-grid {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              gap: 1.5rem;
            }
            @media (min-width: 1024px) {
              .contacts-grid {
                grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
              }
            }
            .contacts-card {
              box-shadow:
                0 6px 24px rgba(73, 109, 179, 0.18),
                0 0 32px rgba(73, 109, 179, 0.14),
                0 0 64px rgba(73, 109, 179, 0.09);
            }
            .thanks-inner {
              display: grid;
              grid-template-columns: minmax(0, 1fr);
              gap: 1rem;
              align-items: center;
            }
            .thanks-inner__logo {
              display: flex;
              justify-content: center;
            }
            .contact-row {
              display: flex;
              align-items: flex-start;
              gap: 0.65rem;
              min-width: 0;
              color: #496db3;
            }
            .contact-row__icon {
              width: 1.2rem;
              height: 1.2rem;
              flex-shrink: 0;
              margin-top: 0.1rem;
              color: rgba(73, 109, 179, 0.78);
            }
            .contact-emphasis {
              font-size: clamp(15px, 1.1vw, 18px);
              font-weight: 800;
              line-height: 1.3;
              color: #496db3;
              transition: color 0.15s ease;
            }
            .contact-row:hover .contact-emphasis {
              color: #e53935;
            }
            .contacts-map-frame {
              min-height: 420px;
            }
            @media (min-width: 768px) {
              .thanks-inner {
                grid-template-columns: auto minmax(0, 1fr);
                gap: 1.25rem;
              }
              .thanks-inner__logo {
                justify-content: flex-start;
              }
            }
          `}</style>
        </section>

        <div className="mx-auto w-full max-w-[1200px] px-6 pb-8 sm:px-8">
          <div style={{ paddingTop: "1rem" }}>
            <HomeReviewsCarousel slides={[]} />
          </div>
          <div style={{ paddingTop: "1rem" }}>
            <HomePartnersCarousel slides={[]} />
          </div>
        </div>
      </div>
    </div>
  );
}

