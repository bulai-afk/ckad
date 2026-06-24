import { promises as fs } from "node:fs";
import { backendDataPath } from "../backendPaths";
import { getMailFromAddress, isMailConfigured, sendMail } from "./mail";

const SITE_SETTINGS_DATA_PATH = backendDataPath("siteSettings.json");

export type FeedbackNotificationPayload = {
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  message: string;
  createdAt: string;
};

async function readFeedbackRecipientEmail(): Promise<string | null> {
  const override = process.env.FEEDBACK_MAIL_TO?.trim();
  if (override) return override;

  try {
    const raw = await fs.readFile(SITE_SETTINGS_DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as { email?: unknown };
    const email = typeof parsed?.email === "string" ? parsed.email.trim() : "";
    return email || null;
  } catch {
    return null;
  }
}

function formatFeedbackMailText(payload: FeedbackNotificationPayload): string {
  const lines = [
    "Новая заявка с сайта",
    "",
    `Дата: ${payload.createdAt}`,
    `Имя: ${payload.firstName || "—"}`,
    `Фамилия: ${payload.lastName || "—"}`,
    `Телефон: ${payload.phone || "—"}`,
    `E-mail: ${payload.email || "—"}`,
    "",
    "Сообщение:",
    payload.message || "—",
  ];
  return lines.join("\n");
}

export async function sendFeedbackNotification(
  payload: FeedbackNotificationPayload,
): Promise<{ sent: boolean; reason?: string }> {
  if (!isMailConfigured() || !getMailFromAddress()) {
    // eslint-disable-next-line no-console
    console.warn("[feedback-mail] SMTP не настроен, письмо не отправлено");
    return { sent: false, reason: "mail_not_configured" };
  }

  const to = await readFeedbackRecipientEmail();
  if (!to) {
    // eslint-disable-next-line no-console
    console.warn("[feedback-mail] Не указан адрес получателя (siteSettings.email / FEEDBACK_MAIL_TO)");
    return { sent: false, reason: "recipient_missing" };
  }

  try {
    await sendMail({
      to,
      subject: `Новая заявка с сайта: ${payload.name}`,
      text: formatFeedbackMailText(payload),
      replyTo: payload.email || undefined,
    });
    // eslint-disable-next-line no-console
    console.log("[feedback-mail] Письмо отправлено на", to);
    return { sent: true };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error("[feedback-mail] Ошибка отправки:", detail);
    return { sent: false, reason: "send_failed" };
  }
}
