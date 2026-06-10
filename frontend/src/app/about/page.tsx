import type { Metadata } from "next";
import {
  ClipboardDocumentCheckIcon,
  HeartIcon,
  LightBulbIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { HomeReviewsCarousel } from "@/components/HomeReviewsCarousel";
import { SiteContactsSection } from "@/components/SiteContactsSection";
import { fetchPublicSiteSettings, resolveContactFields } from "@/lib/siteSettingsPublic";
import { buildStaticPageMetadata } from "@/lib/staticPageMetadata";

const ABOUT_TITLE = "Центр каталогизации и анализа данных — О нас";
const ABOUT_DESCRIPTION =
  "Команда с практикой в ГОЗ, ФКП и отраслевых стандартах. Расскажем о подходе и подберём формат работы. Напишите или закажите звонок — ответим в рабочий день.";

export async function generateMetadata(): Promise<Metadata> {
  return buildStaticPageMetadata({
    title: ABOUT_TITLE,
    description: ABOUT_DESCRIPTION,
    pathname: "/about",
  });
}

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

export default async function AboutPage() {
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
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 -z-10 transform-gpu blur-3xl">
            <div
              className="hero-police-blob relative left-1/2 aspect-[1155/678] w-[36rem] -translate-x-1/2 rotate-[20deg] bg-gradient-to-tr from-[#496db3] via-[#5f7ebe] to-[#8aa9db] sm:w-[72rem]"
              style={{
                clipPath:
                  "polygon(74.1% 44.1%,100% 61.6%,97.5% 26.9%,85.5% 0.1%,80.7% 2%,72.5% 32.5%,60.2% 62.4%,52.4% 68.1%,47.5% 58.3%,45.2% 34.5%,27.5% 76.7%,0.1% 64.9%,17.9% 100%,27.6% 76.8%,76.1% 97.7%,74.1% 44.1%)",
              }}
            />
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-24 -z-10 transform-gpu blur-3xl">
            <div
              className="hero-police-blob hero-police-blob--alt relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36rem] -translate-x-1/2 bg-gradient-to-tr from-[#b91c1c] via-[#dc2626] to-[#f87171] sm:left-[calc(50%+24rem)] sm:w-[72rem]"
              style={{
                clipPath:
                  "polygon(74.1% 44.1%,100% 61.6%,97.5% 26.9%,85.5% 0.1%,80.7% 2%,72.5% 32.5%,60.2% 62.4%,52.4% 68.1%,47.5% 58.3%,45.2% 34.5%,27.5% 76.7%,0.1% 64.9%,17.9% 100%,27.6% 76.8%,76.1% 97.7%,74.1% 44.1%)",
              }}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[rgba(248,250,252,0.32)] backdrop-blur-[1px]" />

          <div className="home-section-intro py-8 sm:py-10">
            <h1 className="about-template-fallback__title text-balance sm:-mt-2">
              Мы создаем решения, которые работают в реальных процессах
            </h1>
            <p className="home-section-intro__lead">
              Центр каталогизации и анализа данных помогает компаниям выстроить прозрачную работу с
              информацией, ускорить согласования и снизить операционные риски.
            </p>
          </div>
      </section>

      <section className="bg-transparent py-8 sm:py-10 about-template-fallback">
        <div className="home-section-intro">
          <h2 className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-base font-semibold text-[#b91c1c]">
            Наши ценности
          </h2>
          <p className="about-template-fallback__title -mt-1.5 mt-0 text-balance sm:-mt-2">
            Принципы, на которых строится работа
          </p>
        </div>
        <div className="mx-auto max-w-7xl home-section-inline-padding">
          <ul className="mt-8 grid grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3 lg:mt-12">
            {values.map((item) => (
              <li
                key={item.title}
                className="flex min-h-full items-start gap-3 rounded-[10px] border border-slate-200 bg-white p-[0.9rem]"
              >
                <div className="flex h-[1.8rem] w-[1.8rem] shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[#496db3]">
                  <item.icon aria-hidden="true" className="h-[1.12rem] w-[1.12rem] shrink-0" />
                </div>
                <div className="min-w-0">
                  <h3 className="about-value-card__title text-base font-semibold leading-[1.4] text-slate-900">
                    {item.title}
                  </h3>
                  <p className="about-value-card__text mt-1 text-base leading-[1.5] text-slate-600">
                    {item.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SiteContactsSection contacts={contacts} className="mt-12 sm:mt-16" />

      <section className="mt-12 [&_.about-template-fallback]:py-2 sm:[&_.about-template-fallback]:py-3">
        <HomeReviewsCarousel slides={[]} />
      </section>
    </main>
  );
}
