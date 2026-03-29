"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TransitionEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  NAV_FOLDERS_COOKIE_NAME,
  serializeNavFoldersCookie,
  type FolderNavItem,
} from "@/lib/navFoldersCookie";

import { apiBaseUrl } from "@/lib/apiBaseUrl";

const CUSTOM_FOLDERS_STORAGE_KEY = "admin_custom_folders_v1";

/** Одинаковая ширина первого уровня и вложенных панелей (inline — не зависит от парсинга Tailwind). */
const DESKTOP_NAV_MENU_PANEL_STYLE: CSSProperties = {
  boxSizing: "border-box",
  width: "min(15rem, calc(100vw - 2rem))",
  minWidth: "min(15rem, calc(100vw - 2rem))",
  maxWidth: "min(15rem, calc(100vw - 2rem))",
  /* без цветной обводки — только объёмная тень */
  boxShadow:
    "0 4px 6px -2px rgba(15, 23, 42, 0.06), 0 12px 28px -8px rgba(15, 23, 42, 0.12), 0 24px 48px -12px rgba(15, 23, 42, 0.14)",
};

const DESKTOP_NAV_MENU_PANEL_CLASS =
  "flex min-w-0 flex-col overflow-x-hidden overscroll-contain";

const NAV_ITEMS = [
  { href: "/", label: "Главная" },
  { href: "/services", label: "Услуги" },
  { href: "/contacts", label: "Контакты" },
];

type NavItem = FolderNavItem;

type PublishedPageRow = {
  id: number;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED" | string;
};

function CallbackRequestModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorText("");
    setStatus("sending");
    try {
      const name = `${firstName} ${lastName}`.trim();
      const message = "Заявка с модального окна обратного звонка.";
      const res = await fetch(`${apiBaseUrl()}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, message }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setErrorText("Не удалось отправить. Проверьте телефон/e-mail и попробуйте снова.");
        setStatus("error");
        return;
      }
      setStatus("success");
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      window.setTimeout(() => {
        onClose();
        setStatus("idle");
      }, 800);
    } catch {
      setErrorText("Нет связи с сервером. Попробуйте позже.");
      setStatus("error");
    }
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 z-0 bg-transparent"
        style={{ backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
        aria-label="Закрыть окно обратной связи"
        onClick={onClose}
      />
      <div className="relative z-10 w-[min(88vw,460px)] max-h-[92dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex-1 text-center">
            <h3 className="text-lg font-black uppercase tracking-tight text-[#496db3]">
              Обратный звонок
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        <p className="mb-4 text-[14px] font-semibold leading-[1.55] text-[#496db3]">
          Оставьте вашу заявку и наши специалисты свяжутся с вами.
        </p>
        <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Имя *"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#496db3] outline-none transition placeholder:text-[#496db3]/55 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/25"
            required
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Фамилия"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#496db3] outline-none transition placeholder:text-[#496db3]/55 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/25"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Телефон"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#496db3] outline-none transition placeholder:text-[#496db3]/55 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/25"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[14px] font-semibold text-[#496db3] outline-none transition placeholder:text-[#496db3]/55 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/25"
          />
          {status === "success" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-[14px] font-semibold text-emerald-800">
              Спасибо! Заявка отправлена.
            </div>
          ) : null}
          {status === "error" && errorText ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[14px] font-semibold text-red-800">
              {errorText}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={status === "sending"}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#496db3] px-5 py-3 text-[14px] font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "sending" ? "Отправляем..." : "Отправить заявку"}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function isPublishedPage(p: PublishedPageRow): boolean {
  return String(p.status).toUpperCase() === "PUBLISHED";
}

/** В продакшене в меню только опубликованные; в dev — ещё и черновики (создаются по умолчанию как DRAFT). */
function isPageListedInPublicMenu(p: PublishedPageRow): boolean {
  if (isPublishedPage(p)) return true;
  return process.env.NODE_ENV === "development";
}

/**
 * Единый вид пути для меню: иначе папка из localStorage (`services/Katalog`) и страницы
 * (`services/katalog/...`) попадают в разные узлы дерева — подпапка выглядит пустой.
 */
function normalizeContentSlug(s: string): string {
  const t = s
    .trim()
    .replace(/^\/+/u, "")
    .replace(/\/+$/u, "")
    .replace(/\/+/gu, "/");
  return t.toLowerCase();
}

type StoredFolderRow = { name: string; slug: string };

/** Дерево: корень = раздел (services / articles), дальше вложенные папки и страницы */
type SectionMenuNode = {
  slugPath: string;
  label: string;
  pages: NavItem[];
  children: SectionMenuNode[];
};

function humanizeSegment(seg: string): string {
  if (!seg) return seg;
  const t = seg.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function buildFolderLabelMap(prefix: string, folders: StoredFolderRow[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of folders) {
    const slug = normalizeContentSlug(f.slug);
    if (slug === prefix || slug.startsWith(`${prefix}/`)) {
      m.set(slug, f.name);
    }
  }
  return m;
}

function pathPartsStartWith(parts: string[], head: string[]): boolean {
  if (parts.length < head.length) return false;
  for (let i = 0; i < head.length; i += 1) {
    if (parts[i] !== head[i]) return false;
  }
  return true;
}

/**
 * Дерево страниц и папок под произвольным корнем (`services`, `articles`, `katalogizaciya`, `foo/bar`, …).
 * Страницы и папки вне этого префикса в дерево не попадают — поэтому корневые папки без `services/`
 * раньше не показывали вложенность в навбаре.
 */
function buildRootMenuTree(
  rootSlugRaw: string,
  pages: PublishedPageRow[],
  folders: StoredFolderRow[],
): SectionMenuNode {
  const rootSlug = normalizeContentSlug(rootSlugRaw);
  const rootSegments = rootSlug.split("/").filter(Boolean);
  if (rootSegments.length === 0) {
    return { slugPath: rootSlug, label: "", pages: [], children: [] };
  }

  const folderLabels = buildFolderLabelMap(rootSlug, folders);
  const root: SectionMenuNode = {
    slugPath: rootSlug,
    label: "",
    pages: [],
    children: [],
  };

  const findOrCreateChild = (parent: SectionMenuNode, slugPath: string, segment: string): SectionMenuNode => {
    let ch = parent.children.find((c) => c.slugPath === slugPath);
    if (!ch) {
      ch = {
        slugPath,
        label: folderLabels.get(slugPath) ?? humanizeSegment(segment),
        pages: [],
        children: [],
      };
      parent.children.push(ch);
    }
    return ch;
  };

  const ensureChain = (parts: string[]): SectionMenuNode => {
    if (!pathPartsStartWith(parts, rootSegments)) return root;
    let node = root;
    for (let j = rootSegments.length; j < parts.length; j += 1) {
      const pathSoFar = parts.slice(0, j + 1).join("/");
      const seg = parts[j];
      node = findOrCreateChild(node, pathSoFar, seg);
    }
    return node;
  };

  for (const f of folders) {
    const fslug = normalizeContentSlug(f.slug);
    if (fslug === rootSlug) continue;
    if (!fslug.startsWith(`${rootSlug}/`)) continue;
    const parts = fslug.split("/").filter(Boolean);
    if (!pathPartsStartWith(parts, rootSegments)) continue;
    ensureChain(parts);
  }

  for (const p of pages) {
    if (!isPageListedInPublicMenu(p)) continue;
    const pslug = normalizeContentSlug(p.slug);
    if (pslug !== rootSlug && !pslug.startsWith(`${rootSlug}/`)) continue;
    const parts = pslug.split("/").filter(Boolean);
    if (!pathPartsStartWith(parts, rootSegments)) continue;
    if (parts.length <= rootSegments.length) continue;

    if (parts.length === rootSegments.length + 1) {
      root.pages.push({ href: `/${pslug}`, label: p.title });
    } else {
      const parentParts = parts.slice(0, -1);
      const parentNode = ensureChain(parentParts);
      parentNode.pages.push({ href: `/${pslug}`, label: p.title });
    }
  }

  const sortNode = (n: SectionMenuNode) => {
    n.pages.sort((a, b) => a.label.localeCompare(b.label, "ru"));
    n.children.sort((a, b) => a.label.localeCompare(b.label, "ru"));
    n.children.forEach(sortNode);
  };
  sortNode(root);

  return root;
}

function buildSectionMenuTree(
  prefix: "services" | "articles",
  pages: PublishedPageRow[],
  folders: StoredFolderRow[],
): SectionMenuNode {
  return buildRootMenuTree(prefix, pages, folders);
}

function treeRootHasMenuItems(node: SectionMenuNode): boolean {
  return node.pages.length > 0 || node.children.length > 0;
}

/**
 * Кастомный пункт «/katalogizaciya», а контент в БД лежит под `services/katalogizaciya/...` —
 * без подстановки префикса дерево пустое и подпапки показывают «нет пунктов».
 */
function candidateRootsForNavItemHref(href: string): string[] {
  const raw = slugPathFromHref(href);
  const out: string[] = [raw];
  if (raw === "services" || raw.startsWith("services/")) return out;
  if (raw === "articles" || raw.startsWith("articles/")) return out;
  out.push(`services/${raw}`, `articles/${raw}`);
  return out;
}

function resolveNavSectionTree(
  item: NavItem,
  pages: PublishedPageRow[],
  folders: StoredFolderRow[],
): { tree: SectionMenuNode; hubHref: string } {
  const raw = slugPathFromHref(item.href);
  for (const root of candidateRootsForNavItemHref(item.href)) {
    const norm = normalizeContentSlug(root);
    const tree = buildRootMenuTree(norm, pages, folders);
    if (treeRootHasMenuItems(tree)) {
      const hubHref = norm === raw ? item.href : `/${norm}`;
      return { tree, hubHref };
    }
  }
  return { tree: buildRootMenuTree(raw, pages, folders), hubHref: item.href };
}

/** Сравнение путей без завершающего `/` и в нижнем регистре */
function normalizeNavPathForCompare(path: string): string {
  const t = path.trim().toLowerCase().replace(/\/+$/u, "");
  return t === "" ? "/" : t;
}

/** Совпадает с href или вложен ниже (регистр и завершающий / не важны) */
function navPathMatchesPrefix(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  const p = normalizeNavPathForCompare(pathname);
  let h = href.trim();
  if (!h.startsWith("/")) h = `/${h}`;
  h = normalizeNavPathForCompare(h);
  return p === h || p.startsWith(`${h}/`);
}

function subtreeHasActive(node: SectionMenuNode, pathname: string | null): boolean {
  if (!pathname) return false;
  /*
    Текущий URL лежит внутри этой папки (по slugPath), даже если страница не попала в pages/children
    дерева (черновик, другой slug, устаревшее меню) — папка всё равно «содержит» страницу.
  */
  if (node.slugPath) {
    const folderBase = `/${node.slugPath}`;
    if (navPathMatchesPrefix(pathname, folderBase)) return true;
  }
  for (const p of node.pages) {
    if (navPathMatchesPrefix(pathname, p.href)) return true;
  }
  for (const c of node.children) {
    if (navPathMatchesPrefix(pathname, `/${c.slugPath}`)) return true;
    if (subtreeHasActive(c, pathname)) return true;
  }
  return false;
}

/** Ссылка «Все услуги» / «Все статьи» внутри раздела — только точное совпадение с хабом, не любой /services/... */
function navHubLinkIsExactActive(pathname: string | null, hubHref: string): boolean {
  if (!pathname) return false;
  return normalizeNavPathForCompare(pathname) === normalizeNavPathForCompare(hubHref);
}

/** Любая страница под префиксом хаба (подсветка триггера «Услуги» на десктопе) */
function pathnameIsUnderNavHub(pathname: string | null, hubHref: string): boolean {
  if (!pathname) return false;
  const p = normalizeNavPathForCompare(pathname);
  const h = normalizeNavPathForCompare(hubHref);
  return p === h || p.startsWith(`${h}/`);
}

/** Ключи `mf:…` для автоподъёма папок в моб. меню до текущей страницы */
function collectMobileFolderExpandKeys(node: SectionMenuNode, pathname: string | null): Set<string> {
  const keys = new Set<string>();
  if (!pathname) return keys;

  const walk = (n: SectionMenuNode): boolean => {
    let match = false;
    for (const p of n.pages) {
      if (navPathMatchesPrefix(pathname, p.href)) match = true;
    }
    for (const c of n.children) {
      const fh = `/${c.slugPath}`;
      const under = navPathMatchesPrefix(pathname, fh);
      const deeper = walk(c);
      if (under || deeper) {
        keys.add(`mf:${c.slugPath}`);
        match = true;
      }
    }
    return match;
  };

  walk(node);
  return keys;
}

function collectTreeHrefs(node: SectionMenuNode): Set<string> {
  const s = new Set<string>();
  for (const p of node.pages) {
    s.add(p.href.toLowerCase());
  }
  for (const c of node.children) {
    s.add(`/${c.slugPath}`.toLowerCase());
    for (const x of collectTreeHrefs(c)) s.add(x);
  }
  return s;
}

function MobileNavChevron({
  expanded,
  className = "text-[#496db3]",
}: {
  expanded: boolean;
  /** На активной папке — `text-white`, чтобы совпадать с фоном кнопки */
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      className={`h-5 w-5 shrink-0 transition-transform duration-200 ${className} ${expanded ? "rotate-180" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * Моб. меню: уровень 0 = Главная / заголовок «Услуги» / Контакты (одна колонка).
 * Уровень 1 = всё внутри раскрытого раздела (на STEP правее).
 * Уровень 2+ = каждая раскрытая подпапка ещё на STEP правее.
 */
const MOBILE_NAV_TREE_INDENT_BASE_PX = 12;
const MOBILE_NAV_TREE_INDENT_STEP_PX = 14;
/** Доп. отступ справа со 2-го уровня (внутри подпапки): заметнее, чем базовый pr */
const MOBILE_NAV_DEPTH2_EXTRA_RIGHT_PX = 24;

/** Свечение у раскрытой строки-триггера (раздел / папка) */
const MOBILE_NAV_EXPANDED_ROW_GLOW: CSSProperties = {
  boxShadow:
    "inset 0 0 0 1px rgba(73, 109, 179, 0.28)",
};

/** Свечение у панели с подпунктами (рамка + содержимое) */
const MOBILE_NAV_EXPANDED_PANEL_GLOW: CSSProperties = {
  boxShadow:
    "inset 0 0 0 1px rgba(73, 109, 179, 0.24)",
};

/** Есть ли в поддереве узла хотя бы одна раскрытая папка (ключ mf:…) */
function treeHasExpandedFolderDescendant(node: SectionMenuNode, expanded: Set<string>): boolean {
  for (const c of node.children) {
    if (expanded.has(`mf:${c.slugPath}`)) return true;
    if (treeHasExpandedFolderDescendant(c, expanded)) return true;
  }
  return false;
}

/** Под открытым разделом уже раскрыта какая‑то папка — внешнюю рамку блока раздела не показываем */
function mobileNavSectionHasOpenInnerFolder(tree: SectionMenuNode, expanded: Set<string>): boolean {
  return treeHasExpandedFolderDescendant(tree, expanded);
}

/**
 * У этой папки глубже открыта ещё папка — рамку «контента» показываем только у внутренней,
 * у родителя убираем (чтобы подсвечивались подпункты конкретной услуги).
 */
function mobileNavFolderHasOpenDescendant(folderNode: SectionMenuNode, expanded: Set<string>): boolean {
  return treeHasExpandedFolderDescendant(folderNode, expanded);
}

/** Строки дерева: без pl/pr в Tailwind — только инлайн, иначе v4 перебивает смещения */
function mobileNavTreeRowStyle(depth: number): CSSProperties {
  const pl = MOBILE_NAV_TREE_INDENT_BASE_PX + Math.max(0, depth) * MOBILE_NAV_TREE_INDENT_STEP_PX;
  const basePr = 12;
  const pr = depth >= 2 ? basePr + MOBILE_NAV_DEPTH2_EXTRA_RIGHT_PX : basePr;
  return { paddingLeft: pl, paddingRight: pr };
}

function mobileNavLinkRowClass(active: boolean): string {
  const ring =
    active
      ? "focus-visible:ring-2 focus-visible:ring-[#496db3]/30"
      : "focus-visible:ring-2 focus-visible:ring-[#496db3]/22";
  return `mx-1 flex min-h-12 items-center rounded-xl px-3 py-2 text-[15px] font-semibold leading-snug transition outline-none ${ring} focus-visible:ring-inset focus-visible:ring-offset-0 focus-visible:shadow-[0_0_14px_rgba(73,109,179,0.22)] active:bg-slate-100 ${
    active ? "bg-[#496db3] text-white" : "text-[#496db3] hover:bg-slate-50"
  }`;
}

function mobileNavTreeLinkRowClass(active: boolean): string {
  const ring =
    active
      ? "focus-visible:ring-2 focus-visible:ring-[#496db3]/30"
      : "focus-visible:ring-2 focus-visible:ring-[#496db3]/22";
  return `mx-1 flex min-h-12 items-center rounded-xl py-2 text-[15px] font-semibold leading-snug transition outline-none ${ring} focus-visible:ring-inset focus-visible:ring-offset-0 focus-visible:shadow-[0_0_14px_rgba(73,109,179,0.22)] active:bg-slate-100 ${
    active ? "bg-[#496db3] text-white" : "text-[#496db3] hover:bg-slate-50"
  }`;
}

function mobileNavTreeFolderBtnClass(openSubtreeActive: boolean, isOpen: boolean): string {
  const base =
    "mx-1 flex min-h-12 w-[calc(100%-0.5rem)] items-center justify-between gap-2 rounded-xl py-2 text-left text-[15px] font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#496db3]/22 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_14px_rgba(73,109,179,0.22)] active:bg-slate-100";
  /* Открыта папка с текущей страницей — как активная ссылка, иначе «Все услуги» визуально сильнее папки */
  if (isOpen && openSubtreeActive) {
    return `${base} bg-[#496db3] text-white`;
  }
  if (isOpen) {
    return `${base} bg-[#496db3]/14 text-[#496db3]`;
  }
  if (openSubtreeActive) {
    return `${base} bg-[#496db3]/12 text-[#496db3]`;
  }
  return `${base} text-[#496db3] hover:bg-slate-50`;
}

function MobileNavTree({
  node,
  pathname,
  onClose,
  expanded,
  onToggle,
  depth = 1,
}: {
  node: SectionMenuNode;
  pathname: string | null;
  onClose: () => void;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  /** 1 = первый уровень внутри раскрытого раздела (уже правее «Главная»); дальше +1 на подпапку */
  depth?: number;
}) {
  return (
    <>
      {node.pages.map((p) => {
        const active = navPathMatchesPrefix(pathname, p.href);
        return (
          <Link
            key={p.href}
            href={p.href}
            onClick={onClose}
            className={mobileNavTreeLinkRowClass(active)}
            style={mobileNavTreeRowStyle(depth)}
          >
            <span className="break-words">{p.label}</span>
          </Link>
        );
      })}
      {node.children.map((child) => {
        const key = `mf:${child.slugPath}`;
        const isOpen = expanded.has(key);
        const folderHref = `/${child.slugPath}`;
        const folderActive = navPathMatchesPrefix(pathname, folderHref);
        const hasInner = child.pages.length > 0 || child.children.length > 0;
        if (!hasInner) {
          return (
            <Link
              key={key}
              href={folderHref}
              onClick={onClose}
              className={mobileNavTreeLinkRowClass(folderActive)}
              style={mobileNavTreeRowStyle(depth)}
            >
              <span className="break-words">{child.label}</span>
            </Link>
          );
        }
        const childSubtreeActive = subtreeHasActive(child, pathname);
        const folderStrongActive = childSubtreeActive && isOpen;
        return (
          <div key={key} className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => onToggle(key)}
              aria-expanded={isOpen}
              aria-current={childSubtreeActive ? "location" : undefined}
              className={mobileNavTreeFolderBtnClass(childSubtreeActive, isOpen)}
              style={{
                ...mobileNavTreeRowStyle(depth),
                ...(isOpen && !folderStrongActive ? MOBILE_NAV_EXPANDED_ROW_GLOW : {}),
              }}
            >
              <span className="min-w-0 break-words">{child.label}</span>
              <MobileNavChevron
                expanded={isOpen}
                className={folderStrongActive ? "text-white" : "text-[#496db3]"}
              />
            </button>
            {isOpen ? (
              <div
                className={`flex flex-col gap-0.5 py-1 ${
                  !mobileNavFolderHasOpenDescendant(child, expanded)
                    ? "rounded-xl border border-[#496db3]/25 bg-[#496db3]/5"
                    : ""
                }`}
                style={{
                  marginLeft:
                    MOBILE_NAV_TREE_INDENT_BASE_PX + (depth + 1) * MOBILE_NAV_TREE_INDENT_STEP_PX,
                  ...(!mobileNavFolderHasOpenDescendant(child, expanded)
                    ? MOBILE_NAV_EXPANDED_PANEL_GLOW
                    : {}),
                }}
              >
                <MobileNavTree
                  node={child}
                  pathname={pathname}
                  onClose={onClose}
                  expanded={expanded}
                  onToggle={onToggle}
                  depth={depth + 1}
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </>
  );
}

function MobileNavSection({
  sectionKey,
  title,
  hubHref,
  hubLabel,
  tree,
  pathname,
  onClose,
  expanded,
  onToggle,
}: {
  sectionKey: string;
  title: string;
  hubHref: string;
  hubLabel: string;
  tree: SectionMenuNode;
  pathname: string | null;
  onClose: () => void;
  expanded: Set<string>;
  onToggle: (key: string) => void;
}) {
  const isOpen = expanded.has(sectionKey);
  const hubLinkExact = navHubLinkIsExactActive(pathname, hubHref);
  const subtreeActive = subtreeHasActive(tree, pathname);
  const sectionRowMutedActive = hubLinkExact || subtreeActive;
  const innerFolderOpen = mobileNavSectionHasOpenInnerFolder(tree, expanded);
  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        aria-expanded={isOpen}
        style={isOpen ? MOBILE_NAV_EXPANDED_ROW_GLOW : undefined}
        className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[15px] font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#496db3]/22 focus-visible:ring-offset-0 focus-visible:shadow-[0_0_14px_rgba(73,109,179,0.22)] active:bg-slate-100 ${
          isOpen
            ? "bg-[#496db3]/14 text-[#496db3]"
            : sectionRowMutedActive
              ? "bg-[#496db3]/15 text-[#496db3]"
              : "text-[#496db3] hover:bg-slate-50"
        }`}
      >
        <span className="min-w-0 break-words">{title}</span>
        <MobileNavChevron expanded={isOpen} />
      </button>
      {isOpen ? (
        <div
          className={`mt-0.5 flex flex-col gap-0.5 py-1.5 ${
            !innerFolderOpen ? "rounded-xl border border-[#496db3]/25 bg-[#496db3]/5" : ""
          }`}
          style={!innerFolderOpen ? MOBILE_NAV_EXPANDED_PANEL_GLOW : undefined}
        >
          <Link
            href={hubHref}
            onClick={onClose}
            className={mobileNavTreeLinkRowClass(hubLinkExact)}
            style={mobileNavTreeRowStyle(1)}
          >
            <span className="break-words">{hubLabel}</span>
          </Link>
          <MobileNavTree
            node={tree}
            pathname={pathname}
            onClose={onClose}
            expanded={expanded}
            onToggle={onToggle}
            depth={1}
          />
        </div>
      ) : null}
    </div>
  );
}

function useHoverMenu(delayMs = 160) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    setOpen(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      closeTimerRef.current = null;
    }, delayMs);
  };

  useEffect(() => () => clearCloseTimer(), []);

  return { open, openMenu, scheduleClose };
}

/** Один активный дропдаун верхнего уровня (капсулы в навбаре) — при быстром переходе между пунктами предыдущий закрывается сразу, а не через задержку. */
const PILL_DROPDOWN_CLOSE_DELAY_MS = 100;

type DesktopNavPillDropdownContextValue = {
  activeKey: string | null;
  openPill: (key: string) => void;
  scheduleClosePill: (key: string) => void;
  closeAllPills: () => void;
};

const DesktopNavPillDropdownContext = createContext<DesktopNavPillDropdownContextValue | null>(null);

function DesktopNavPillDropdownProvider({ children }: { children: ReactNode }) {
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const openPill = useCallback(
    (key: string) => {
      clearCloseTimer();
      setActiveKey(key);
    },
    [clearCloseTimer],
  );

  const scheduleClosePill = useCallback(
    (key: string) => {
      clearCloseTimer();
      closeTimerRef.current = window.setTimeout(() => {
        setActiveKey((cur) => (cur === key ? null : cur));
        closeTimerRef.current = null;
      }, PILL_DROPDOWN_CLOSE_DELAY_MS);
    },
    [clearCloseTimer],
  );

  const closeAllPills = useCallback(() => {
    clearCloseTimer();
    setActiveKey(null);
  }, [clearCloseTimer]);

  useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  const value = useMemo(
    () => ({ activeKey, openPill, scheduleClosePill, closeAllPills }),
    [activeKey, openPill, scheduleClosePill, closeAllPills],
  );

  return (
    <DesktopNavPillDropdownContext.Provider value={value}>{children}</DesktopNavPillDropdownContext.Provider>
  );
}

function slugPathFromHref(href: string): string {
  return href.replace(/^\//, "").toLowerCase();
}

function partitionFolderNavItems(items: NavItem[]) {
  const services: NavItem[] = [];
  const articles: NavItem[] = [];
  const other: NavItem[] = [];
  for (const item of items) {
    const p = slugPathFromHref(item.href);
    if (p === "services" || p.startsWith("services/")) {
      services.push(item);
    } else if (p === "articles" || p.startsWith("articles/")) {
      articles.push(item);
    } else {
      other.push(item);
    }
  }
  const sortRu = (a: NavItem, b: NavItem) => a.label.localeCompare(b.label, "ru");
  services.sort(sortRu);
  articles.sort(sortRu);
  other.sort(sortRu);
  return { services, articles, other };
}

function dropLinkClass(active: boolean) {
  return `mx-1 block max-w-full min-w-0 break-words rounded-lg px-3 py-2 text-sm font-semibold transition ${
    active ? "bg-[#496db3]/12 text-[#496db3]" : "text-[#496db3] hover:bg-slate-100"
  }`;
}

function desktopPillLinkClass(active: boolean) {
  return `inline-flex h-9 min-w-0 max-w-[180px] shrink items-center justify-center truncate whitespace-nowrap rounded-full px-3 text-sm font-semibold leading-none transition sm:px-4 ${
    active ? "bg-[#496db3] text-white" : "text-[#496db3] hover:bg-slate-100 hover:text-[#3f5f9d]"
  }`;
}

function ChevronRightMini({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M8.22 5.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 010-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Вложенная папка: всегда пункт с ▶; при наведении — панель справа (не страница-ссылка в первом уровне) */
function NavNestedFolderRow({ node, pathname }: { node: SectionMenuNode; pathname: string | null }) {
  const { open, openMenu, scheduleClose } = useHoverMenu(180);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [flyoutPos, setFlyoutPos] = useState<{ top: number; left: number } | null>(null);

  const folderHref = `/${node.slugPath}`;
  const folderActive =
    pathname === folderHref || (pathname?.startsWith(`${folderHref}/`) ?? false);
  const innerActive = subtreeHasActive(node, pathname);
  const rowActive = folderActive || innerActive;

  const hasInner = node.pages.length > 0 || node.children.length > 0;

  const updateFlyoutPos = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    /* небольшой «наезд» влево — мост от строки к панели (панель в портале, не режется overflow-y-auto) */
    setFlyoutPos({ top: r.top, left: r.right - 6 });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setFlyoutPos(null);
      return;
    }
    updateFlyoutPos();
    const ro = new ResizeObserver(() => updateFlyoutPos());
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("scroll", updateFlyoutPos, true);
    window.addEventListener("resize", updateFlyoutPos);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", updateFlyoutPos, true);
      window.removeEventListener("resize", updateFlyoutPos);
    };
  }, [open, updateFlyoutPos]);

  const flyout =
    open && flyoutPos && typeof document !== "undefined" ? (
      <div
        className="fixed pl-2 pt-0"
        style={{ top: flyoutPos.top, left: flyoutPos.left, zIndex: DESKTOP_NAV_NESTED_FLYOUT_Z }}
        role="presentation"
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        <div
          style={DESKTOP_NAV_MENU_PANEL_STYLE}
          className={`overflow-visible rounded-xl bg-white py-1.5 backdrop-blur-sm ${DESKTOP_NAV_MENU_PANEL_CLASS}`}
          role="menu"
          aria-label={node.label}
        >
          {node.pages.map((item) => {
            const active = pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);
            return (
              <Link key={item.href} href={item.href} role="menuitem" className={dropLinkClass(active)}>
                {item.label}
              </Link>
            );
          })}
          {node.children.map((child) => (
            <NavNestedFolderRow key={child.slugPath} node={child} pathname={pathname} />
          ))}
          {!hasInner ? (
            <div className="mx-1 border-t border-slate-200/90 px-2 pt-2">
              <p className="px-2 pb-1 text-xs font-medium text-[#496db3]/70">
                Папка раздела: внутри пока нет пунктов меню.
              </p>
              <Link href={folderHref} role="menuitem" className={dropLinkClass(folderActive)}>
                Открыть адрес раздела
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    ) : null;

  return (
    <div ref={wrapRef} className="relative min-w-0 max-w-full" onMouseEnter={openMenu} onMouseLeave={scheduleClose}>
      <button
        type="button"
        className={`mx-1 flex w-full max-w-full min-w-0 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
          rowActive ? "bg-[#496db3]/12 text-[#496db3]" : "text-[#496db3] hover:bg-slate-100"
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${node.label}: подменю`}
      >
        <span className="min-w-0 whitespace-normal break-words leading-snug">{node.label}</span>
        <ChevronRightMini className="h-4 w-4 shrink-0 opacity-70" />
      </button>
      {flyout ? createPortal(flyout, document.body) : null}
    </div>
  );
}

/**
 * Зазор под кнопкой + «мост» к порталу (hover).
 * PILL_BOTTOM_CLEARANCE — нижний padding капсулы `p-1` (4px), иначе белая пилюля визуально лежит поверх верха панели.
 */
const DESKTOP_DROPDOWN_BRIDGE_PX = 8;
const DESKTOP_DROPDOWN_PILL_BOTTOM_CLEARANCE_PX = 6;
/** Выше шапки (z-50), колонки капсулы (z-120), моб. sheet (60) */
const DESKTOP_DROPDOWN_PORTAL_Z = 10000;
const DESKTOP_NAV_NESTED_FLYOUT_Z = 10050;

function NavbarDesktopDropdown({
  label,
  hubHref,
  hubLabel,
  treeRoot,
  pathname,
}: {
  label: string;
  hubHref: string;
  hubLabel: string;
  treeRoot: SectionMenuNode;
  pathname: string | null;
}) {
  const pillCtx = useContext(DesktopNavPillDropdownContext);
  const pillKey = useMemo(() => `pill:${normalizeContentSlug(hubHref)}`, [hubHref]);
  const menuOpen = pillCtx !== null && pillCtx.activeKey === pillKey;
  const openMenu = useCallback(() => {
    pillCtx?.openPill(pillKey);
  }, [pillCtx, pillKey]);
  /**
   * Важно: когда пользователь быстро переводит курсор между пунктами,
   * курсор может «задеть» ещё видимую панель предыдущего пункта.
   * Панель НЕ должна перехватывать фокус и переоткрывать себя поверх нового пункта.
   */
  const keepOpenIfAlreadyActive = useCallback(() => {
    if (!pillCtx) return;
    if (pillCtx.activeKey !== pillKey) return;
    pillCtx.openPill(pillKey);
  }, [pillCtx, pillKey]);
  const scheduleClose = useCallback(() => {
    pillCtx?.scheduleClosePill(pillKey);
  }, [pillCtx, pillKey]);
  const closeAll = useCallback(() => {
    pillCtx?.closeAllPills();
  }, [pillCtx]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);

  const hubLinkExact = navHubLinkIsExactActive(pathname, hubHref);
  const treeActive = subtreeHasActive(treeRoot, pathname);
  const triggerActive = pathnameIsUnderNavHub(pathname, hubHref) || treeActive;

  const updatePanelPos = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPanelPos({
      top: r.bottom - DESKTOP_DROPDOWN_BRIDGE_PX + DESKTOP_DROPDOWN_PILL_BOTTOM_CLEARANCE_PX,
      left: r.left,
    });
  }, []);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setPanelPos(null);
      return;
    }
    updatePanelPos();
    const ro = new ResizeObserver(() => updatePanelPos());
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("scroll", updatePanelPos, true);
    window.addEventListener("resize", updatePanelPos);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", updatePanelPos, true);
      window.removeEventListener("resize", updatePanelPos);
    };
  }, [menuOpen, updatePanelPos]);

  const menuPanel =
    menuOpen && panelPos && typeof document !== "undefined" ? (
      <div
        className="fixed"
        style={{
          top: panelPos.top,
          left: panelPos.left,
          paddingTop: DESKTOP_DROPDOWN_BRIDGE_PX,
          zIndex: DESKTOP_DROPDOWN_PORTAL_Z,
        }}
        role="presentation"
        onMouseEnter={keepOpenIfAlreadyActive}
        onMouseLeave={scheduleClose}
        onClickCapture={closeAll}
      >
        <div
          role="menu"
          aria-hidden={false}
          aria-label={label}
        >
          <div
            style={DESKTOP_NAV_MENU_PANEL_STYLE}
            className={`overflow-visible rounded-xl bg-white py-1.5 backdrop-blur-sm ${DESKTOP_NAV_MENU_PANEL_CLASS}`}
          >
            <Link href={hubHref} role="menuitem" className={dropLinkClass(hubLinkExact)}>
              {hubLabel}
            </Link>
            {treeRoot.pages.map((item) => {
              const active = pathname === item.href || (pathname?.startsWith(`${item.href}/`) ?? false);
              return (
                <Link key={item.href} href={item.href} role="menuitem" className={dropLinkClass(active)}>
                  {item.label}
                </Link>
              );
            })}
            {treeRoot.children.map((child) => (
              <NavNestedFolderRow key={child.slugPath} node={child} pathname={pathname} />
            ))}
          </div>
        </div>
      </div>
    ) : null;

  return (
    <div
      ref={wrapRef}
      className="relative min-w-0 shrink"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        className={`inline-flex h-9 min-w-0 max-w-[200px] shrink items-center gap-0.5 truncate rounded-full px-3 text-sm font-semibold leading-none transition sm:px-4 ${
          triggerActive
            ? "bg-[#496db3] text-white"
            : "text-[#496db3] hover:bg-slate-100 hover:text-[#3f5f9d]"
        }`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={`${label}: подменю`}
      >
        <span className="min-w-0 whitespace-normal break-words leading-snug">{label}</span>
        <svg
          className="h-4 w-4 shrink-0 opacity-85"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {menuPanel ? createPortal(menuPanel, document.body) : null}
    </div>
  );
}

type SiteNavbarProps = {
  /** Снимок из cookie (layout) — совпадает с SSR и убирает мигание меню */
  initialFolderNavItems?: FolderNavItem[];
  siteSettings?: {
    email: string;
    phone: string;
    address: string;
    social: { vk: string; telegram: string; max: string; whatsapp: string };
    requisites: { companyName: string; inn: string; kpp: string; ogrn: string };
  } | null;
};

type MobileSheetAnimState = {
  enabled: boolean;
  expanded: boolean;
  /** после первого раскрытия — включаем transition при сворачивании */
  wasEverExpanded: boolean;
  rect: { top: number; left: number; width: number; height: number } | null;
};

const MOBILE_SHEET_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

const initialMobileSheetAnim: MobileSheetAnimState = {
  enabled: false,
  expanded: false,
  wasEverExpanded: false,
  rect: null,
};

export function SiteNavbar({ initialFolderNavItems = [], siteSettings = null }: SiteNavbarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const mobileShellRef = useRef<HTMLDivElement>(null);
  /** Чтобы при открытии моб. меню один раз раскрыть раздел и папки до текущего URL */
  const prevOpenForMobileNavExpandRef = useRef(false);
  const [mobileSheetAnim, setMobileSheetAnim] =
    useState<MobileSheetAnimState>(initialMobileSheetAnim);
  /** SSR и первая отрисовка = false — иначе расхождение с сервером и гонки с открытием меню */
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [phoneHovered, setPhoneHovered] = useState(false);
  const [callbackHovered, setCallbackHovered] = useState(false);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const phoneLabel = (siteSettings?.phone || "").trim() || "+7 (495) 123-45-67";
  const emailLabel = (siteSettings?.email || "").trim() || "info@центр-каталогизации.рф";
  const phoneHref = (() => {
    const raw = (siteSettings?.phone || "").trim();
    // Упростим: выкидываем всё кроме цифр и ведущего +.
    const digits = raw.replace(/[^\d+]/g, "");
    return digits ? `tel:${digits}` : "tel:+74951234567";
  })();
  const emailHref = `mailto:${emailLabel}`;
  const [folderNavItems, setFolderNavItems] = useState<NavItem[]>(initialFolderNavItems);
  const [storedFoldersAll, setStoredFoldersAll] = useState<StoredFolderRow[]>([]);
  const [publishedPages, setPublishedPages] = useState<PublishedPageRow[]>([]);
  /** Раскрытые в моб. меню разделы и папки (`msec:…`, `mf:slugPath`) */
  const [mobileNavExpanded, setMobileNavExpanded] = useState<Set<string>>(() => new Set());

  const hidden = useMemo(() => pathname?.startsWith("/admin"), [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 8);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const loadFolderNavItems = useCallback(async () => {
    if (typeof window === "undefined") return;
    const persistCookie = (
      folders: { name: string; slug: string; showInNavbar?: boolean }[],
    ) => {
      try {
        document.cookie = `${NAV_FOLDERS_COOKIE_NAME}=${serializeNavFoldersCookie(folders)}; Path=/; Max-Age=31536000; SameSite=Lax`;
      } catch {
        /* ignore */
      }
    };
    const applyStoredFolders = (
      source: { name: string; slug: string; showInNavbar?: boolean }[],
    ) => {
      const storedForCookie = source.map((f) => ({
        name: f.name,
        slug: normalizeContentSlug(f.slug),
        showInNavbar: Boolean(f.showInNavbar),
      }));
      setStoredFoldersAll(storedForCookie.map((f) => ({ name: f.name, slug: f.slug })));
      const items = storedForCookie
        .filter((f) => f.showInNavbar)
        .map((f) => ({
          href: `/${f.slug}`,
          label: f.name,
        }));
      setFolderNavItems(items);
      persistCookie(storedForCookie);
    };
    try {
      const res = await fetch("/api/pages/folders", { cache: "no-store" });
      if (res.ok) {
        const payload = (await res.json()) as unknown;
        const foldersRaw =
          typeof payload === "object" &&
          payload !== null &&
          Array.isArray((payload as { folders?: unknown[] }).folders)
            ? ((payload as { folders: unknown[] }).folders as unknown[])
            : [];
        const backendFolders = foldersRaw
          .filter((f): f is { name: string; slug: string; showInNavbar?: boolean } => {
            if (typeof f !== "object" || f === null) return false;
            const obj = f as Record<string, unknown>;
            return typeof obj.name === "string" && typeof obj.slug === "string";
          })
          .map((f) => ({
            name: f.name,
            slug: f.slug,
            showInNavbar: Boolean(f.showInNavbar),
          }));
        applyStoredFolders(backendFolders);
        window.localStorage.setItem(CUSTOM_FOLDERS_STORAGE_KEY, JSON.stringify(backendFolders));
        return;
      }
      const raw = window.localStorage.getItem(CUSTOM_FOLDERS_STORAGE_KEY);
      if (!raw) {
        setFolderNavItems([]);
        setStoredFoldersAll([]);
        persistCookie([]);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        setFolderNavItems([]);
        setStoredFoldersAll([]);
        persistCookie([]);
        return;
      }

      const fallback = parsed
        .filter((f): f is { name: string; slug: string; showInNavbar?: boolean } => {
          if (typeof f !== "object" || f === null) return false;
          const obj = f as Record<string, unknown>;
          return typeof obj.name === "string" && typeof obj.slug === "string";
        })
        .map((f) => ({
          name: String(f.name),
          slug: String(f.slug),
          showInNavbar: Boolean(f.showInNavbar),
        }));
      applyStoredFolders(fallback);
    } catch {
      setFolderNavItems([]);
      setStoredFoldersAll([]);
      persistCookie([]);
    }
  }, []);

  const fetchPublishedPages = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const res = await fetch("/api/pages", { cache: "no-store" });
      if (!res.ok) {
        setPublishedPages([]);
        return;
      }
      const data = (await res.json()) as unknown;
      if (Array.isArray(data)) {
        const rows = (data as PublishedPageRow[])
          .filter((p) => p && typeof p.slug === "string" && String(p.slug).trim() !== "")
          .map((p) => ({
            ...p,
            slug: normalizeContentSlug(p.slug),
          }));
        setPublishedPages(rows);
      } else {
        setPublishedPages([]);
      }
    } catch {
      setPublishedPages([]);
    }
  }, []);

  useEffect(() => {
    if (hidden) return;
    void fetchPublishedPages();
  }, [hidden, fetchPublishedPages]);

  useEffect(() => {
    if (hidden) return;
    const onFocus = () => void fetchPublishedPages();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [hidden, fetchPublishedPages]);

  /* localStorage может опережать cookie — подтягиваем до paint; на /admin навбар скрыт — не трогаем LS */
  useLayoutEffect(() => {
    if (pathname?.startsWith("/admin")) return;
    loadFolderNavItems();
  }, [loadFolderNavItems, pathname]);

  useEffect(() => {
    window.addEventListener("storage", loadFolderNavItems);
    window.addEventListener("focus", loadFolderNavItems);
    return () => {
      window.removeEventListener("storage", loadFolderNavItems);
      window.removeEventListener("focus", loadFolderNavItems);
    };
  }, [loadFolderNavItems]);

  useEffect(() => {
    setOpen(false);
    setMobileSheetAnim(initialMobileSheetAnim);
    setMobileNavExpanded(new Set());
  }, [pathname]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsNarrowViewport(mq.matches);
    sync();
    const onChange = () => {
      const narrow = mq.matches;
      setIsNarrowViewport(narrow);
      if (!narrow) {
        setOpen(false);
        setMobileSheetAnim(initialMobileSheetAnim);
        setMobileNavExpanded(new Set());
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const mobileSheetAnimRef = useRef(mobileSheetAnim);
  mobileSheetAnimRef.current = mobileSheetAnim;

  /** true после того как меню хотя бы раз раскрылось — отличает «идёт открытие» от «идёт закрытие» */
  const mobileExpandDoneRef = useRef(false);
  const mobileCollapseTimerRef = useRef<number | null>(null);

  const finalizeMobileMenuClose = useCallback(() => {
    if (mobileCollapseTimerRef.current !== null) {
      window.clearTimeout(mobileCollapseTimerRef.current);
      mobileCollapseTimerRef.current = null;
    }
    mobileExpandDoneRef.current = false;
    setOpen(false);
    setMobileSheetAnim(initialMobileSheetAnim);
    setMobileNavExpanded(new Set());
  }, []);

  /**
   * Сначала анимируем сворачивание (expanded → false), затем finalize по transitionend / таймауту.
   * Мгновенный finalize давал рывок при закрытии.
   */
  const beginMobileMenuClose = useCallback(() => {
    if (!open) return;
    if (!isNarrowViewport || !mobileSheetAnim.enabled) {
      finalizeMobileMenuClose();
      return;
    }
    if (!mobileSheetAnim.expanded) {
      finalizeMobileMenuClose();
      return;
    }
    setMobileSheetAnim((m) => (m.enabled && m.expanded ? { ...m, expanded: false } : m));
  }, [
    open,
    isNarrowViewport,
    mobileSheetAnim.enabled,
    mobileSheetAnim.expanded,
    finalizeMobileMenuClose,
  ]);

  const closeMobileMenu = useCallback(() => {
    beginMobileMenuClose();
  }, [beginMobileMenuClose]);

  const toggleMobileNavExpanded = useCallback((key: string) => {
    setMobileNavExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const openMobileMenu = useCallback(() => {
    if (mobileCollapseTimerRef.current !== null) {
      window.clearTimeout(mobileCollapseTimerRef.current);
      mobileCollapseTimerRef.current = null;
    }
    mobileExpandDoneRef.current = false;
    const el = mobileShellRef.current;
    if (!el) {
      setOpen(true);
      return;
    }
    const r = el.getBoundingClientRect();
    setMobileSheetAnim({
      enabled: true,
      expanded: false,
      wasEverExpanded: false,
      rect: { top: r.top, left: r.left, width: r.width, height: r.height },
    });
    setOpen(true);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    if (open) {
      closeMobileMenu();
      return;
    }
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      openMobileMenu();
    } else {
      setOpen(true);
    }
  }, [open, closeMobileMenu, openMobileMenu]);

  const handleMobileShellTransitionEnd = useCallback(
    (e: TransitionEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return;
      const p = e.propertyName;
      const m = mobileSheetAnimRef.current;
      if (!m.enabled || m.expanded) return;
      /*
        Закрытие: finalize только по геометрии. Раньше срабатывали border-radius (0.38s) —
        панель исчезала до конца анимации width/height/padding → дёрганье.
      */
      if (p !== "width" && p !== "height") return;
      finalizeMobileMenuClose();
    },
    [finalizeMobileMenuClose],
  );

  useLayoutEffect(() => {
    if (mobileSheetAnim.expanded) mobileExpandDoneRef.current = true;
  }, [mobileSheetAnim.expanded]);

  /* Резервное закрытие, если transitionend не пришёл (Safari, dvh и т.п.) */
  useEffect(() => {
    if (!open || !mobileSheetAnim.enabled) {
      if (mobileCollapseTimerRef.current !== null) {
        window.clearTimeout(mobileCollapseTimerRef.current);
        mobileCollapseTimerRef.current = null;
      }
      return;
    }
    if (mobileSheetAnim.expanded) {
      if (mobileCollapseTimerRef.current !== null) {
        window.clearTimeout(mobileCollapseTimerRef.current);
        mobileCollapseTimerRef.current = null;
      }
      return;
    }
    if (!mobileExpandDoneRef.current) return;
    if (mobileCollapseTimerRef.current !== null) return;
    mobileCollapseTimerRef.current = window.setTimeout(() => {
      mobileCollapseTimerRef.current = null;
      finalizeMobileMenuClose();
    }, 520);
  }, [open, mobileSheetAnim.enabled, mobileSheetAnim.expanded, finalizeMobileMenuClose]);

  /* Первое раскрытие после openMobileMenu. Не запускать при сворачивании: там тоже expanded=false, но wasEverExpanded уже true — иначе меню снова разворачивается и не закрывается. */
  useLayoutEffect(() => {
    if (!open || !mobileSheetAnim.enabled || mobileSheetAnim.expanded || !mobileSheetAnim.rect) return;
    if (mobileSheetAnim.wasEverExpanded) return;
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setMobileSheetAnim((m) =>
          m.enabled && !m.expanded && m.rect && !m.wasEverExpanded
            ? { ...m, expanded: true, wasEverExpanded: true }
            : m,
        );
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open, mobileSheetAnim.enabled, mobileSheetAnim.expanded, mobileSheetAnim.rect, mobileSheetAnim.wasEverExpanded]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMobileMenu();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closeMobileMenu]);

  const serviceMenuTree = useMemo(
    () => buildSectionMenuTree("services", publishedPages, storedFoldersAll),
    [publishedPages, storedFoldersAll],
  );

  const articleMenuTree = useMemo(
    () => buildSectionMenuTree("articles", publishedPages, storedFoldersAll),
    [publishedPages, storedFoldersAll],
  );

  const hasServiceMenu =
    serviceMenuTree.pages.length > 0 || serviceMenuTree.children.length > 0;
  const hasArticleMenu =
    articleMenuTree.pages.length > 0 || articleMenuTree.children.length > 0;
  const serviceSectionLabel = useMemo(() => {
    const root = storedFoldersAll.find((f) => normalizeContentSlug(f.slug) === "services");
    return root?.name?.trim() || "Услуги";
  }, [storedFoldersAll]);
  const articleSectionLabel = useMemo(() => {
    const root = storedFoldersAll.find((f) => normalizeContentSlug(f.slug) === "articles");
    return root?.name?.trim() || "Статьи";
  }, [storedFoldersAll]);

  const navPartition = useMemo(() => partitionFolderNavItems(folderNavItems), [folderNavItems]);
  // Always show "Услуги" immediately (avoid appearing a second later after async menu load).
  const showServicesSection = true;
  const showArticlesSection = hasArticleMenu || navPartition.articles.length > 0;
  const otherFolders = useMemo(() => navPartition.other, [navPartition.other]);

  const sectionNavHrefSet = useMemo(() => {
    const s = new Set<string>();
    s.add("/services");
    s.add("/articles");
    for (const x of collectTreeHrefs(serviceMenuTree)) s.add(x);
    for (const x of collectTreeHrefs(articleMenuTree)) s.add(x);
    /* Все URL из деревьев кастомных разделов — чтобы не дублировать дочерние папки отдельными кнопками */
    for (const it of otherFolders) {
      const { tree: tr, hubHref: hub } = resolveNavSectionTree(it, publishedPages, storedFoldersAll);
      s.add(hub.toLowerCase());
      for (const x of collectTreeHrefs(tr)) s.add(x);
    }
    return s;
  }, [otherFolders, publishedPages, storedFoldersAll, serviceMenuTree, articleMenuTree]);

  const otherFoldersFiltered = useMemo(
    () => otherFolders.filter((it) => !sectionNavHrefSet.has(it.href.toLowerCase())),
    [otherFolders, sectionNavHrefSet],
  );

  const otherNavTrees = useMemo(
    () =>
      otherFoldersFiltered.map((item) => {
        const { tree, hubHref } = resolveNavSectionTree(item, publishedPages, storedFoldersAll);
        return { item, tree, hubHref };
      }),
    [otherFoldersFiltered, publishedPages, storedFoldersAll],
  );

  useLayoutEffect(() => {
    if (!isNarrowViewport) {
      prevOpenForMobileNavExpandRef.current = open;
      return;
    }
    const becameOpen = open && !prevOpenForMobileNavExpandRef.current;
    prevOpenForMobileNavExpandRef.current = open;
    if (!becameOpen) return;

    setMobileNavExpanded((prev) => {
      const next = new Set(prev);
      if (subtreeHasActive(serviceMenuTree, pathname)) {
        next.add("msec:services");
        for (const k of collectMobileFolderExpandKeys(serviceMenuTree, pathname)) next.add(k);
      }
      if (subtreeHasActive(articleMenuTree, pathname)) {
        next.add("msec:articles");
        for (const k of collectMobileFolderExpandKeys(articleMenuTree, pathname)) next.add(k);
      }
      for (const { tree, hubHref } of otherNavTrees) {
        if (subtreeHasActive(tree, pathname)) {
          next.add(`msec:other:${hubHref}`);
          for (const k of collectMobileFolderExpandKeys(tree, pathname)) next.add(k);
        }
      }
      return next;
    });
  }, [open, isNarrowViewport, pathname, serviceMenuTree, articleMenuTree, otherNavTrees]);

  const mobileMenuId = "site-navbar-mobile-menu";

  const mobileSheetActive = open && mobileSheetAnim.enabled && isNarrowViewport;

  const mobileShellStyleResolved = useMemo((): CSSProperties | undefined => {
    if (!mobileSheetActive || !mobileSheetAnim.rect) return undefined;
    const r = mobileSheetAnim.rect;
    const box = mobileSheetAnim.expanded
      ? { top: 0, left: 0, width: "100vw", height: "100dvh" as const }
      : r;
    const useTx =
      mobileSheetAnim.rect !== null &&
      (mobileSheetAnim.expanded || mobileSheetAnim.wasEverExpanded);

    const padL = mobileSheetAnim.expanded
      ? "max(1rem, env(safe-area-inset-left))"
      : "0px";
    const padR = mobileSheetAnim.expanded
      ? "max(1rem, env(safe-area-inset-right))"
      : "0px";

    return {
      position: "fixed",
      boxSizing: "border-box",
      /* Выше подложки (40); тени пунктов не «прячутся» под соседними слоями */
      zIndex: 75,
      top: box.top,
      left: box.left,
      width: box.width,
      height: box.height,
      maxHeight: mobileSheetAnim.expanded ? "100dvh" : undefined,
      paddingLeft: padL,
      paddingRight: padR,
      borderBottomLeftRadius: mobileSheetAnim.expanded ? 0 : 28,
      borderBottomRightRadius: mobileSheetAnim.expanded ? 0 : 28,
      borderTopLeftRadius: mobileSheetAnim.expanded ? 0 : undefined,
      borderTopRightRadius: mobileSheetAnim.expanded ? 0 : undefined,
      backgroundColor: "rgba(255,255,255,0.98)",
      backdropFilter: "blur(10px)",
      WebkitBackdropFilter: "blur(10px)",
      boxShadow: mobileSheetAnim.expanded ? "0 0 48px rgba(73, 109, 179, 0.12)" : undefined,
      /* hidden режет box-shadow дочерних; при полном меню оставляем вертикальный клип через flex + scroll внутри */
      overflow: mobileSheetAnim.expanded ? "visible" : "hidden",
      display: "flex",
      flexDirection: "column",
      transition: useTx
        ? `top 0.42s ${MOBILE_SHEET_EASE}, left 0.42s ${MOBILE_SHEET_EASE}, width 0.42s ${MOBILE_SHEET_EASE}, height 0.42s ${MOBILE_SHEET_EASE}, padding 0.42s ${MOBILE_SHEET_EASE}, border-bottom-left-radius 0.38s ease, border-bottom-right-radius 0.38s ease, box-shadow 0.38s ease`
        : "none",
    };
  }, [mobileSheetActive, mobileSheetAnim]);

  const mobileShellClassName = [
    "overflow-hidden md:overflow-visible",
    !mobileSheetActive && "mx-auto max-w-[1200px] transition-all duration-300 ease-out",
    !mobileSheetActive &&
      (scrolled
        ? "translate-y-0 bg-white/95 shadow-md backdrop-blur"
        : "-translate-y-1 bg-transparent shadow-none"),
    mobileSheetActive && "shadow-md",
  ]
    .filter(Boolean)
    .join(" ");

  const mobileShellComputedStyle: CSSProperties =
    mobileSheetActive && mobileShellStyleResolved
      ? mobileShellStyleResolved
      : { borderBottomLeftRadius: 28, borderBottomRightRadius: 28 };

  if (hidden) return null;

  return (
    <header className="sticky top-0 z-50">
      <div className="relative z-50 px-4 sm:px-6 lg:px-10">
        <div
          ref={mobileShellRef}
          className={mobileShellClassName}
          style={mobileShellComputedStyle}
          onTransitionEnd={mobileSheetActive ? handleMobileShellTransitionEnd : undefined}
          role={mobileSheetActive && mobileSheetAnim.expanded ? "dialog" : undefined}
          aria-modal={mobileSheetActive && mobileSheetAnim.expanded ? true : undefined}
          aria-label={mobileSheetActive && mobileSheetAnim.expanded ? "Меню сайта" : undefined}
        >
          <nav
            className={`relative mx-auto flex w-full shrink-0 items-center gap-2 px-3 py-2 sm:gap-3 sm:px-4 md:min-h-0 md:items-center ${
              open && isNarrowViewport
                ? "z-[90] bg-white/95 backdrop-blur-sm md:z-auto md:bg-transparent md:backdrop-blur-none"
                : ""
            }`}
            aria-label="Основное меню"
          >
            <div
              className={`flex min-w-0 flex-1 items-center md:items-stretch ${
                open && isNarrowViewport ? "relative z-[90] min-h-11" : ""
              }`}
            >
              <Link
                href="/"
                className="inline-flex min-w-0 max-w-full shrink items-center text-[14px] font-semibold tracking-tight text-[#496db3]"
              >
                <span
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center sm:h-10 sm:w-10"
                  style={{ marginRight: 3 }}
                >
                  <img
                    src="/logo_1.svg"
                    alt="Логотип Центра каталогизации и анализа данных"
                    className="h-9 w-9 object-contain sm:h-10 sm:w-10 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.08))_drop-shadow(0_2px_4px_rgba(0,0,0,0.06))]"
                  />
                </span>
                <span
                  aria-hidden="true"
                  className="inline-flex h-9 w-[2px] shrink-0 items-center justify-center sm:h-10"
                  style={{ marginLeft: 3, marginRight: 3 }}
                >
                  <svg width="2" height="32" viewBox="0 0 2 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="2" height="32" rx="1" fill="#496db3" />
                  </svg>
                </span>
                <span
                  className="flex min-w-0 flex-col items-start justify-center text-left uppercase leading-[0.86]"
                  style={{
                    marginLeft: 3,
                    fontWeight: 950,
                    fontSize: "clamp(9px, 2.85vw, 13px)",
                    textShadow:
                      "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor",
                  }}
                >
                  <span className="block w-max max-w-full leading-none">ЦЕНТР КАТАЛОГИЗАЦИИ</span>
                  <span className="block w-max max-w-full leading-none">И АНАЛИЗА ДАННЫХ</span>
                </span>
              </Link>
            </div>

            <div className="relative z-[120] hidden min-h-0 min-w-0 flex-1 justify-center md:flex md:items-center">
              {/*
                Нельзя overflow-x-auto на этом блоке: в CSS это ломает overflow-y:visible
                и обрезает absolute-дропдауны + плывёт активная «капсула».
              */}
              <DesktopNavPillDropdownProvider>
                <div className="flex min-w-0 max-w-full flex-col items-center">
                  <div className="flex min-w-0 max-w-full flex-nowrap items-center gap-1 rounded-full border border-[#496db3] bg-white p-1 shadow-sm backdrop-blur">
                  <Link
                    href="/"
                    className={desktopPillLinkClass(pathname === "/")}
                  >
                    Главная
                  </Link>

                  {showServicesSection ? (
                    hasServiceMenu ? (
                      <NavbarDesktopDropdown
                        label={serviceSectionLabel}
                        hubHref="/services"
                        hubLabel={`Все ${serviceSectionLabel.toLowerCase()}`}
                        treeRoot={serviceMenuTree}
                        pathname={pathname}
                      />
                    ) : (
                      <Link
                        href="/services"
                        className={desktopPillLinkClass(
                          pathname === "/services" || Boolean(pathname?.startsWith("/services/")),
                        )}
                      >
                        {serviceSectionLabel}
                      </Link>
                    )
                  ) : null}

                  {showArticlesSection ? (
                    <Link
                      href="/articles"
                      className={desktopPillLinkClass(
                        pathname === "/articles" || Boolean(pathname?.startsWith("/articles/")),
                      )}
                    >
                      {articleSectionLabel}
                    </Link>
                  ) : null}

                  {otherNavTrees.map(({ item, tree, hubHref }) => {
                    const hasSub = tree.pages.length > 0 || tree.children.length > 0;
                    const active =
                      pathname === hubHref || Boolean(pathname?.startsWith(`${hubHref}/`));
                    if (!hasSub) {
                      return (
                        <Link key={hubHref} href={hubHref} className={desktopPillLinkClass(active)}>
                          {item.label}
                        </Link>
                      );
                    }
                    return (
                      <NavbarDesktopDropdown
                        key={hubHref}
                        label={item.label}
                        hubHref={hubHref}
                        hubLabel={`${item.label} — раздел`}
                        treeRoot={tree}
                        pathname={pathname}
                      />
                    );
                  })}

                  <Link
                    href="/contacts"
                    className={desktopPillLinkClass(
                      pathname === "/contacts" || Boolean(pathname?.startsWith("/contacts/")),
                    )}
                  >
                    Контакты
                  </Link>
                  </div>
                </div>
              </DesktopNavPillDropdownProvider>
            </div>

            <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 md:flex">
              <a
                href={phoneHref}
                className="whitespace-nowrap tracking-tight transition-colors"
                onMouseEnter={() => setPhoneHovered(true)}
                onMouseLeave={() => setPhoneHovered(false)}
                style={{
                  color: phoneHovered ? "#e53935" : "#496db3",
                  fontSize: "20px",
                  lineHeight: 1.15,
                  fontWeight: 900,
                  textShadow:
                    "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor",
                }}
              >
                {phoneLabel}
              </a>
              <button
                type="button"
                className="inline-flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold text-white transition"
                onMouseEnter={() => setCallbackHovered(true)}
                onMouseLeave={() => setCallbackHovered(false)}
                onClick={() => setCallbackModalOpen(true)}
                style={{ backgroundColor: callbackHovered ? "#e53935" : "#496db3" }}
              >
                Обратный звонок
              </button>
            </div>

            <button
              type="button"
              className={`ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#496db3]/35 bg-white text-[#496db3] shadow-sm transition outline-none hover:border-[#496db3]/55 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[#496db3]/30 focus-visible:shadow-[0_0_14px_rgba(73,109,179,0.22)] md:hidden ${
                open && isNarrowViewport ? "relative z-[90]" : ""
              }`}
              onClick={toggleMobileMenu}
              aria-expanded={open}
              aria-controls={mobileMenuId}
              aria-label={open ? "Закрыть меню" : "Открыть меню"}
            >
              {open ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden className="shrink-0">
                  <path
                    d="M5 7h14M5 12h14M5 17h14"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          </nav>

          {open && isNarrowViewport ? (
            <div
              className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col"
              style={{
                /* Горизонтальные поля даёт shell (как у обёртки header), иначе дублирование и сдвиг пунктов */
                paddingBottom: mobileSheetAnim.expanded ? "max(0.75rem, env(safe-area-inset-bottom))" : undefined,
                opacity: mobileSheetAnim.expanded ? 1 : 0,
                /* без задержки — иначе «дёргается» относительно раскрытия shell */
                transition: "opacity 0.36s ease",
                pointerEvents: mobileSheetAnim.expanded ? "auto" : "none",
              }}
            >
              <div
                id={mobileMenuId}
                className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain py-2 px-4"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <p className="mb-2 text-[12px] font-medium leading-snug text-[#496db3]/70">
                  Нажмите на раздел, чтобы раскрыть подпункты.
                </p>
                <div className="flex flex-col gap-0.5">
                  <Link
                    href="/"
                    onClick={beginMobileMenuClose}
                    className={mobileNavLinkRowClass(pathname === "/")}
                  >
                    <span className="break-words">Главная</span>
                  </Link>

                  {showServicesSection ? (
                    hasServiceMenu ? (
                      <MobileNavSection
                        sectionKey="msec:services"
                        title={serviceSectionLabel}
                        hubHref="/services"
                        hubLabel={`Все ${serviceSectionLabel.toLowerCase()}`}
                        tree={serviceMenuTree}
                        pathname={pathname}
                        onClose={beginMobileMenuClose}
                        expanded={mobileNavExpanded}
                        onToggle={toggleMobileNavExpanded}
                      />
                    ) : (
                      <Link
                        href="/services"
                        onClick={beginMobileMenuClose}
                        className={mobileNavLinkRowClass(
                          pathname === "/services" || Boolean(pathname?.startsWith("/services/")),
                        )}
                      >
                        <span className="break-words">{serviceSectionLabel}</span>
                      </Link>
                    )
                  ) : null}

                  {showArticlesSection ? (
                    <Link
                      href="/articles"
                      onClick={beginMobileMenuClose}
                      className={mobileNavLinkRowClass(
                        pathname === "/articles" || Boolean(pathname?.startsWith("/articles/")),
                      )}
                    >
                      <span className="break-words">{articleSectionLabel}</span>
                    </Link>
                  ) : null}

                  {otherNavTrees.map(({ item, tree, hubHref }) => {
                    const hasSub = tree.pages.length > 0 || tree.children.length > 0;
                    if (!hasSub) {
                      const active =
                        pathname === hubHref || Boolean(pathname?.startsWith(`${hubHref}/`));
                      return (
                        <Link
                          key={hubHref}
                          href={hubHref}
                          onClick={beginMobileMenuClose}
                          className={mobileNavLinkRowClass(active)}
                        >
                          <span className="break-words">{item.label}</span>
                        </Link>
                      );
                    }
                    return (
                      <MobileNavSection
                        key={hubHref}
                        sectionKey={`msec:other:${hubHref}`}
                        title={item.label}
                        hubHref={hubHref}
                        hubLabel={`${item.label} — раздел`}
                        tree={tree}
                        pathname={pathname}
                        onClose={beginMobileMenuClose}
                        expanded={mobileNavExpanded}
                        onToggle={toggleMobileNavExpanded}
                      />
                    );
                  })}

                  <Link
                    href="/contacts"
                    onClick={beginMobileMenuClose}
                    className={mobileNavLinkRowClass(
                      pathname === "/contacts" || Boolean(pathname?.startsWith("/contacts/")),
                    )}
                  >
                    <span className="break-words">Контакты</span>
                  </Link>
                </div>
              </div>
              <div className="shrink-0 border-t border-[#496db3]/15 pt-3">
                <a
                  href={phoneHref}
                  className="mx-auto flex min-h-12 w-fit items-center justify-center rounded-xl px-3 text-center whitespace-nowrap tracking-tight text-[#496db3] transition outline-none hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#496db3]/30 focus-visible:ring-inset focus-visible:shadow-[0_0_14px_rgba(73,109,179,0.22)]"
                  style={{
                    fontSize: "20px",
                    lineHeight: 1.15,
                    fontWeight: 900,
                    textShadow:
                      "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor",
                  }}
                  onClick={beginMobileMenuClose}
                >
                  {phoneLabel}
                </a>
                <a
                  href={emailHref}
                  className="mx-auto mt-0.5 flex min-h-10 w-fit items-center justify-center rounded-xl px-3 text-center text-[14px] font-semibold text-[#496db3] transition outline-none hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[#496db3]/30 focus-visible:ring-inset focus-visible:shadow-[0_0_14px_rgba(73,109,179,0.22)]"
                  onClick={beginMobileMenuClose}
                >
                  {emailLabel}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    beginMobileMenuClose();
                    setCallbackModalOpen(true);
                  }}
                  className="mt-2 flex min-h-12 w-full items-center justify-center rounded-full text-sm font-semibold text-white transition outline-none focus-visible:ring-2 focus-visible:ring-[#496db3]/35 focus-visible:shadow-[0_0_14px_rgba(73,109,179,0.22)]"
                  style={{ backgroundColor: "#496db3" }}
                >
                  Обратный звонок
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {open && isNarrowViewport ? (
        <button
          type="button"
          className="fixed inset-0 z-40 border-0 bg-slate-900/30 p-0 backdrop-blur-[2px] md:hidden"
          aria-label="Закрыть меню"
          onClick={closeMobileMenu}
        />
      ) : null}
      <CallbackRequestModal open={callbackModalOpen} onClose={() => setCallbackModalOpen(false)} />
    </header>
  );
}

