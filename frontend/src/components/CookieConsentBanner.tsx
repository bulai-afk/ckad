"use client";

import { useEffect, useState } from "react";
import { PrivacyPolicyDialogLink } from "@/components/PrivacyPolicyDialogLink";
import {
  COOKIE_CONSENT_STORAGE_KEY,
  grantCookieConsent,
} from "@/lib/cookieConsent";

export function CookieConsentBanner() {
  const [open, setOpen] = useState(false);
  const [slideIn, setSlideIn] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)) return;
    } catch {
      return;
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setSlideIn(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  function onAccept() {
    grantCookieConsent();
    setSlideIn(false);
    window.setTimeout(() => setOpen(false), 320);
  }

  if (!open) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[9500] flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]"
      role="region"
      aria-label="Уведомление об использовании cookie"
    >
      <div
        className={`pointer-events-auto w-full max-w-3xl rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3.5 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-sm transition-[transform,opacity] duration-300 ease-out motion-reduce:!translate-y-0 motion-reduce:!opacity-100 motion-reduce:transition-none ${
          slideIn ? "translate-y-0 opacity-100" : "translate-y-[120%] opacity-95"
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="min-w-0 text-pretty text-sm leading-snug text-slate-700 sm:text-[0.9375rem] sm:leading-snug">
            Оставаясь на сайте, вы даёте согласие на обработку cookie и других данных в соответствии с{" "}
            <PrivacyPolicyDialogLink className="font-semibold text-[#496db3] underline decoration-[#496db3]/40 underline-offset-2 hover:text-red-600" />
            .
          </p>
          <button
            type="button"
            onClick={onAccept}
            className="shrink-0 rounded-full bg-[#496db3] px-5 py-2 text-sm font-semibold text-white shadow-sm outline-none transition hover:bg-[#3d5ca0] focus-visible:ring-2 focus-visible:ring-[#496db3] focus-visible:ring-offset-2"
          >
            Хорошо
          </button>
        </div>
      </div>
    </div>
  );
}
