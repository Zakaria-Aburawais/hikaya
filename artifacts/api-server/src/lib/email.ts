import { Resend } from "resend";
import { logger } from "./logger";

const FROM = process.env.EMAIL_FROM ?? "Hikaya <hello@example.com>";

let resend: Resend | null = null;
function client(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const c = client();
  if (!c) {
    logger.warn({ to, subject }, "RESEND_API_KEY not set — email skipped");
    return null;
  }
  return c.emails.send({ from: FROM, to, subject, html });
}
