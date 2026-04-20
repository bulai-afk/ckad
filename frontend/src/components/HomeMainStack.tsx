import type { ReactNode } from "react";

/** Колонка max-w для блоков главной (хиро выведен отдельно на полную ширину в `page.tsx`). */
export function HomeMainStack({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">{children}</div>
  );
}
