// ============================================================
// XIVIZLEY Hub — Mailer (SMTP via nodemailer)
// apps/sso/src/server/services/mailer.ts
// Reads SMTP_* env vars; gracefully disabled when unconfigured.
// ============================================================

import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;
let initialized = false;

function getTransporter(): nodemailer.Transporter | null {
  if (initialized) return transporter;
  initialized = true;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    return null;
  }

  const port = Number(process.env.SMTP_PORT || 465);
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export function isMailConfigured(): boolean {
  return getTransporter() !== null;
}

export interface SendMailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
  ics?: string;
  icsFilename?: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from?: string;
}

function buildTransport(cfg: {
  host: string;
  port: number;
  user: string;
  pass: string;
}): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });
}

export async function sendMail(
  input: SendMailInput,
  config?: SmtpConfig,
): Promise<boolean> {
  let t: nodemailer.Transporter | null;
  let fromAddress: string;

  if (config) {
    t = buildTransport(config);
    fromAddress = config.from || config.user;
  } else {
    t = getTransporter();
    if (!t) return false;
    fromAddress =
      process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "no-reply@localhost";
  }

  try {
    await t.sendMail({
      from: `"XIVIZLEY Takvim" <${fromAddress}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.ics
        ? [
            {
              filename: input.icsFilename || "xivizley-etkinlik.ics",
              content: input.ics,
              contentType: "text/calendar; charset=utf-8; method=REQUEST",
            },
          ]
        : undefined,
    });
    return true;
  } catch (err) {
    console.warn("✉️ [CALENDAR] Mail gönderilemedi:", (err as Error)?.message);
    return false;
  }
}
