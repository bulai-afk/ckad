"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState, type FormEvent } from "react";
import { PrivacyPolicyDialogLink } from "@/components/PrivacyPolicyDialogLink";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

export type CallbackRequestModalProps = {
  open: boolean;
  onClose: () => void;
  /** Текст заявки в поле message для админки */
  sourceMessage?: string;
};

const inputOutlineClass =
  "block w-full rounded-md bg-white px-3.5 py-2 text-sm/[1.45] text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-[#496db3] sm:text-sm/[1.4]";

export function CallbackRequestModal({
  open,
  onClose,
  sourceMessage = "Заявка с сайта.",
}: CallbackRequestModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!open) return;
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setAgreed(false);
    setStatus("idle");
    setErrorText("");
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorText("");
    if (!agreed) {
      setStatus("error");
      setErrorText("Нужно согласие с политикой конфиденциальности.");
      return;
    }
    setStatus("sending");
    try {
      const name = `${firstName} ${lastName}`.trim();
      const res = await fetch(`${apiBaseUrl()}/api/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, message: sourceMessage }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setErrorText("Не удалось отправить заявку. Проверьте данные и попробуйте снова.");
        return;
      }
      setStatus("success");
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorText("Нет связи с сервером. Попробуйте позже.");
    }
  }

  return (
    <Dialog open={open} onClose={() => onClose()} className="relative z-[10000]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-gray-500/75 transition-opacity duration-300 ease-out data-closed:opacity-0"
      />
      <div className="fixed inset-0 z-[10001] flex w-screen items-center justify-center overflow-y-auto p-4 sm:p-6">
        <DialogPanel
          transition
          className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl ring-1 ring-gray-900/5 transition-all duration-300 ease-out data-closed:scale-95 data-closed:opacity-0 sm:my-8 sm:p-8"
        >
          <div className="absolute right-4 top-4 sm:right-5 sm:top-5">
            <button
              type="button"
              className="rounded-md p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#496db3] focus-visible:ring-offset-2"
              onClick={() => onClose()}
              aria-label="Закрыть"
            >
              <XMarkIcon className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="pr-10 sm:pr-12">
            <DialogTitle className="sr-only">Обратный звонок</DialogTitle>
            <div className="text-center">
              <h2 className="about-template-fallback__eyebrow about-template-fallback__eyebrow--tight mb-0 text-base font-semibold text-[#b91c1c]">
                Обратная связь
              </h2>
              <p className="about-template-fallback__title -mt-1.5 mt-0 text-balance text-pretty sm:-mt-2">
                Связаться с нами
              </p>
              <p className="mt-3 text-pretty text-base leading-[1.4] font-medium text-slate-600 sm:mt-4">
                Оставьте заявку — ответим по телефону или e-mail и подскажем по каталогизации и анализу данных.
              </p>
            </div>
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
            <form className="mx-auto mt-5 w-full max-w-xl sm:mt-6" onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
                <div>
                  <label htmlFor="callback-first-name" className="block text-sm/[1.3] font-semibold text-gray-900">
                    Имя <span className="text-red-600">*</span>
                  </label>
                  <div className="mt-1.5">
                    <input
                      id="callback-first-name"
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
                  <label htmlFor="callback-last-name" className="block text-sm/[1.3] font-semibold text-gray-900">
                    Фамилия
                  </label>
                  <div className="mt-1.5">
                    <input
                      id="callback-last-name"
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
                  <label htmlFor="callback-phone" className="block text-sm/[1.3] font-semibold text-gray-900">
                    Телефон
                  </label>
                  <div className="mt-1.5">
                    <input
                      id="callback-phone"
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
                  <label htmlFor="callback-email" className="block text-sm/[1.3] font-semibold text-gray-900">
                    E-mail
                  </label>
                  <div className="mt-1.5">
                    <input
                      id="callback-email"
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
                <div className="flex items-center gap-x-3 sm:col-span-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={agreed}
                    aria-labelledby="callback-agree-text"
                    onClick={() => setAgreed((v) => !v)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full p-0.5 shadow-[inset_0_0_0_1px] shadow-gray-900/5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#496db3] ${
                      agreed ? "bg-[#496db3]" : "bg-gray-200"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`pointer-events-none block size-5 rounded-full bg-white shadow-sm ring-1 ring-gray-900/5 transition-transform duration-200 ease-out ${
                        agreed ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span id="callback-agree-text" className="text-sm/[1.35] text-gray-600">
                    Отмечая пункт, вы соглашаетесь с нашей{" "}
                    <PrivacyPolicyDialogLink
                      className="font-semibold whitespace-nowrap text-[#496db3] underline decoration-[#496db3]/35 underline-offset-2 hover:text-red-600"
                    />
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
        </DialogPanel>
      </div>
    </Dialog>
  );
}
