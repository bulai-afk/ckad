import type { Redirect } from "next/dist/lib/load-custom-routes";

/** Блок «Выполнение функций центра каталогизации…» на новом сайте. */
const TSENTRA_KATALOGIZATSII =
  "/services/vypolnenie-funktsiy-tsentra-katalogizatsii-gosudarstvennogo-zakazchika-i-tsentra-katalogizatsii-po-zakreplennoy-gruppe-odnorodnoy-produktsii";

/** Блок «Систематизация и автоматизация информации…» на новом сайте. */
const SISTEMATIZATSIYA =
  "/services/provedenie-rabot-po-sistematizatsii-i-avtomatizatsii-informatsii-dlya-golovnyh-ispolniteley-gosudarstvennogo-oboronnogo-zakaza";

/** Блок «Научно-исследовательская деятельность…» на новом сайте. */
const NAUCHNO_ISSLEDOVATELSKAYA =
  "/services/nauchno-issledovatelskaya-deyatelnost-v-oblasti-katalogizatsii-produktsii-mnogokriterialnogo-sopostavitelnogo-analiza-i-podderzhki-prinyatiya-resheniy";

/**
 * 301 с путей старого сайта (индекс Яндекс.Вебмастера, июнь 2026).
 * Пункты без аналога (oblasti-primeneniya-fkps, popd.pdf) намеренно не включены.
 */
