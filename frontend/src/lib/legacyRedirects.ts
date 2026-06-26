import type { Redirect } from "next/dist/lib/load-custom-routes";

const CATALOGIZATION = "/catalogization";

/**
 * 301 с путей старого сайта (индекс Яндекс.Вебмастера, июнь 2026).
 * Пункты без аналога (oblasti-primeneniya-fkps, popd.pdf) намеренно не включены.
 */
const LEGACY_REDIRECTS: Redirect[] = [
  { source: "/o-kompanii", destination: "/about", permanent: true },
  { source: "/kontakty", destination: "/contacts", permanent: true },
  { source: "/zadat-vopros", destination: "/contacts", permanent: true },
  { source: "/uslugi", destination: CATALOGIZATION, permanent: true },

  {
    source: "/uslugi/organizaciya-obucheniya-v-oblasti-katalogizacii-produkcii-i-po-drugim-napravleniyam-v-sfere-goz",
    destination: "/training-center",
    permanent: true,
  },
  {
    source: "/uslugi/katalogizaciya-predmetov-snabzheniya",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/vypolnenie-funkcij-centra-katalogizacii-gosudarstvennogo-zakazchika-i-centra-katalogizacii-po-zakreplennoj-gruppe-odnorodnoj-produkcii",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/nauchno-issledovatelskaya-deyatelnost-v-oblasti-katalogizacii-produkcii-mnogokriterialnogo-sopostavitelnogo-analiza-i-podderzhki-prinyatiya-reshenij",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/provedenie-rabot-po-sistematizacii-i-avtomatizacii-informacii-dlya-golovnyh-ispolnitelej-gosudarstvennogo-oboronnogo-zakaza",
    destination: CATALOGIZATION,
    permanent: true,
  },

  {
    source: "/articles/zachem-nuzhna-katalogizaciya",
    destination: "/articles/zachem-nuzhna-katalogizatsiya-produktsii-i-chto-eto-takoe",
    permanent: true,
  },
  {
    source: "/articles/katalog-kak-osnova-formirovaniya-gpv-i-gp-opk",
    destination: "/articles/ka-atalog-kak-uzel-programm",
    permanent: true,
  },
  {
    source: "/articles/mezhgosudarstvennyj-katalog-ps-vs-gosudarstv-chlenov-odkb",
    destination: "/articles/katalog-odkb",
    permanent: true,
  },
  {
    source: "/articles/katalogizaciya-kak-instrument-standartizacii-i-unifikacii",
    destination: "/articles/unifikatsiya",
    permanent: true,
  },

  {
    source:
      "/uslugi/katalogizaciya-predmetov-snabzheniya/razrabotka-specialnyh-formatov-dlya-razmeshheniya-svedenij-o-produkcii-v-fkp",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/katalogizaciya-predmetov-snabzheniya/razrabotka-proekta-nomenklaturnogo-perechnya-predmetov-snabzheniya",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/katalogizaciya-predmetov-snabzheniya/razrabotka-razdelov-po-katalogizacii-v-nauchno-tehnicheskij-otchet-po-okr-sch-okr",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/katalogizaciya-predmetov-snabzheniya/razrabotka-proektov-katalozhnyh-opisanij-podlezhashhih-vklyucheniyu-v-fkp",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/katalogizaciya-predmetov-snabzheniya/konsultacii-i-soprovozhdenie-pri-registracii-predpriyatij-razrabotchikov-postavshhikov-v-fskp",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/katalogizaciya-predmetov-snabzheniya/soprovozhdenie-pri-registracii-produkcii-v-fkp-i-vydachi-sootvetstvuyushhego-uvedomleniya",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/organizaciya-razrabotki-soglasovaniya-i-utverzhdeniya-dokumentacii-po-primeneniyu-produkcii-inostrannogo-proizvodstva",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/organizaciya-razrabotki-soglasovaniya-i-utverzhdeniya-elektronnoj-konstruktorskoj-dokumentacii-po-zayavlennym-gruppam-odnorodnoj-produkcii",
    destination: "/other-services/organizatsiya-razrabotki-i-utverzhdeniya-ekd-pod-klyuch",
    permanent: true,
  },

  {
    source:
      "/uslugi/provedenie-rabot-po-sistematizacii-i-avtomatizacii-informacii-dlya-golovnyh-ispolnitelej-gosudarstvennogo-oboronnogo-zakaza/provedenie-sopostavitelnogo-analiza-predmetov-snabzheniya",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/provedenie-rabot-po-sistematizacii-i-avtomatizacii-informacii-dlya-golovnyh-ispolnitelej-gosudarstvennogo-oboronnogo-zakaza/razrabotka-programmno-apparatnyh-kompleksov-po-katalogizacii-produkcii",
    destination: CATALOGIZATION,
    permanent: true,
  },

  {
    source:
      "/uslugi/vypolnenie-funkcij-centra-katalogizacii-gosudarstvennogo-zakazchika-i-centra-katalogizacii-po-zakreplennoj-gruppe-odnorodnoj-produkcii/razrabotka-aktualizaciya-standartnyh-formatov-opisaniya-sfo-produkcii",
    destination: "/catalogization/razrabotka-standartnyh-formatov-opisaniya-sfo",
    permanent: true,
  },
  {
    source:
      "/uslugi/vypolnenie-funkcij-centra-katalogizacii-gosudarstvennogo-zakazchika-i-centra-katalogizacii-po-zakreplennoj-gruppe-odnorodnoj-produkcii/formirovanie-predlozhenij-po-razrabotke-proekta-struktury-razdelov-fkp",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/vypolnenie-funkcij-centra-katalogizacii-gosudarstvennogo-zakazchika-i-centra-katalogizacii-po-zakreplennoj-gruppe-odnorodnoj-produkcii/razrabotka-proektov-nomenklaturnyh-perechnej-promyshlennoj-produkcii-v-tom-chisle-komplektuyushhih-izdelij-i-materialov",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/vypolnenie-funkcij-centra-katalogizacii-gosudarstvennogo-zakazchika-i-centra-katalogizacii-po-zakreplennoj-gruppe-odnorodnoj-produkcii/klassifikaciya-produkcii-po-ek-001-2023",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/vypolnenie-funkcij-centra-katalogizacii-gosudarstvennogo-zakazchika-i-centra-katalogizacii-po-zakreplennoj-gruppe-odnorodnoj-produkcii/razrabotka-planov-i-organizaciya-rabot-po-katalogizacii-produkcii-v-tom-chisle-komplektuyushhih-izdelij-i-materialov",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/vypolnenie-funkcij-centra-katalogizacii-gosudarstvennogo-zakazchika-i-centra-katalogizacii-po-zakreplennoj-gruppe-odnorodnoj-produkcii/razrabotka-inzhenernyh-metodik-sopostavitelnogo-analiza-produkcii",
    destination: CATALOGIZATION,
    permanent: true,
  },

  {
    source:
      "/uslugi/nauchno-issledovatelskaya-deyatelnost-v-oblasti-katalogizacii-produkcii-mnogokriterialnogo-sopostavitelnogo-analiza-i-podderzhki-prinyatiya-reshenij/razrabotka-metodologii-katalogizacii-produkcii-i-primenenie-kataloga-produkcii-v-reshenii-prikladnyh-poiskovyh-zadach",
    destination: "/other-services/razrabotka-i-adaptatsiya-metodologii-katalogizatsii",
    permanent: true,
  },
  {
    source:
      "/uslugi/nauchno-issledovatelskaya-deyatelnost-v-oblasti-katalogizacii-produkcii-mnogokriterialnogo-sopostavitelnogo-analiza-i-podderzhki-prinyatiya-reshenij/razrabotka-logicheskoj-struktury-bazy-dannyh-obespechivayushhej-katalogizaciyu-produkcii",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/nauchno-issledovatelskaya-deyatelnost-v-oblasti-katalogizacii-produkcii-mnogokriterialnogo-sopostavitelnogo-analiza-i-podderzhki-prinyatiya-reshenij/razrabotka-tehnicheskogo-zadaniya-na-programmirovanie-zadach-katalogizacii",
    destination: CATALOGIZATION,
    permanent: true,
  },
  {
    source:
      "/uslugi/nauchno-issledovatelskaya-deyatelnost-v-oblasti-katalogizacii-produkcii-mnogokriterialnogo-sopostavitelnogo-analiza-i-podderzhki-prinyatiya-reshenij/formirovanie-i-vedenie-reestra-produkcii-vklyuchaya-sistematizaciyu-i-klassifikaciyu-svedenij-o-nej",
    destination: CATALOGIZATION,
    permanent: true,
  },

  /** Остальные старые URL услуг без отдельного аналога. */
  { source: "/uslugi/:path*", destination: CATALOGIZATION, permanent: true },

  /** Устаревший раздел нового сайта — в каталогизацию. */
  { source: "/services", destination: CATALOGIZATION, permanent: true },
  { source: "/services/:path*", destination: CATALOGIZATION, permanent: true },
];

/** Старый сайт отдавал URL с завершающим слэшем — дублируем правила. */
export function getLegacyRedirects(): Redirect[] {
  const withTrailingSlash: Redirect[] = [];
  for (const rule of LEGACY_REDIRECTS) {
    withTrailingSlash.push(rule);
    if (!rule.source.endsWith("/") && !rule.source.includes(":")) {
      withTrailingSlash.push({ ...rule, source: `${rule.source}/` });
    }
  }
  return withTrailingSlash;
}
