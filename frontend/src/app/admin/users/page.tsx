"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { AdminSidebar } from "@/components/admin/Sidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { apiGet, formatApiErrorForUi } from "@/lib/api";

type UserRole = "ADMIN" | "EDITOR";

type UserRow = {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt: string;
};

type UserFormState = {
  email: string;
  name: string;
  role: UserRole;
  password: string;
};

const emptyForm: UserFormState = {
  email: "",
  name: "",
  role: "EDITOR",
  password: "",
};

function roleLabel(role: UserRole): string {
  return role === "ADMIN" ? "Администратор" : "Редактор";
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function parseApiError(bodyText: string, fallback: string): string {
  try {
    const data = JSON.parse(bodyText) as { error?: unknown };
    const code = typeof data.error === "string" ? data.error : "";
    if (code === "email_already_exists") return "Пользователь с таким логином уже есть.";
    if (code === "email_and_password_required") return "Укажите логин и пароль.";
    if (code === "password_too_short") return "Пароль должен быть не короче 4 символов.";
    if (code === "cannot_delete_last_user") return "Нельзя удалить единственного пользователя.";
    if (code === "cannot_delete_last_admin") return "Нельзя удалить последнего администратора.";
    if (code === "user_has_pages") return "У пользователя есть страницы — сначала переназначьте автора.";
    if (code) return code;
  } catch {
    /* fallback */
  }
  return fallback;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [tone, setTone] = useState<"success" | "error">("success");

  const inputClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/20";
  const labelClass = "text-xs font-semibold text-slate-700";

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ users?: UserRow[] }>("/api/users");
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch {
      setUsers([]);
      setTone("error");
      setMsg("Не удалось загрузить список пользователей.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function openCreateModal() {
    setEditingUser(null);
    setForm(emptyForm);
    setMsg(null);
    setModalOpen(true);
  }

  function openEditModal(user: UserRow) {
    setEditingUser(user);
    setForm({
      email: user.email,
      name: user.name ?? "",
      role: user.role,
      password: "",
    });
    setMsg(null);
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingUser(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const email = form.email.trim();
    const name = form.name.trim();
    const password = form.password.trim();

    if (!email) {
      setTone("error");
      setMsg("Укажите логин.");
      return;
    }

    if (!editingUser && !password) {
      setTone("error");
      setMsg("Укажите пароль для нового пользователя.");
      return;
    }

    setSaving(true);
    setMsg(null);

    try {
      const payload: Record<string, string> = {
        email,
        name,
        role: form.role,
      };
      if (password) payload.password = password;

      const res = await fetch(
        editingUser ? `/api/users/${editingUser.id}` : "/api/users",
        {
          method: editingUser ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const text = await res.text();
      if (!res.ok) {
        setTone("error");
        setMsg(parseApiError(text, formatApiErrorForUi(null, "Не удалось сохранить пользователя.")));
        return;
      }

      const data = text ? (JSON.parse(text) as { user?: UserRow }) : {};
      if (data.user) {
        setUsers((prev) => {
          if (editingUser) {
            return prev.map((u) => (u.id === data.user!.id ? data.user! : u));
          }
          return [...prev, data.user!].sort((a, b) => a.id - b.id);
        });
      } else {
        await loadUsers();
      }

      setTone("success");
      setMsg(editingUser ? "Пользователь обновлён." : "Пользователь создан.");
      setModalOpen(false);
      setEditingUser(null);
      setForm(emptyForm);
    } catch {
      setTone("error");
      setMsg("Не удалось сохранить пользователя.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user: UserRow) {
    if (deletingId !== null) return;
    const confirmed = window.confirm(
      `Удалить пользователя «${user.email}»? Это действие нельзя отменить.`,
    );
    if (!confirmed) return;

    setDeletingId(user.id);
    setMsg(null);

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const text = await res.text();
      if (!res.ok) {
        setTone("error");
        setMsg(parseApiError(text, "Не удалось удалить пользователя."));
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setTone("success");
      setMsg("Пользователь удалён.");
    } catch {
      setTone("error");
      setMsg("Не удалось удалить пользователя.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex min-h-screen">
        <AdminSidebar />

        <div className="flex h-screen min-h-0 flex-1 flex-col overflow-hidden lg:ml-64">
          <AdminTopBar />

          <main className="flex-1 overflow-y-auto p-6">
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="text-sm font-medium text-slate-900">Пользователи</div>
                <p className="mt-2 text-sm text-slate-600">
                  Учётные записи для входа в админку. Демо-пользователь и остальные аккаунты
                  хранятся в базе данных.
                </p>
              </div>

              {msg ? (
                <div
                  className={`rounded-xl border px-4 py-3 text-sm ${
                    tone === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {msg}
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={openCreateModal}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#496db3] px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-105"
                  >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Добавить пользователя
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-slate-600">
                        <th className="px-3 py-2 font-semibold">Логин</th>
                        <th className="px-3 py-2 font-semibold">Имя</th>
                        <th className="px-3 py-2 font-semibold">Роль</th>
                        <th className="px-3 py-2 font-semibold">Создан</th>
                        <th className="w-28 px-3 py-2 font-semibold">Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td className="px-3 py-3 text-slate-500" colSpan={5}>
                            Загрузка...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td className="px-3 py-3 text-slate-500" colSpan={5}>
                            Пока нет пользователей. Запустите миграцию с демо-аккаунтом или
                            добавьте первого вручную.
                          </td>
                        </tr>
                      ) : (
                        users.map((user) => (
                          <tr key={user.id} className="border-b border-slate-100 text-slate-800">
                            <td className="px-3 py-2 font-medium">{user.email}</td>
                            <td className="px-3 py-2">{user.name?.trim() || "—"}</td>
                            <td className="px-3 py-2">{roleLabel(user.role)}</td>
                            <td className="px-3 py-2 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(user)}
                                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-[#496db3]"
                                  aria-label={`Редактировать ${user.email}`}
                                >
                                  <PencilSquareIcon className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(user)}
                                  disabled={deletingId === user.id}
                                  className="rounded-lg p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                  aria-label={`Удалить ${user.email}`}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
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

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-form-title"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="user-form-title" className="text-base font-semibold text-slate-900">
                  {editingUser ? "Редактировать пользователя" : "Новый пользователь"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingUser
                    ? "Оставьте пароль пустым, если менять его не нужно."
                    : "Логин используется при входе в админку."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Закрыть"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <label className="block">
                <span className={labelClass}>Логин</span>
                <input
                  type="text"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className={inputClass}
                  autoComplete="username"
                  required
                />
              </label>

              <label className="block">
                <span className={labelClass}>Имя</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={inputClass}
                  autoComplete="name"
                />
              </label>

              <label className="block">
                <span className={labelClass}>Роль</span>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, role: e.target.value as UserRole }))
                  }
                  className={inputClass}
                >
                  <option value="EDITOR">Редактор</option>
                  <option value="ADMIN">Администратор</option>
                </select>
              </label>

              <label className="block">
                <span className={labelClass}>
                  Пароль{editingUser ? " (необязательно)" : ""}
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className={inputClass}
                  autoComplete={editingUser ? "new-password" : "new-password"}
                  required={!editingUser}
                />
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#496db3] px-4 py-2 text-sm font-medium text-white transition hover:brightness-105 disabled:opacity-50"
                >
                  {saving ? "Сохранение..." : editingUser ? "Сохранить" : "Создать"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
