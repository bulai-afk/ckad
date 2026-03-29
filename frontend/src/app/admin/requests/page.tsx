 "use client";

import { useEffect, useMemo, useState } from "react";
import { TrashIcon } from "@heroicons/react/24/outline";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { apiGet } from "@/lib/api";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

type FeedbackRequestRow = {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  phone?: string;
  email?: string;
  createdAt?: string;
};

export default function AdminRequestsPage() {
  const [rows, setRows] = useState<FeedbackRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void apiGet<{ requests?: FeedbackRequestRow[] }>("/api/feedback/requests")
      .then((data) => {
        if (cancelled) return;
        setRows(Array.isArray(data?.requests) ? data.requests : []);
      })
      .catch(() => {
        if (cancelled) return;
        setRows([]);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const normalized = useMemo(() => {
    return rows.map((r) => {
      const firstName = (r.firstName || "").trim();
      const lastName = (r.lastName || "").trim();
      if (firstName || lastName) {
        return {
          ...r,
          firstName: firstName || "—",
          lastName: lastName || "—",
          phone: (r.phone || "").trim() || "—",
          email: (r.email || "").trim() || "—",
        };
      }
      const full = (r.name || "").trim();
      const parts = full.split(/\s+/).filter(Boolean);
      return {
        ...r,
        firstName: parts[0] || "—",
        lastName: parts.slice(1).join(" ") || "—",
        phone: (r.phone || "").trim() || "—",
        email: (r.email || "").trim() || "—",
      };
    });
  }, [rows]);

  const allChecked = normalized.length > 0 && normalized.every((r) => selectedIds.includes(r.id));

  async function deleteSelected() {
    if (selectedIds.length === 0 || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`${apiBaseUrl()}/api/feedback/requests`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (!res.ok) return;
      const data = (await res.json().catch(() => ({}))) as { requests?: FeedbackRequestRow[] };
      setRows(Array.isArray(data?.requests) ? data.requests : []);
      setSelectedIds([]);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="flex min-h-0 h-screen flex-1 flex-col overflow-hidden lg:ml-64">
          <AdminTopBar />

          <main className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-medium text-slate-900">Страница заявок</div>
                <p className="mt-2 text-sm text-slate-600">
                  Заявки с форм обратной связи со всего сайта.
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-end">
                  {selectedIds.length > 0 ? (
                    <button
                      type="button"
                      onClick={deleteSelected}
                      disabled={deleting}
                      className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                      {deleting ? "Удаляем..." : "Удалить"}
                    </button>
                  ) : null}
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="w-10 px-3 py-2 font-semibold">
                          <input
                            type="checkbox"
                            checked={allChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(normalized.map((r) => r.id));
                                return;
                              }
                              setSelectedIds([]);
                            }}
                            aria-label="Выбрать все заявки"
                          />
                        </th>
                        <th className="px-3 py-2 font-semibold">Имя</th>
                        <th className="px-3 py-2 font-semibold">Фамилия</th>
                        <th className="px-3 py-2 font-semibold">Телефон</th>
                        <th className="px-3 py-2 font-semibold">E-mail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td className="px-3 py-3 text-slate-500" colSpan={5}>
                            Загрузка...
                          </td>
                        </tr>
                      ) : normalized.length === 0 ? (
                        <tr>
                          <td className="px-3 py-3 text-slate-500" colSpan={5}>
                            Пока нет заявок.
                          </td>
                        </tr>
                      ) : (
                        normalized.map((row) => (
                          <tr key={row.id} className="border-b border-slate-100 text-slate-800">
                            <td className="px-3 py-2">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(row.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedIds((prev) => [...prev, row.id]);
                                    return;
                                  }
                                  setSelectedIds((prev) => prev.filter((id) => id !== row.id));
                                }}
                                aria-label={`Выбрать заявку ${row.firstName ?? ""} ${row.lastName ?? ""}`}
                              />
                            </td>
                            <td className="px-3 py-2">{row.firstName}</td>
                            <td className="px-3 py-2">{row.lastName}</td>
                            <td className="px-3 py-2">{row.phone}</td>
                            <td className="px-3 py-2">{row.email}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
