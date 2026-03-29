"use client";

import Link from "next/link";
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

  const inputClass =
    "mt-1 w-full max-w-[200px] justify-self-center rounded-xl border border-slate-200 bg-white p-4 text-[16px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#496db3] focus:ring-2 focus:ring-[#496db3]/25";

  const glowStyle = {
    boxShadow:
      "0 6px 24px rgba(73, 109, 179, 0.18), 0 0 32px rgba(73, 109, 179, 0.14), 0 0 64px rgba(73, 109, 179, 0.08)",
  } as const;

  return (
    <section
      className="home-feedback-card my-10 w-full text-[#496db3] sm:my-12"
      aria-labelledby="feedback-contact-heading"
    >
      <style>{`
        /* Явная ширина: не зависит от порядка утилит Tailwind и flex-stretch у родителя */
        section.home-feedback-card {
          box-sizing: border-box;
          width: 100%;
          max-width: min(100%, 60rem);
          margin-left: auto;
          margin-right: auto;
        }
        .home-feedback-form-panel {
          position: relative;
          z-index: 2;
          transform: translateZ(0);
          box-shadow:
            0 4px 32px rgba(73, 109, 179, 0.26),
            0 0 48px rgba(73, 109, 179, 0.2),
            0 0 88px rgba(73, 109, 179, 0.12);
        }
        .feedback-block-inner {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 1.5rem;
          align-items: stretch;
        }
        .feedback-block-inner__sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          min-width: 0;
          min-height: 0;
        }
        @media (min-width: 768px) {
          .feedback-block-inner {
            grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
            gap: 1.75rem;
            align-items: stretch;
          }
          .feedback-block-inner__sidebar {
            gap: 1.5rem;
            justify-content: center;
          }
        }
        @media (min-width: 1024px) {
          .feedback-block-inner {
            gap: 2rem;
          }
        }

        /* Форма: колонки через flex — равная высота и textarea на всю оставшуюся высоту */
        .feedback-form-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
        }
        .feedback-form-columns {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          min-height: 0;
        }
        .feedback-form-textarea {
          box-sizing: border-box;
          min-height: calc(13rem + 3px);
          flex: 0 0 auto;
        }
        @media (min-width: 640px) {
          .feedback-form-columns {
            flex-direction: row;
            align-items: stretch;
            gap: 1.5rem;
          }
          .feedback-form-grid > .feedback-form-columns > .feedback-form-fields {
            flex: 1 1 0;
            min-width: 0;
            min-height: 0;
          }
          .feedback-form-grid > .feedback-form-columns > .feedback-form-message {
            flex: 1.15 1 0;
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
          }
          .feedback-form-grid > .feedback-form-columns > .feedback-form-message > label {
            flex-shrink: 0;
          }
          .feedback-form-grid > .feedback-form-actions {
            justify-content: center;
          }
          .feedback-form-textarea {
            flex: 1 1 0%;
            min-height: calc(13rem + 3px);
            min-width: 0;
            width: 100%;
            overflow: auto;
          }
        }
      `}</style>

      <div className="feedback-block-inner">
        <aside className="feedback-block-inner__sidebar h-full text-center lg:text-left">
          <div>
            <div
              className="mb-4 flex items-center justify-center text-[13px] font-semibold tracking-tight lg:mb-2"
              style={{ fontSize: "clamp(10px, 1.2vw, 16px)" }}
            >
              <h2
                id="feedback-contact-heading"
                className="text-center uppercase text-[#496db3]"
                style={{
                  fontSize: "230%",
                  lineHeight: 1.1,
                  fontWeight: 950,
                  textShadow:
                    "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor",
                }}
              >
                Свяжитесь с нами
              </h2>
            </div>
            <p
              className="mt-4 font-semibold text-[#496db3]"
              style={{ fontSize: "clamp(14px, 1.8vw, 17px)", lineHeight: 1.55 }}
            >
              Если необходима консультация по вашему вопросу, вы можете воспользоваться формой обратной
              связи: оставьте заявку — и мы с вами свяжемся.
            </p>
            <div className="mt-5 flex justify-center">
              <Link
                href="/"
                className="inline-flex shrink-0 items-center text-left font-semibold tracking-tight text-[#496db3]"
                style={{ fontSize: "clamp(13px, 2.4vw, 17px)" }}
              >
                <span
                  className="inline-flex h-14 w-14 items-center justify-center shrink-0 md:h-16 md:w-16"
                  style={{ marginRight: 6 }}
                >
                  <img
                    src="/logo_1.svg"
                    alt="Логотип Центра каталогизации и анализа данных"
                    className="h-14 w-14 object-contain md:h-16 md:w-16 [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.08))_drop-shadow(0_2px_4px_rgba(0,0,0,0.06))]"
                    width={64}
                    height={64}
                  />
                </span>
                <span
                  aria-hidden="true"
                  className="inline-flex h-14 w-[3px] shrink-0 items-center justify-center md:h-16"
                  style={{ marginLeft: 6, marginRight: 6 }}
                >
                  <svg width="3" height="52" viewBox="0 0 3 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="3" height="52" rx="1.5" fill="#496db3" />
                  </svg>
                </span>
                <span
                  className="flex h-14 min-w-0 flex-col justify-center uppercase leading-[0.88] md:h-16"
                  style={{
                    fontWeight: 950,
                    textShadow:
                      "0.35px 0 currentColor, -0.35px 0 currentColor, 0 0.35px currentColor, 0 -0.35px currentColor",
                  }}
                >
                  <span className="block w-max max-w-full leading-none">ЦЕНТР КАТАЛОГИЗАЦИИ</span>
                  <span className="block w-max max-w-full leading-none">И АНАЛИЗА ДАННЫХ</span>
                </span>
              </Link>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex h-full items-center">
          <div className="w-full rounded-xl bg-transparent p-0">
            {status === "success" ? (
              <div className="space-y-3">
                <p
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-center text-[14px] font-semibold text-emerald-800 sm:text-left"
                  role="status"
                >
                  Спасибо! Сообщение отправлено. Мы скоро с вами свяжемся.
                </p>
                <button
                  type="button"
                  className="text-[13px] font-semibold text-[#496db3] underline decoration-[#496db3]/40 underline-offset-2 hover:text-[#e53935]"
                  onClick={() => setStatus("idle")}
                >
                  Отправить ещё одно сообщение
                </button>
              </div>
            ) : (
              <form
                className="feedback-form-grid"
                onSubmit={handleSubmit}
                noValidate
                aria-label="Форма обратной связи"
              >
                <div className="feedback-form-columns">
                <div className="feedback-form-fields flex min-h-0 flex-col gap-4">
                  <div
                    className="grid gap-3"
                    style={{
                      gridTemplateColumns: "repeat(2, minmax(0, 200px))",
                      justifyContent: "center",
                    }}
                  >
                    <div>
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
                        style={glowStyle}
                        placeholder="Имя *"
                      />
                    </div>
                    <div>
                      <input
                        id="feedback-last-name"
                        name="lastName"
                        type="text"
                        autoComplete="family-name"
                        maxLength={200}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={inputClass}
                        style={glowStyle}
                        placeholder="Фамилия"
                      />
                    </div>
                  </div>

                  <div
                    className="grid gap-3"
                    style={{
                      gridTemplateColumns: "repeat(2, minmax(0, 200px))",
                      justifyContent: "center",
                    }}
                  >
                    <div>
                      <input
                        id="feedback-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        maxLength={60}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputClass}
                        style={glowStyle}
                        placeholder="Телефон"
                      />
                    </div>
                    <div>
                      <input
                        id="feedback-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        maxLength={200}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputClass}
                        style={glowStyle}
                        placeholder="E-mail"
                      />
                    </div>
                  </div>

                  {status === "error" && errorText ? (
                    <p
                      className="feedback-form-error rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[14px] leading-snug text-red-800"
                      role="alert"
                    >
                      {errorText}
                    </p>
                  ) : null}
                </div>
                </div>

                <div className="feedback-form-actions flex w-full justify-center pt-1 sm:pt-2">
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="inline-flex w-auto min-w-[200px] items-center justify-center self-center rounded-full bg-[#496db3] p-4 text-[16px] font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 sm:px-7 sm:py-4 sm:text-[15px]"
                    style={{
                      boxShadow:
                        "0 10px 30px rgba(73, 109, 179, 0.35), 0 0 48px rgba(73, 109, 179, 0.22)",
                    }}
                  >
                    {status === "sending" ? "Отправка…" : "Отправить"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
