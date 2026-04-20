"use client";

import { useSyncViewportHeightCssVars } from "@/hooks/useSyncViewportHeightCssVars";

/** Клиентский синк высоты viewport в CSS-переменные :root (--vh, --vh-visual, …). */
export function ViewportHeightSync() {
  useSyncViewportHeightCssVars();
  return null;
}
