"use client";

import { useState } from "react";
import { HomePartnersCarousel } from "@/components/HomePartnersCarousel";
import { PersonalDataConsentDialogLink } from "@/components/PersonalDataConsentDialogLink";
import { PrivacyPolicyDialogLink } from "@/components/PrivacyPolicyDialogLink";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

const errorMessages: Record<string, string> = {
  invalid_name: "Укажите имя (до 200 символов).",
  invalid_message: "Сообщение — от 5 до 8000 символов.",
  invalid_phone: "Телефон слишком длинный.",
  invalid_email: "E-mail слишком длинный.",
  invalid_email_format: "Некорректный формат e-mail.",
  contact_required: "Укажите телефон или e-mail для связи.",
  privacy_required: "Нужно согласие с политикой конфиденциальности.",
  personal_data_required: "Нужно подтверждение согласия на обработку персональных данных.",
};

/** То же поле `message` в API, что и в модалке — в админке заявок не показывается, только имя/фамилия/телефон/e-mail. */
const DEFAULT_FEEDBACK_MESSAGE = "Заявка с сайта. Просьба связаться.";

const inputOutlineClass =
  "block w-full rounded-md bg-white px-3.5 py-2 text-sm/[1.45] text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#496db3] sm:text-sm/[1.4]";

export function HomeFeedbackForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedPersonalData, setAgreedPersonalData] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorText("");
    if (!agreedPrivacy) {
      setErrorText(errorMessages.privacy_required);
      setStatus("error");
      return;
    }
    if (!agreedPersonalData) {
      setErrorText(errorMessages.personal_data_required);
      setStatus("error");
      return;
    }
    setStatus("sending");
    const name = `${firstName} ${lastName}`.trim();
    const phoneForApi = phone.trim();

    try {
      const res = await fetch(`${apiBaseUrl()}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phoneForApi,
          email,
          message: DEFAULT_FEEDBACK_MESSAGE,
        }),
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
        setEmail("");
        setPhone("");
        setAgreedPrivacy(false);
        setAgreedPersonalData(false);
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
    <>
      <div className="w-full bg-slate-100">
        <div className="mx-auto w-[80%] border-t border-slate-200/80" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-6 py-4 sm:py-5 lg:px-8">
          <HomePartnersCarousel slides={[]} title="Наши клиенты" compact />
        </div>
      </div>
      <section
        className="relative isolate w-full min-w-0 overflow-hidden bg-white"
        aria-labelledby="feedback-contact-heading"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 -z-10 transform-gpu overflow-hidden blur-3xl"
        >
          <div
            className="hero-police-blob relative left-1/2 aspect-[1155/678] w-[36rem] max-w-none -translate-x-1/2 rotate-[20deg] bg-gradient-to-tr from-[#496db3] via-[#5f7ebe] to-[#8aa9db] sm:w-[72rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%,100% 61.6%,97.5% 26.9%,85.5% 0.1%,80.7% 2%,72.5% 32.5%,60.2% 62.4%,52.4% 68.1%,47.5% 58.3%,45.2% 34.5%,27.5% 76.7%,0.1% 64.9%,17.9% 100%,27.6% 76.8%,76.1% 97.7%,74.1% 44.1%)",
            }}
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-24 -z-10 transform-gpu overflow-hidden blur-3xl"
        >
          <div
            className="hero-police-blob hero-police-blob--alt relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36rem] max-w-none -translate-x-1/2 bg-gradient-to-tr from-[#b91c1c] via-[#dc2626] to-[#f87171] sm:left-[calc(50%+24rem)] sm:w-[72rem]"
            style={{
              clipPath:
                "polygon(74.1% 44.1%,100% 61.6%,97.5% 26.9%,85.5% 0.1%,80.7% 2%,72.5% 32.5%,60.2% 62.4%,52.4% 68.1%,47.5% 58.3%,45.2% 34.5%,27.5% 76.7%,0.1% 64.9%,17.9% 100%,27.6% 76.8%,76.1% 97.7%,74.1% 44.1%)",
            }}
          />
        </div>

        <div className="relative z-10">
          <div className="about-template-fallback mx-auto w-full max-w-2xl px-6 py-6 sm:py-8 lg:px-8">
            <div className="text-center">
              <h2 className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-base font-semibold text-[#b91c1c]">
                Обратная связь
              </h2>
              <p
                id="feedback-contact-heading"
                className="about-template-fallback__title -mt-1.5 mt-0 text-balance text-pretty sm:-mt-2"
              >
                Связаться с нами
              </p>
              <p className="mt-3 text-pretty text-base leading-[1.4] font-medium text-slate-600 sm:mt-4">
                Оставьте заявку — ответим по телефону или e-mail и подскажем по каталогизации и анализу данных.
              </p>
            </div>

            {status === "success" ? (
              <div className="mx-auto mt-5 w-full max-w-xl text-center sm:mt-6">
                <p
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm/[1.35] font-semibold text-emerald-800"
                  role="status"
                >
                  Спасибо! Сообщение отправлено. Мы скоро с вами свяжемся.
                </p>
                <button
                  type="button"
                  className="mt-4 text-sm/[1.35] font-semibold text-[#496db3] underline decoration-[#496db3]/40 underline-offset-2 hover:text-red-600"
                  onClick={() => setStatus("idle")}
                >
                  Отправить ещё одно сообщение
                </button>
              </div>
            ) : (
              <form
                className="mx-auto mt-5 w-full max-w-xl sm:mt-6"
                onSubmit={handleSubmit}
                noValidate
                aria-label="Форма обратной связи"
              >
                <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="feedback-first-name" className="block text-sm/[1.3] font-semibold text-gray-900">
                      Имя <span className="text-red-600">*</span>
                    </label>
                    <div className="mt-1.5">
                      <input
                        id="feedback-first-name"
                        name="firstName"
                        type="text"
                        autoComplete="given-name"
                        required
                        maxLength={200}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={inputOutlineClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="feedback-last-name" className="block text-sm/[1.3] font-semibold text-gray-900">
                      Фамилия
                    </label>
                    <div className="mt-1.5">
                      <input
                        id="feedback-last-name"
                        name="lastName"
                        type="text"
                        autoComplete="family-name"
                        maxLength={200}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={inputOutlineClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="feedback-phone" className="block text-sm/[1.3] font-semibold text-gray-900">
                      Телефон
                    </label>
                    <div className="mt-1.5">
                      <input
                        id="feedback-phone"
                        name="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="Телефон"
                        maxLength={60}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className={inputOutlineClass}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="feedback-email" className="block text-sm/[1.3] font-semibold text-gray-900">
                      E-mail
                    </label>
                    <div className="mt-1.5">
                      <input
                        id="feedback-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        maxLength={200}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputOutlineClass}
                      />
                    </div>
                  </div>
                  <div className="flex items-start gap-x-3 sm:col-span-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={agreedPrivacy}
                      aria-labelledby="feedback-agree-text"
                      onClick={() => setAgreedPrivacy((v) => !v)}
                      className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 shadow-[inset_0_0_0_1px] shadow-gray-900/5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#496db3] ${
                        agreedPrivacy ? "bg-[#496db3]" : "bg-gray-200"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-1 ring-gray-900/5 transition-transform duration-200 ease-out ${
                          agreedPrivacy ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span id="feedback-agree-text" className="text-sm/[1.35] text-gray-600">
                      Соглашаюсь с{" "}
                      <PrivacyPolicyDialogLink
                        className="font-semibold whitespace-nowrap text-[#496db3] underline decoration-[#496db3]/35 underline-offset-2 hover:text-red-600"
                      />
                      .
                    </span>
                  </div>
                  <div className="flex items-start gap-x-3 sm:col-span-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={agreedPersonalData}
                      aria-labelledby="feedback-pd-text"
                      onClick={() => setAgreedPersonalData((v) => !v)}
                      className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 shadow-[inset_0_0_0_1px] shadow-gray-900/5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#496db3] ${
                        agreedPersonalData ? "bg-[#496db3]" : "bg-gray-200"
                      }`}
                    >
                      <span
                        aria-hidden
                        className={`pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-1 ring-gray-900/5 transition-transform duration-200 ease-out ${
                          agreedPersonalData ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <span id="feedback-pd-text" className="text-sm/[1.35] text-gray-600">
                      Соглашаюсь на{" "}
                      <PersonalDataConsentDialogLink className="font-semibold whitespace-nowrap text-[#496db3] underline decoration-[#496db3]/35 underline-offset-2 hover:text-red-600" />
                      .
                    </span>
                  </div>
                </div>

                {status === "error" && errorText ? (
                  <p
                    className="mt-3.5 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-sm/[1.35] text-red-800"
                    role="alert"
                  >
                    {errorText}
                  </p>
                ) : null}

                <div className="mt-5 flex justify-center">
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="inline-flex min-w-[10.5rem] items-center justify-center rounded-md bg-[#496db3] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#3d5ca0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#496db3] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {status === "sending" ? "Отправка…" : "Отправить"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
