"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("demo");
  const [password, setPassword] = useState("demo");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        setError("Неверный логин или пароль");
        return;
      }

      const next = searchParams.get("next");
      const target = next && next.startsWith("/admin") ? next : "/admin/dashboard";
      router.replace(target);
      router.refresh();
    } catch {
      setError("Не удалось выполнить вход");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-[min(360px,92vw)] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-center text-xl font-semibold text-slate-900">
          Вход в админку
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Авторизуйтесь для доступа к панели управления
        </p>

        <form className="mt-6 space-y-3" onSubmit={handleSubmit}>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Логин</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none transition focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/20"
              placeholder="Введите логин"
              autoComplete="username"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-700">Пароль</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none transition focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/20"
              placeholder="Введите пароль"
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={submitting || !username.trim() || !password.trim()}
            className="w-full rounded-xl bg-[#496db3] px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-105 disabled:opacity-60"
          >
            {submitting ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </main>
  );
}

