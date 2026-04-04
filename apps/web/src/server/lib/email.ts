// Email sender — nodemailer wrapper for SMTP (MailHog in dev, SMTP in prod)

import nodemailer from 'nodemailer';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter(): ReturnType<typeof nodemailer.createTransport> {
  if (transporter !== null) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env['SMTP_HOST'] ?? 'localhost',
    port: Number(process.env['SMTP_PORT'] ?? 1025),
    // MailHog in dev: no auth, no TLS. In production set SMTP_USER + SMTP_PASSWORD.
    secure: false,
    auth:
      process.env['SMTP_USER'] !== undefined && process.env['SMTP_USER'] !== ''
        ? {
            user: process.env['SMTP_USER'],
            pass: process.env['SMTP_PASSWORD'] ?? '',
          }
        : undefined,
  });

  return transporter;
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const from = process.env['SMTP_FROM'] ?? 'noreply@inventorize.app';
  await getTransporter().sendMail({ from, to, subject, html, text });
}
