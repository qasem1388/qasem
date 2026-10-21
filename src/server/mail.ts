import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@/lib/db";

/**
 * SMTP is configured only through environment variables (never stored in the
 * database): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE.
 */
export function mailConfig() {
  const host = process.env.SMTP_HOST;
  const from = process.env.SMTP_FROM;
  if (!host || !from) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? "" } : undefined,
    from,
  };
}

let transporter: Transporter | null = null;
function transport() {
  const cfg = mailConfig();
  if (!cfg) return null;
  transporter ??= nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: cfg.auth,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
  return transporter;
}

const EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/** Sends one email and records the outcome in EmailLog. Never throws. */
export async function sendMail(opts: {
  kind: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}) {
  const to = opts.to.trim();
  const subject = opts.subject.replace(/[\r\n]+/g, " ").slice(0, 200);
  const t = transport();
  const log = (status: "SENT" | "FAILED" | "SKIPPED", error?: string) =>
    db.emailLog
      .create({ data: { kind: opts.kind, to, subject, status, error: error?.slice(0, 500) } })
      .catch((e) => console.error("email log failed", e));

  if (!EMAIL.test(to)) return log("SKIPPED", "عنوان بريد غير صالح");
  if (!t) return log("SKIPPED", "لم يتم إعداد خادم البريد (SMTP)");
  try {
    await t.sendMail({
      from: mailConfig()!.from,
      to,
      subject,
      html: opts.html,
      text: opts.text,
      replyTo: opts.replyTo && EMAIL.test(opts.replyTo) ? opts.replyTo : undefined,
    });
    return log("SENT");
  } catch (e) {
    console.error("email send failed", e);
    return log("FAILED", e instanceof Error ? e.message : String(e));
  }
}
