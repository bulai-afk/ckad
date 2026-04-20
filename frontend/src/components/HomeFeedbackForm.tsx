"use client";

import { useState } from "react";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

const errorMessages: Record<string, string> = {
  invalid_name: "Укажите имя (до 200 символов).",
  invalid_message: "Сообщение — от 5 до 8000 символов.",
  invalid_phone: "Телефон слишком длинный.",
  invalid_email: "E-mail слишком длинный.",
  invalid_email_format: "Некорректный формат e-mail.",
  contact_required: "Укажите телефон или e-mail для связи.",
};

const inputClass =
  "block w-full rounded-md border-0 bg-white px-3 py-2 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#496db3] sm:text-sm sm:leading-6";

export function HomeFeedbackForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorText("");
    setStatus("sending");
    try {
      const name = `${firstName} ${lastName}`.trim();
      const message = "Заявка с сайта. Просьба связаться.";
      const res = await fetch(`${apiBaseUrl()}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, message }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) {
        const key = typeof data.error === "string" ? data.error : "";
        setErrorText(errorMessages[key] || "Не удалось отправить. Попробуйте позже.");
        setStatus("error");
        return;
      }
      if (data.ok) {
        setStatus("success");
        setFirstName("");
        setLastName("");
        setPhone("");
        setEmail("");
        return;
      }
      setErrorText("Не удалось отправить. Попробуйте позже.");
      setStatus("error");
    } catch {
      setErrorText("Нет связи с сервером. Проверьте подключение или попробуйте позже.");
      setStatus("error");
    }
  }

  return (
    <section
      className="bg-transparent py-8 sm:py-10 about-template-fallback"
      aria-labelledby="feedback-contact-heading"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 sm:p-8">
            <div className="text-center">
              <h2 className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-base font-semibold text-[#b91c1c]">
                Обратная связь
              </h2>
              <p
                id="feedback-contact-heading"
                className="about-template-fallback__title -mt-1.5 mt-0 text-balance text-pretty sm:-mt-2"
              >
                Свяжитесь с нами
              </p>
              <p className="mt-4 text-pretty text-sm font-medium text-slate-600 sm:text-base">
                Если нужна консультация по вашему вопросу, оставьте заявку в форме — мы свяжемся с вами.
              </p>
            </div>

            <div className="mt-8">
              {status === "success" ? (
                <div className="space-y-4 text-center sm:text-left">
                  <p
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-800"
                    role="status"
                  >
                    Спасибо! Сообщение отправлено. Мы скоро с вами свяжемся.
                  </p>
                  <button
                    type="button"
                    className="text-sm font-semibold text-[#496db3] underline decoration-[#496db3]/40 underline-offset-2 hover:text-[#e53935]"
                    onClick={() => setStatus("idle")}
                  >
                    Отправить ещё одно сообщение
                  </button>
                </div>
              ) : (
                <form className="space-y-6" onSubmit={handleSubmit} noValidate aria-label="Форма обратной связи">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="feedback-first-name" className="sr-only">
                        Имя
                      </label>
                      <input
                        id="feedback-first-name"
                        name="firstName"
                        type="text"
                        autoComplete="given-name"
                        required
                        maxLength={200}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={inputClass}
                        placeholder="Имя *"
                      />
                    </div>
                    <div>
                      <label htmlFor="feedback-last-name" className="sr-only">
                        Фамилия
                      </label>
                      <input
                        id="feedback-last-name"
                        name="lastName"
                        type="text"
                        autoComplete="family-name"
                        maxLength={200}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={inputClass}
                        placeholder="Фамилия"
                      />
                    </div>
                    <div>
                      <label htmlFor="feedback-phone" className="sr-only">
                        Телефон
                      </label>
                      <input
                        id="feedback-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        maxLength={60}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputClass}
                        placeholder="Телефон"
                      />
                    </div>
                    <div>
                      <label htmlFor="feedback-email" className="sr-only">
                        E-mail
                      </label>
                      <input
                        id="feedback-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        maxLength={200}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                        placeholder="E-mail"
                      />
                    </div>
                  </div>

                  {status === "error" && errorText ? (
                    <p
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm leading-snug text-red-800"
                      role="alert"
                    >
                      {errorText}
                    </p>
                  ) : null}

                  <div className="flex justify-center">
                    <button
                      type="submit"
                      disabled={status === "sending"}
                      className="inline-flex min-w-[10rem] items-center justify-center rounded-md bg-[#496db3] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3d5ca0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#496db3] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {status === "sending" ? "Отправка…" : "Отправить"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
