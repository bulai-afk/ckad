import assert from "node:assert/strict";
import test from "node:test";
import {
  CANONICAL_PUBLIC_HOSTNAME_ASCII,
  canonicalAbsoluteUrl,
  canonicalHostRedirectTarget,
  canonicalPublicOrigin,
  isCanonicalPublicHost,
  selectPublicHost,
  shouldEnableProductionAnalytics,
} from "./publicSiteHosts";

const ORIGIN = "https://центр-каталогизации.рф";

test("canonical origin is the cyrillic site", () => {
  assert.equal(canonicalPublicOrigin(), ORIGIN);
  assert.equal(canonicalAbsoluteUrl("/catalogization"), `${ORIGIN}/catalogization`);
  assert.equal(canonicalAbsoluteUrl("/", "?x=1"), `${ORIGIN}/?x=1`);
  assert.equal(canonicalAbsoluteUrl("//evil.example"), `${ORIGIN}/`);
});

test("mirror hosts redirect in one step with path and query", () => {
  const cases = [
    ["centrcatalog.ru", "http", "/"],
    ["WWW.Centrcatalog.RU:443", "https", "/catalogization"],
    ["www.centrcatalog.ru", "http", "/about"],
    ["centrcatalog.ru.", "https", "/about"],
    ["www.центр-каталогизации.рф", "https", "/about"],
    ["WWW.XN----8SBAAOISHCAOOVTY5AE8DP.XN--P1AI", "http", "/about"],
    ["центркаталогизации.рф", "http", "/contacts"],
  ] as const;

  for (const [host, protocol, path] of cases) {
    const search = path === "/catalogization" ? "?x=1" : "";
    assert.equal(
      canonicalHostRedirectTarget({ host, protocol, pathname: path, search }),
      `${ORIGIN}${path}${search}`,
      host,
    );
  }
});

test("apex https stays, apex http upgrades, localhost is left alone", () => {
  assert.equal(
    canonicalHostRedirectTarget({
      host: CANONICAL_PUBLIC_HOSTNAME_ASCII,
      protocol: "https",
      pathname: "/",
    }),
    null,
  );
  assert.equal(
    canonicalHostRedirectTarget({
      host: "Центр-Каталогизации.рф:443",
      protocol: "https,http",
      pathname: "/catalogization",
    }),
    null,
  );
  assert.equal(
    canonicalHostRedirectTarget({
      host: "центр-каталогизации.рф",
      protocol: "http",
      pathname: "/about",
      search: "",
    }),
    `${ORIGIN}/about`,
  );
  assert.equal(
    canonicalHostRedirectTarget({
      host: "localhost:3000",
      protocol: "http",
      pathname: "/",
    }),
    null,
  );
  assert.equal(
    canonicalHostRedirectTarget({
      host: "127.0.0.1:3003",
      protocol: "http",
      pathname: "/catalogization",
    }),
    null,
  );
  assert.equal(
    canonicalHostRedirectTarget({
      host: "preview.example.com",
      protocol: "https",
      pathname: "/",
    }),
    null,
  );
});

test("loopback host wins over a forwarded mirror host", () => {
  assert.equal(selectPublicHost("localhost:3000", "centrcatalog.ru"), "localhost:3000");
  assert.equal(selectPublicHost("centrcatalog.ru", "www.centrcatalog.ru"), "www.centrcatalog.ru");
  assert.equal(isCanonicalPublicHost("центр-каталогизации.рф"), true);
  assert.equal(isCanonicalPublicHost("centrcatalog.ru"), false);
});

test("analytics only on production and the main domain", () => {
  assert.equal(shouldEnableProductionAnalytics("development", "центр-каталогизации.рф"), false);
  assert.equal(shouldEnableProductionAnalytics("production", "localhost"), false);
  assert.equal(shouldEnableProductionAnalytics("production", "127.0.0.1"), false);
  assert.equal(shouldEnableProductionAnalytics("production", "centrcatalog.ru"), false);
  assert.equal(shouldEnableProductionAnalytics("production", "preview.example.com"), false);
  assert.equal(shouldEnableProductionAnalytics("production", CANONICAL_PUBLIC_HOSTNAME_ASCII), true);
  assert.equal(shouldEnableProductionAnalytics("production", "Центр-Каталогизации.рф"), true);
});
