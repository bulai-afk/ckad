import type { Redirect } from "next/dist/lib/load-custom-routes";

const CATALOGIZATION = "/catalogization";
const GOZ_POD_KLYUCH = "/catalogization/katalogizatsiya-produktsii-po-goz-pod-klyuch";
const RAZRABOTKA_PO = "/other-services/razrabotka-po-dlya-obrascheniya-svedeniy-o-produktsii";
const EKD_CANONICAL =
  "/other-services/other-services-organizatsiya-razrabotki-i-utverzhdeniya-ekd-pod-klyuch";

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
    source:
      "/uslugi/organizaciya-obucheniya-v-oblasti-katalogizacii-produkcii-i-po-drugim-napravleniyam-v-sfere-goz",
    destination: "/training-center/seminary-po-katalogizatsii",
    permanent: true,
  },
  {
    source: "/uslugi/katalogizaciya-predmetov-snabzheniya",
    destination: GOZ_POD_KLYUCH,
    permanent: true,
  },
  {
    source: "/uslugi/katalogizaciya-predmetov-snabzheniya/:path*",
    destination: GOZ_POD_KLYUCH,
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
    destination: RAZRABOTKA_PO,
    permanent: true,
  },
  {
    source:
      "/uslugi/provedenie-rabot-po-sistematizacii-i-avtomatizacii-informacii-dlya-golovnyh-ispolnitelej-gosudarstvennogo-oboronnogo-zakaza",
    destination: RAZRABOTKA_PO,
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
      "/uslugi/organizaciya-razrabotki-soglasovaniya-i-utverzhdeniya-dokumentacii-po-primeneniyu-produkcii-inostrannogo-proizvodstva",
    destination: "/other-services/dokumenty-dlya-primeneniya-inostrannoy-produktsii-v-vvst",
    permanent: true,
  },
  {
    source:
      "/uslugi/organizaciya-razrabotki-soglasovaniya-i-utverzhdeniya-elektronnoj-konstruktorskoj-dokumentacii-po-zayavlennym-gruppam-odnorodnoj-produkcii",
    destination: EKD_CANONICAL,
    permanent: true,
  },

  /** Дубль ЭКД на новом сайте → канонический slug. */
  {
    source: "/other-services/organizatsiya-razrabotki-i-utverzhdeniya-ekd-pod-klyuch",
    destination: EKD_CANONICAL,
    permanent: true,
  },

  {
    source:
      "/uslugi/provedenie-rabot-po-sistematizacii-i-avtomatizacii-informacii-dlya-golovnyh-ispolnitelej-gosudarstvennogo-oboronnogo-zakaza/provedenie-sopostavitelnogo-analiza-predmetov-snabzheniya",
    destination: "/other-services/poisk-analogov-komplektuyuschih",
    permanent: true,
  },
  {
    source:
      "/uslugi/provedenie-rabot-po-sistematizacii-i-avtomatizacii-informacii-dlya-golovnyh-ispolnitelej-gosudarstvennogo-oboronnogo-zakaza/razrabotka-programmno-apparatnyh-kompleksov-po-katalogizacii-produkcii",
    destination: RAZRABOTKA_PO,
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
      "/uslugi/nauchno-issledovatelskaya-deyatelnost-v-oblasti-katalogizacii-produkcii-mnogokriterialnogo-sopostavitelnogo-analiza-i-podderzhki-prinyatiya-reshenij/:path*",
    destination: RAZRABOTKA_PO,
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
