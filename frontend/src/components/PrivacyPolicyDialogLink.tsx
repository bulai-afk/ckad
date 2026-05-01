"use client";

import { PolicyHtmlDialogLink } from "@/components/PolicyHtmlDialogLink";

type PrivacyPolicyDialogLinkProps = {
  className?: string;
  text?: string;
};

export function PrivacyPolicyDialogLink({ className, text }: PrivacyPolicyDialogLinkProps) {
  return (
    <PolicyHtmlDialogLink
      className={className}
      text={text}
      settingsHtmlKey="privacyPolicyHtml"
      dialogAriaLabel="Политика конфиденциальности"
      closeButtonAriaLabel="Закрыть окно политики"
      defaultText="политикой конфиденциальности"
      emptyDocumentMessage="Политика конфиденциальности пока не загружена. Добавьте HTML-файл в админке в разделе «Настройки сайта»."
    />
  );
}
