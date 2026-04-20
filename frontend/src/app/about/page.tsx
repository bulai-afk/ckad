import {
  ClipboardDocumentCheckIcon,
  HeartIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { HomeReviewsCarousel } from "@/components/HomeReviewsCarousel";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

const values = [
  {
    title: "Работа на высоком уровне",
    text: "Выстраиваем процессы так, чтобы качество результата соответствовало сложным отраслевым требованиям.",
    icon: ShieldCheckIcon,
  },
  {
    title: "Ответственность за результат",
    text: "Берем ответственность на каждом этапе: от подготовки данных до финального согласования.",
    icon: ClipboardDocumentCheckIcon,
  },
  {
    title: "Поддержка и партнерство",
    text: "Работаем как часть команды заказчика и помогаем принимать решения на основе данных.",
    icon: UserGroupIcon,
  },
  {
    title: "Непрерывное развитие",
    text: "Постоянно обновляем подходы, инструменты и экспертизу команды.",
    icon: RocketLaunchIcon,
  },
  {
    title: "Открытый обмен опытом",
    text: "Делимся практикой, шаблонами и знаниями, чтобы ускорять запуск и снижать риски.",
    icon: LightBulbIcon,
  },
  {
    title: "Здоровый ритм работы",
    text: "Сохраняем баланс между скоростью выполнения задач и устойчивым качеством.",
    icon: HeartIcon,
  },
];

const DEFAULT_DIRECTOR = {
  name: "Руководитель ЦКиАД",
  role: "Директор",
  message:
    "Мы строим решения, которые можно применять в ежедневной работе. Благодарю вас за доверие и интерес к нашим проектам.",
  photo: null as string | null,
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
  director?: {
    name: string;
    role: string;
    message: string;
    photo: string | null;
  };
  teamMembers?: {
    name: string;
    role: string;
    photo: string | null;
  }[];
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

export default async function AboutPage() {
  const base = apiBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
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
  const reqCompany =
    (siteSettings?.requisites?.companyName || "").trim() ||
    "ООО «Центр каталогизации и анализа данных»";
  const reqInn = (siteSettings?.requisites?.inn || "").trim() || "0000000000";
  const reqKpp = (siteSettings?.requisites?.kpp || "").trim() || "000000000";
  const reqOgrn = (siteSettings?.requisites?.ogrn || "").trim() || "0000000000000";
  const socials = SOCIAL_DEFS.map((item) => ({
      label: item.label,
      href: String(siteSettings?.social?.[item.key as keyof SiteSettings["social"]] ?? "").trim(),
      svg: item.svg,
      externalSvgSrc: "externalSvgSrc" in item ? item.externalSvgSrc : undefined,
    }))
    .filter((item) => item.href);
  const legacyTeamMembers = Array.isArray(siteSettings?.teamMembers)
    ? siteSettings.teamMembers
        .filter((item): item is { name: string; role: string; photo: string | null } => {
          return (
            !!item &&
            typeof item.name === "string" &&
            typeof item.role === "string" &&
            (typeof item.photo === "string" || item.photo === null)
          );
        })
        .map((item) => ({
          name: item.name.trim(),
          role: item.role.trim(),
          photo: typeof item.photo === "string" && item.photo.trim() ? item.photo : null,
        }))
        .filter((item) => item.name || item.role)
    : [];
  const director = (() => {
    const raw = siteSettings?.director;
    if (
      raw &&
      typeof raw.name === "string" &&
      typeof raw.role === "string" &&
      typeof raw.message === "string" &&
      (typeof raw.photo === "string" || raw.photo === null)
    ) {
      const name = raw.name.trim();
      const role = raw.role.trim();
      const message = raw.message.trim();
      const photo = typeof raw.photo === "string" && raw.photo.trim() ? raw.photo : null;
      if (name || role || message || photo) {
        return {
          name: name || DEFAULT_DIRECTOR.name,
          role: role || DEFAULT_DIRECTOR.role,
          message: message || DEFAULT_DIRECTOR.message,
          photo,
        };
      }
    }

    const legacy = legacyTeamMembers[0];
    if (legacy) {
      return {
        name: legacy.name || DEFAULT_DIRECTOR.name,
        role: legacy.role || DEFAULT_DIRECTOR.role,
        message: DEFAULT_DIRECTOR.message,
        photo: legacy.photo,
      };
    }
    return DEFAULT_DIRECTOR;
  })();

  return (
    <main className="relative isolate overflow-hidden bg-slate-100 pt-16 pb-8 sm:pt-24 sm:pb-10">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl">
        <div
          className="relative left-1/2 aspect-[1155/678] w-[72rem] -translate-x-1/2 rotate-[18deg] bg-gradient-to-tr from-[#496db3] via-[#5f7ebe] to-[#8aa9db] opacity-30"
          style={{
            clipPath:
              "polygon(73.6% 51.7%,91.7% 11.8%,100% 46.4%,97.4% 82.2%,92.5% 84.9%,75.7% 64%,55.3% 47.5%,46.5% 49.4%,45% 62.9%,50.3% 87.2%,21.3% 64.1%,0.1% 100%,5.4% 51.1%,21.4% 63.9%,58.9% 0.2%,73.6% 51.7%)",
          }}
        />
      </div>

      <section className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-[#496db3] sm:text-6xl">
            Мы создаем решения, которые работают в реальных процессах
          </h1>
          <p className="mt-6 text-lg leading-8 text-slate-600">
            Центр каталогизации и анализа данных помогает компаниям выстроить прозрачную работу с
            информацией, ускорить согласования и снизить операционные риски.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-6 lg:px-8">
        <div className="flex justify-center">
          <img src="/logo.svg" alt="Логотип ЦКиАД" className="h-16 w-auto max-w-full object-contain sm:h-20" />
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <h2 className="text-base font-semibold text-[#b91c1c]">Наши ценности</h2>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#496db3] sm:text-4xl">
            Принципы, на которых строится работа
          </p>
          <dl className="mt-12 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {values.map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#496db3]/12">
                  <item.icon aria-hidden="true" className="h-6 w-6 shrink-0 text-[#496db3]" />
                </div>
                <div className="min-w-0">
                  <dt className="text-lg font-semibold text-slate-900">{item.title}</dt>
                  <dd className="mt-1 text-sm leading-7 text-slate-600">{item.text}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-6 lg:px-8">
        <div className="px-6 py-8 sm:px-10 sm:py-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr] lg:items-center">
            <div className="mx-auto w-full max-w-[220px] lg:mx-0">
              <img
                src={
                  director.photo ||
                  "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?auto=format&fit=facearea&facepad=8&w=900&h=1125&q=80"
                }
                alt={director.name}
                className="aspect-[4/5] w-full rounded-2xl object-cover"
              />
              <p className="mt-4 text-lg font-semibold tracking-tight text-slate-900">{director.name}</p>
              <p className="mt-1 text-sm text-slate-600">{director.role}</p>
            </div>
            <blockquote className="text-base italic leading-8 text-slate-700 sm:text-lg">
              {director.message}
            </blockquote>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-white px-6 py-10 sm:px-10 sm:py-14 lg:px-14">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
            <div className="h-72 overflow-hidden rounded-2xl border border-slate-200/80 bg-white lg:h-80">
              <iframe
                title="Карта офиса на Яндекс.Картах"
                src="https://yandex.ru/map-widget/v1/?ll=37.617644%2C55.755819&z=11"
                width="100%"
                loading="lazy"
                className="block h-full w-full"
              />
            </div>
            <div className="text-slate-700">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Контакты</h2>
                  <div className="mt-4 space-y-2 text-sm sm:text-base">
                    <a
                      href={phoneHref}
                      className="block text-base/6 font-extrabold text-[#496db3] transition-colors hover:text-red-600"
                    >
                      {phone}
                    </a>
                    <a
                      href={`mailto:${email}`}
                      className="block break-all text-base/6 font-extrabold text-[#496db3] transition-colors hover:text-red-600"
                    >
                      {email}
                    </a>
                    <p>{address}</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 sm:mt-1">Социальные сети</h3>
                  <ul className="mt-2 flex flex-wrap items-center gap-4 text-sm sm:text-base">
                    {socials.length > 0 ? (
                      socials.map((social) => (
                        <li key={social.label}>
                          <a
                            href={social.href}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={social.label}
                            title={social.label}
                            className="inline-flex h-10 w-10 items-center justify-center hover:text-[#e53935]"
                          >
                            {social.externalSvgSrc ? (
                              <img
                                src={social.externalSvgSrc}
                                alt=""
                                aria-hidden
                                className="h-6 w-6 shrink-0 object-contain"
                              />
                            ) : (
                              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-6 w-6 shrink-0">
                                {social.svg}
                              </svg>
                            )}
                          </a>
                        </li>
                      ))
                    ) : (
                      <li className="text-slate-500">Ссылки на соцсети не указаны.</li>
                    )}
                  </ul>
                </div>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-slate-900">Реквизиты</h3>
              <div className="mt-2 space-y-1 text-sm sm:text-base">
                <p>{reqCompany}</p>
                <p>ИНН: {reqInn}</p>
                <p>КПП: {reqKpp}</p>
                <p>ОГРН: {reqOgrn}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12 [&_.about-template-fallback]:py-2 sm:[&_.about-template-fallback]:py-3">
        <HomeReviewsCarousel slides={[]} />
      </section>
    </main>
  );
}
