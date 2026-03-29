"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircleIcon } from "@heroicons/react/20/solid";
import type { ServiceListItem, ServiceTreeNode } from "@/lib/serviceTree";

function ServiceHubCard({
  title,
  description,
  preview,
  previewAlt,
  children,
}: {
  title: ReactNode;
  description?: string;
  preview?: string | null;
  previewAlt: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="service-row-grid items-stretch">
        <div className="min-w-0">
          <div className="w-full overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200">
            {preview?.trim() ? (
              <img
                src={preview}
                alt={previewAlt}
                className="block h-auto w-full object-contain p-3"
              />
            ) : (
              <div className="flex min-h-[10rem] w-full items-center justify-center px-3 py-8 text-center text-[12px] font-semibold text-slate-400">
                Нет изображения
              </div>
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 pr-4 lg:pr-10">
          <h2 className="text-balance text-[22px] font-black leading-[1.15] tracking-tight text-[#496db3]">
            {title}
          </h2>
          {description?.trim() ? (
            <p className="mt-3 max-w-none text-[14px] font-semibold leading-[1.65] text-[#496db3] whitespace-pre-wrap">
              {description}
            </p>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}

export function ServicesFolderPublicTree({ node, depth = 0 }: { node: ServiceTreeNode; depth?: number }) {
  const hasContent = node.pages.length > 0 || node.children.length > 0 || Boolean(node.isMetaFolder);
  if (!hasContent) return null;

  return (
    <>
      <div className={depth === 0 ? "space-y-6" : "space-y-2"}>
        {depth > 0 ? (
          <ServiceHubCard
            title={node.label}
            description={node.description}
            preview={node.preview}
            previewAlt={node.label}
          >
            {node.pages.length > 0 ? (
              <>
                <p className="mt-5 text-[12px] font-semibold leading-snug text-[#496db3]/70">
                  Выберите ниже интересующую вас услугу.
                </p>
                <ul
                  role="list"
                  className="mt-3 grid grid-cols-1 gap-x-10 gap-y-3 text-[14px] font-semibold leading-[1.4] text-[#496db3] sm:grid-cols-2"
                >
                  {node.pages.map((page: ServiceListItem) => (
                    <li key={page.id} className="flex items-start gap-3">
                      <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#496db3]" />
                      <Link href={`/${page.slug}`} className="min-w-0 flex-1 transition-colors hover:text-[#e53935]">
                        {page.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-semibold text-slate-500">
                Скоро добавим услуги в этот раздел.
              </div>
            )}
          </ServiceHubCard>
        ) : (
          node.pages.length > 0 && (
            <div className="space-y-6">
              {node.pages.map((page: ServiceListItem) => (
                <ServiceHubCard
                  key={page.id}
                  title={
                    <Link href={`/${page.slug}`} className="text-[#496db3] transition-colors hover:text-[#e53935]">
                      {page.title}
                    </Link>
                  }
                  description={page.description ?? undefined}
                  preview={page.preview}
                  previewAlt={page.title}
                >
                  <p className="mt-5 text-[12px] font-semibold leading-snug text-[#496db3]/70">
                    Откройте страницу услуги, чтобы прочитать полное описание.
                  </p>
                  <div className="mt-4">
                    <Link
                      href={`/${page.slug}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#496db3] px-5 py-3 text-[14px] font-semibold text-white transition hover:brightness-105"
                    >
                      Перейти на страницу
                    </Link>
                  </div>
                </ServiceHubCard>
              ))}
            </div>
          )
        )}

        {node.children.length > 0 ? (
          <div className={depth === 0 ? "space-y-6" : "pl-3 space-y-3"}>
            {node.children.map((child) => (
              <ServicesFolderPublicTree key={child.slugPath} node={child} depth={depth + 1} />
            ))}
          </div>
        ) : null}
      </div>
      <style>{`
        .service-row-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 2rem;
        }
        @media (min-width: 900px) {
          .service-row-grid {
            grid-template-columns: 3fr 7fr;
            align-items: stretch;
          }
        }
      `}</style>
    </>
  );
}
