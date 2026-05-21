"use client";

import { PolicyHtmlDialogLink } from "@/components/PolicyHtmlDialogLink";

type PersonalDataConsentDialogLinkProps = {
  className?: string;
  text?: string;
};

/** Ссылка открывает загруженный в админке HTML «Обработка персональных данных» — тот же диалог, что у политики. */
export function PersonalDataConsentDialogLink({ className, text }: PersonalDataConsentDialogLinkProps) {
  return (
    <PolicyHtmlDialogLink
      className={className}
      text={text}
      settingsHtmlKey="personalDataConsentHtml"
      dialogAriaLabel="Обработка персональных данных"
      closeButtonAriaLabel="Закрыть окно обработки персональных данных"
      defaultText="обработку персональных данных"
      emptyDocumentMessage="Документ «Обработка персональных данных» пока не загружен. Добавьте HTML-файл в админке в разделе «Настройки сайта»."
    />
  );
}
