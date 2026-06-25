import type { ResolvedContactFields } from "@/lib/siteSettingsPublic";
import { buildMailtoHref } from "@/lib/yandexMetrikaAutoGoals";

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
    externalSvgSrc: "/telegram-logo-indigo.svg",
    svg: (
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    ),
  },
  {
    key: "max",
    label: "Max",
    externalSvgSrc: "/max-logo-indigo.svg",
    svg: <path d="M6 18V6h3l3 5 3-5h3v12h-2V9l-4 7-4-7v9H6z" />,
  },
  {
    key: "whatsapp",
    label: "WhatsApp",
    svg: (
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    ),
  },
] as const;

type SiteContactsSectionProps = {
  contacts: ResolvedContactFields;
  className?: string;
};

export function SiteContactsSection({ contacts, className = "" }: SiteContactsSectionProps) {
  const {
    phone,
    phoneHref,
    email,
    address,
    reqCompany,
    reqInn,
    reqKpp,
    reqOgrn,
    director,
    social,
  } = contacts;

  const socials = SOCIAL_DEFS.map((item) => ({
    label: item.label,
    href: String(social[item.key as keyof typeof social] ?? "").trim(),
    svg: item.svg,
    externalSvgSrc: "externalSvgSrc" in item ? item.externalSvgSrc : undefined,
  })).filter((item) => item.href);

  return (
    <section className={`about-contact-section ${className}`.trim()}>
      <div className="home-section-intro">
        <h2 className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-base font-semibold text-[#b91c1c]">
          Контакты
        </h2>
        <p className="about-template-fallback__title -mt-1.5 mt-0 text-balance sm:-mt-2">
          Связь с центром и реквизиты организации
        </p>
      </div>
      <div className="mx-auto max-w-7xl home-section-inline-padding">
        <div className="mt-8 grid grid-cols-1 gap-10 sm:mt-10 lg:mt-12 lg:grid-cols-2 lg:gap-8">
          <div className="flex min-w-0 flex-col gap-8">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
              <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-[180px_1fr] sm:gap-5">
                <div className="mx-auto w-full max-w-[180px] sm:mx-0">
                  <img
                    src={
                      director.photo ||
                      "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?auto=format&fit=facearea&facepad=8&w=900&h=1125&q=80"
                    }
                    alt={director.name}
                    className="aspect-[4/5] w-full rounded-xl object-cover"
                  />
                </div>
                <div className="about-contact-copy min-w-0">
                  <p className="text-base font-semibold tracking-tight text-slate-900">{director.name}</p>
                  <p className="about-value-card__text mt-0.5 text-base leading-[1.5] text-slate-600">
                    {director.role}
                  </p>
                  <blockquote className="about-value-card__text mt-3 text-base italic leading-[1.5] text-slate-700">
                    {director.message}
                  </blockquote>
                </div>
              </div>
            </div>
            <div className="about-contact-copy pl-4 text-slate-700 sm:pl-5">
              <h2 className="text-lg font-semibold text-slate-900">Реквизиты</h2>
              <div className="mt-4 space-y-2 text-base leading-[1.4]">
                <p className="about-value-card__text lg:whitespace-nowrap">{reqCompany}</p>
                <p className="about-value-card__text">
                  ИНН: {reqInn} · ОГРН: {reqOgrn} · КПП: {reqKpp}
                </p>
                <p className="about-value-card__text">Адрес: {address}</p>
                <p className="about-value-card__text">
                  Телефон:{" "}
                  <a
                    href={phoneHref}
                    className="font-extrabold text-[#496db3] transition-colors hover:text-red-600"
                  >
                    {phone}
                  </a>
                </p>
                <p className="about-value-card__text">
                  Эл. почта:{" "}
                  <a
                    href={buildMailtoHref(email)}
                    className="break-all font-extrabold text-[#496db3] transition-colors hover:text-red-600"
                  >
                    {email}
                  </a>
                </p>
                {socials.length > 0 ? (
                  <div className="about-value-card__text flex flex-wrap items-center gap-x-2 gap-y-2">
                    <span className="shrink-0">Соц. сети:</span>
                    <ul className="flex flex-wrap items-center gap-3">
                      {socials.map((item) => (
                        <li key={item.label}>
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={item.label}
                            title={item.label}
                            className="inline-flex h-10 w-10 items-center justify-center text-[#496db3] transition-colors hover:text-[#e53935]"
                          >
                            {item.externalSvgSrc ? (
                              <img
                                src={item.externalSvgSrc}
                                alt=""
                                aria-hidden
                                className="h-6 w-6 shrink-0 object-contain"
                              />
                            ) : (
                              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-6 w-6 shrink-0">
                                {item.svg}
                              </svg>
                            )}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          <div className="min-h-[min(400px,70vh)] overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm lg:min-h-0 lg:h-full">
            <iframe
              title="Карта — расположение центра на Яндекс.Картах"
              src="https://yandex.ru/map-widget/v1/?z=12&ol=biz&oid=84932512558"
              width={560}
              height={400}
              className="block h-full min-h-[min(400px,70vh)] w-full border-0 lg:min-h-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
