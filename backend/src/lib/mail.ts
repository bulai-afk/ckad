import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
};

let cachedTransport: Transporter | null | undefined;

function envFlag(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST?.trim());
}

function getTransport(): Transporter | null {
  if (cachedTransport !== undefined) return cachedTransport;

  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    cachedTransport = null;
    return null;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = envFlag("SMTP_SECURE") || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS ?? "";

  cachedTransport = nodemailer.createTransport({
    host,
    port: Number.isFinite(port) ? port : 587,
    secure,
    auth: user ? { user, pass } : undefined,
  });

  return cachedTransport;
}

export function getMailFromAddress(): string | null {
  const from = process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim();
  return from || null;
}

export async function sendMail(message: MailMessage): Promise<void> {
  const transport = getTransport();
  const from = getMailFromAddress();
  if (!transport || !from) {
    throw new Error("mail_not_configured");
  }

  await transport.sendMail({
    from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    replyTo: message.replyTo,
  });
}
