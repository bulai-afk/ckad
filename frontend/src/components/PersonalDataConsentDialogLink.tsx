"use client";

import { PolicyHtmlDialogLink } from "@/components/PolicyHtmlDialogLink";

type PersonalDataConsentDialogLinkProps = {
  className?: string;
  text?: string;
};

/** Ссылка открывает загруженный в админке HTML «Согласие на обработку персональных данных» — тот же диалог, что у политики. */
export function PersonalDataConsentDialogLink({ className, text }: PersonalDataConsentDialogLinkProps) {
  return (
    <PolicyHtmlDialogLink
      className={className}
      text={text}
      settingsHtmlKey="personalDataConsentHtml"
      dialogAriaLabel="Согласие на обработку персональных данных"
      closeButtonAriaLabel="Закрыть окно согласия на обработку персональных данных"
      defaultText="согласии на обработку персональных данных"
      emptyDocumentMessage="Согласие на обработку персональных данных пока не загружено. Добавьте HTML-файл в админке в разделе «Настройки сайта»."
    />
  );
}