const LEGACY_REDIRECTS: Redirect[] = [
  { source: "/o-kompanii", destination: "/about", permanent: true },
  { source: "/kontakty", destination: "/contacts", permanent: true },
  { source: "/zadat-vopros", destination: "/contacts", permanent: true },
  { source: "/uslugi", destination: "/services", permanent: true },

  {
    source: "/uslugi/organizaciya-obucheniya-v-oblasti-katalogizacii-produkcii-i-po-drugim-napravleniyam-v-sfere-goz",
    destination: "/training-center",
    permanent: true,
  },
  {
    source: "/uslugi/katalogizaciya-predmetov-snabzheniya",
    destination: "/services",
    permanent: true,
  },
  {
    source:
      "/uslugi/vypolnenie-funkcij-centra-katalogizacii-gosudarstvennogo-zakazchika-i-centra-katalogizacii-po-zakreplennoj-gruppe-odnorodnoj-produkcii",
    destination: "/services",
    permanent: true,
  },
  {
    source:
      "/uslugi/nauchno-issledovatelskaya-deyatelnost-v-oblasti-katalogizacii-produkcii-mnogokriterialnogo-sopostavitelnogo-analiza-i-podderzhki-prinyatiya-reshenij",
    destination: "/services",
    permanent: true,
  },
  {
    source:
      "/uslugi/provedenie-rabot-po-sistematizacii-i-avtomatizacii-informacii-dlya-golovnyh-ispolnitelej-gosudarstvennogo-oboronnogo-zakaza",
    destination: `${SISTEMATIZATSIYA}/p1`,
    permanent: true,
  },

  {
    source: "/articles/zachem-nuzhna-katalogizaciya",
    destination: "/articles/zachem-nuzhna-katalogizatsiya-produktsii-i-chto-eto-takoe",
    permanent: true,
  },
  {
    source: "/articles/katalog-kak-osnova-formirovaniya-gpv-i-gp-opk",
    destination: "/articles/federal-nyy-katalog-osnova-planirovaniya-vooruzheniya-i-opk",
    permanent: true,
  },
  {
    source: "/articles/mezhgosudarstvennyj-katalog-ps-vs-gosudarstv-chlenov-odkb",
    destination: "/articles/edinyy-katalog-odkb-bystree-snabzhenie-nizhe-rashody",
    permanent: true,
  },
  {
    source: "/articles/katalogizaciya-kak-instrument-standartizacii-i-unifikacii",
    destination: "/articles/tehregulirovanie-v-opk-kak-povysit-effektivnost-goz",
    permanent: true,
  },

  {
    source:
      "/uslugi/katalogizaciya-predmetov-snabzheniya/razrabotka-specialnyh-formatov-dlya-razmeshheniya-svedenij-o-produkcii-v-fkp",
    destination:
      "/services/katlogizatsiya/razrabotka-specialnyh-formatov-dlya-razmeshheniya-svedenij-o-produkcii-v-fkp",
    permanent: true,
  },
  {
    source:
      "/uslugi/katalogizaciya-predmetov-snabzheniya/razrabotka-proekta-nomenklaturnogo-perechnya-predmetov-snabzheniya",
    destination:
      "/services/katlogizatsiya/razrabotka-proekta-nomenklaturnogo-perechnya-predmetov-snabzheniya",
    permanent: true,
  },
  {
    source:
      "/uslugi/katalogizaciya-predmetov-snabzheniya/razrabotka-razdelov-po-katalogizacii-v-nauchno-tehnicheskij-otchet-po-okr-sch-okr",
    destination:
      "/services/katlogizatsiya/razrabotka-razdelov-po-katalogizacii-v-nauchno-tehnicheskij-otchet-po-okr-sch-okr",
    permanent: true,
  },
  {
    source:
      "/uslugi/katalogizaciya-predmetov-snabzheniya/razrabotka-proektov-katalozhnyh-opisanij-podlezhashhih-vklyucheniyu-v-fkp",
    destination:
      "/services/katlogizatsiya/razrabotka-proektov-katalozhnyh-opisanij-podlezhashhih-vklyucheniyu-v-fkp",
    permanent: true,
  },
  {
    source:
      "/uslugi/katalogizaciya-predmetov-snabzheniya/konsultacii-i-soprovozhdenie-pri-registracii-predpriyatij-razrabotchikov-postavshhikov-v-fskp",
    destination:
      "/services/katlogizatsiya/konsultacii-i-soprovozhdenie-pri-registracii-predpriyatij-razrabotchikov-postavshhikov-v-fskp",
    permanent: true,
  },
  {
    source:
      "/uslugi/katalogizaciya-predmetov-snabzheniya/soprovozhdenie-pri-registracii-produkcii-v-fkp-i-vydachi-sootvetstvuyushhego-uvedomleniya",
    destination:
      "/services/katlogizatsiya/soprovozhdenie-pri-registracii-produkcii-v-fkp-i-vydachi-sootvetstvuyushhego-uvedomleniya",
    permanent: true,
  },
  {
    source:
      "/uslugi/organizaciya-razrabotki-soglasovaniya-i-utverzhdeniya-dokumentacii-po-primeneniyu-produkcii-inostrannogo-proizvodstva",
    destination:
      "/services/organizatsiya-razrabotki-soglasovaniya-i-utverzhdeniya-dokumentatsii-po-primeneniyu-produktsii-inostrannogo-proizvodstva/p1",
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
    destination: `${SISTEMATIZATSIYA}/p1`,
    permanent: true,
  },
  {
    source:
      "/uslugi/provedenie-rabot-po-sistematizacii-i-avtomatizacii-informacii-dlya-golovnyh-ispolnitelej-gosudarstvennogo-oboronnogo-zakaza/razrabotka-programmno-apparatnyh-kompleksov-po-katalogizacii-produkcii",
    destination: `${SISTEMATIZATSIYA}/p2`,
    permanent: true,
  },

  {
    source:
      "/uslugi/vypolnenie-funkcij-centra-katalogizacii-gosudarstvennogo-zakazchika-i-centra-katalogizacii-po-zakreplennoj-gruppe-odnorodnoj-produkcii/razrabotka-aktualizaciya-standartnyh-formatov-opisaniya-sfo-produkcii",
    destination: `${TSENTRA_KATALOGIZATSII}/p2`,
    permanent: true,
  },
  {
    source:
      "/uslugi/vypolnenie-funkcij-centra-katalogizacii-gosudarstvennogo-zakazchika-i-centra-katalogizacii-po-zakreplennoj-gruppe-odnorodnoj-produkcii/formirovanie-predlozhenij-po-razrabotke-proekta-struktury-razdelov-fkp",
    destination: `${TSENTRA_KATALOGIZATSII}/p1`,
    permanent: true,
  },
  {
    source:
      "/uslugi/vypolnenie-funkcij-centra-katalogizacii-gosudarstvennogo-zakazchika-i-centra-katalogizacii-po-zakreplennoj-gruppe-odnorodnoj-produkcii/razrabotka-proektov-nomenklaturnyh-perechnej-promyshlennoj-produkcii-v-tom-chisle-komplektuyushhih-izdelij-i-materialov",
    destination: `${TSENTRA_KATALOGIZATSII}/p3`,
    permanent: true,
  },
  {
    source:
      "/uslugi/vypolnenie-funkcij-centra-katalogizacii-gosudarstvennogo-zakazchika-i-centra-katalogizacii-po-zakreplennoj-gruppe-odnorodnoj-produkcii/klassifikaciya-produkcii-po-ek-001-2023",
    destination: `${TSENTRA_KATALOGIZATSII}/p4`,
    permanent: true,
  },
  {
    source:
      "/uslugi/vypolnenie-funkcij-centra-katalogizacii-gosudarstvennogo-zakazchika-i-centra-katalogizacii-po-zakreplennoj-gruppe-odnorodnoj-produkcii/razrabotka-planov-i-organizaciya-rabot-po-katalogizacii-produkcii-v-tom-chisle-komplektuyushhih-izdelij-i-materialov",
    destination: `${TSENTRA_KATALOGIZATSII}/p5`,
    permanent: true,
  },
  {
    source:
      "/uslugi/vypolnenie-funkcij-centra-katalogizacii-gosudarstvennogo-zakazchika-i-centra-katalogizacii-po-zakreplennoj-gruppe-odnorodnoj-produkcii/razrabotka-inzhenernyh-metodik-sopostavitelnogo-analiza-produkcii",
    destination: `${TSENTRA_KATALOGIZATSII}/p6`,
    permanent: true,
  },

  {
    source:
      "/uslugi/nauchno-issledovatelskaya-deyatelnost-v-oblasti-katalogizacii-produkcii-mnogokriterialnogo-sopostavitelnogo-analiza-i-podderzhki-prinyatiya-reshenij/razrabotka-metodologii-katalogizacii-produkcii-i-primenenie-kataloga-produkcii-v-reshenii-prikladnyh-poiskovyh-zadach",
    destination: `${NAUCHNO_ISSLEDOVATELSKAYA}/p1`,
    permanent: true,
  },
  {
    source:
      "/uslugi/nauchno-issledovatelskaya-deyatelnost-v-oblasti-katalogizacii-produkcii-mnogokriterialnogo-sopostavitelnogo-analiza-i-podderzhki-prinyatiya-reshenij/razrabotka-logicheskoj-struktury-bazy-dannyh-obespechivayushhej-katalogizaciyu-produkcii",
    destination: `${NAUCHNO_ISSLEDOVATELSKAYA}/p2`,
    permanent: true,
  },
  {
    source:
      "/uslugi/nauchno-issledovatelskaya-deyatelnost-v-oblasti-katalogizacii-produkcii-mnogokriterialnogo-sopostavitelnogo-analiza-i-podderzhki-prinyatiya-reshenij/razrabotka-tehnicheskogo-zadaniya-na-programmirovanie-zadach-katalogizacii",
    destination: `${NAUCHNO_ISSLEDOVATELSKAYA}/p3`,
    permanent: true,
  },
  {
    source:
      "/uslugi/nauchno-issledovatelskaya-deyatelnost-v-oblasti-katalogizacii-produkcii-mnogokriterialnogo-sopostavitelnogo-analiza-i-podderzhki-prinyatiya-reshenij/formirovanie-i-vedenie-reestra-produkcii-vklyuchaya-sistematizaciyu-i-klassifikaciyu-svedenij-o-nej",
    destination: `${NAUCHNO_ISSLEDOVATELSKAYA}/p4`,
    permanent: true,
  },
];

/** Старый сайт отдавал URL с завершающим слэшем — дублируем правила. */
export function getLegacyRedirects(): Redirect[] {
  const withTrailingSlash: Redirect[] = [];
  for (const rule of LEGACY_REDIRECTS) {
    withTrailingSlash.push(rule);
    if (!rule.source.endsWith("/")) {
      withTrailingSlash.push({ ...rule, source: `${rule.source}/` });
    }
  }
  return withTrailingSlash;
}
