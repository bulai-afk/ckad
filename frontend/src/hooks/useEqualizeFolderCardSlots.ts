import { useLayoutEffect, type RefObject } from "react";

const SLOT = "[data-folder-card-slot]";

function getSlots(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(SLOT)];
}

function participatingSlots(all: HTMLElement[]): HTMLElement[] {
  return all.filter((el) => !el.hasAttribute("data-carousel-equalize-skip"));
}

/**
 * max(height) считается только по **видимому ряду** (`data-carousel-equalize-skip` снят),
 * но **одна и та же** высота задаётся **всем** слотам — иначе «буферная» высокая карточка
 * тянет весь трек и визуально конфликтует с рядом 206px (мигание).
 *
 * Жёсткий проход (со сбросом inline height) — смена слайда, resize, загрузка шрифтов/картинок.
 * Мягкий — только ResizeObserver на корне: без сброса, без мигания.
 */
export function useEqualizeFolderCardSlots(
  containerRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  depsKey: string,
) {
  useLayoutEffect(() => {
    if (!enabled) return;

    const root = containerRef.current;
    if (!root) return;

    let cancelled = false;
    let raf = 0;
    let debounceMo = 0;
    let runRafScheduled = false;
    let suppressRootRoUntil = 0;
    const imgListeners: { el: HTMLImageElement; fn: () => void }[] = [];

    const bindImageLoads = () => {
      imgListeners.forEach(({ el, fn }) => el.removeEventListener("load", fn));
      imgListeners.length = 0;
      [...root.querySelectorAll("img")].forEach((node) => {
        const el = node as HTMLImageElement;
        if (!el.complete) {
          const fn = () => scheduleHard();
          el.addEventListener("load", fn, { once: true });
          imgListeners.push({ el, fn });
        }
      });
    };

    const applyHeightToAllSlots = (maxPx: number) => {
      getSlots(root).forEach((el) => {
        el.style.boxSizing = "border-box";
        el.style.height = `${maxPx}px`;
        el.style.minHeight = `${maxPx}px`;
      });
      suppressRootRoUntil = performance.now() + 160;
    };

    const measureAndApply = (hard: boolean) => {
      if (cancelled) return;

      if (hard) {
        getSlots(root).forEach((el) => {
          el.style.height = "";
          el.style.minHeight = "";
        });
        void root.offsetHeight;
      }

      const finish = () => {
        if (cancelled) return;
        const all = getSlots(root);
        const els = participatingSlots(all);
        if (els.length < 2) {
          bindImageLoads();
          return;
        }

        const raw = els.map((el) => el.offsetHeight);
        const maxPx = Math.max(0, ...raw);
        if (maxPx <= 0) {
          bindImageLoads();
          return;
        }

        applyHeightToAllSlots(maxPx);
        bindImageLoads();
      };

      cancelAnimationFrame(raf);
      if (hard) {
        raf = requestAnimationFrame(() => {
          requestAnimationFrame(finish);
        });
      } else {
        raf = requestAnimationFrame(finish);
      }
    };

    const runHard = () => {
      const ready = document.fonts?.ready;
      if (ready && typeof ready.then === "function") {
        void ready.then(() => measureAndApply(true)).catch(() => measureAndApply(true));
      } else {
        measureAndApply(true);
      }
    };

    const runSoft = () => {
      measureAndApply(false);
    };

    const scheduleHard = () => {
      if (cancelled || runRafScheduled) return;
      runRafScheduled = true;
      requestAnimationFrame(() => {
        runRafScheduled = false;
        if (!cancelled) runHard();
      });
    };

    const scheduleSoftFromRootRo = () => {
      if (performance.now() < suppressRootRoUntil) return;
      if (cancelled || runRafScheduled) return;
      runRafScheduled = true;
      requestAnimationFrame(() => {
        runRafScheduled = false;
        if (!cancelled) runSoft();
      });
    };

    runHard();
    bindImageLoads();

    const roRoot = new ResizeObserver(() => scheduleSoftFromRootRo());
    roRoot.observe(root);

    const mo = new MutationObserver(() => {
      window.clearTimeout(debounceMo);
      debounceMo = window.setTimeout(() => scheduleHard(), 50);
    });
    mo.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-carousel-equalize-skip", "class"],
    });

    window.addEventListener("resize", scheduleHard);
    const t0 = window.setTimeout(scheduleHard, 0);
    const t1 = window.setTimeout(scheduleHard, 150);
    const t2 = window.setTimeout(scheduleHard, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceMo);
      cancelAnimationFrame(raf);
      roRoot.disconnect();
      mo.disconnect();
      imgListeners.forEach(({ el, fn }) => el.removeEventListener("load", fn));
      window.removeEventListener("resize", scheduleHard);
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      getSlots(root).forEach((el) => {
        el.style.height = "";
        el.style.minHeight = "";
      });
    };
  }, [enabled, depsKey]);
}
