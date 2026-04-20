"use client";

import {
  Description,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useState, type FormEvent } from "react";
import { apiBaseUrl } from "@/lib/apiBaseUrl";

export type CallbackRequestModalProps = {
  open: boolean;
  onClose: () => void;
  /** Текст заявки в поле message для админки */
  sourceMessage?: string;
};

const inputClass =
  "block w-full rounded-md border-0 bg-white px-3 py-2 text-base text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#496db3] sm:text-sm sm:leading-6";

export function CallbackRequestModal({
  open,
  onClose,
  sourceMessage = "Заявка с сайта.",
}: CallbackRequestModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!open) return;
    setFirstName("");
    setLastName("");
    setPhone("");
    setEmail("");
    setStatus("idle");
    setErrorText("");
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorText("");
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
      window.setTimeout(() => {
        onClose();
        setStatus("idle");
      }, 900);
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
          className="relative w-full max-w-sm transform overflow-hidden rounded-2xl bg-white px-4 pb-4 pt-5 text-left shadow-xl ring-1 ring-gray-900/5 transition-all duration-300 ease-out data-closed:scale-95 data-closed:opacity-0 sm:my-8 sm:p-6"
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
            <DialogTitle className="text-base font-semibold leading-6 text-gray-900">
              Обратный звонок
            </DialogTitle>
            <Description className="mt-2 text-sm text-gray-600">
              Оставьте заявку — специалисты свяжутся с вами.
            </Description>
          </div>

          <form className="mt-6 flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-4">
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Имя *"
                className={inputClass}
                required
                aria-label="Имя"
              />
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Фамилия"
                className={inputClass}
                aria-label="Фамилия"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Телефон"
                type="tel"
                className={inputClass}
                aria-label="Телефон"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                type="email"
                className={inputClass}
                aria-label="E-mail"
              />
            </div>

            {status === "success" ? (
              <div
                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-semibold text-emerald-800"
                role="status"
              >
                Спасибо! Заявка отправлена.
              </div>
            ) : null}
            {status === "error" && errorText ? (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-800"
                role="alert"
              >
                {errorText}
              </div>
            ) : null}

            <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto"
                onClick={() => onClose()}
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={status === "sending"}
                className="inline-flex w-full justify-center rounded-md bg-[#496db3] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3d5ca0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#496db3] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {status === "sending" ? "Отправляем…" : "Отправить заявку"}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
