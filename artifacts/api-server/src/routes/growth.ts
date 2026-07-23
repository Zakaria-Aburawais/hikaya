import { Router, type IRouter } from "express";
import { db, emailSubscribersTable } from "@workspace/db";
import { SubscribeNewsletterBody } from "@workspace/api-zod";
import { sendEmail } from "../lib/email";

const router: IRouter = Router();

router.post("/newsletter/subscribe", async (req, res): Promise<void> => {
  const parsed = SubscribeNewsletterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, source, locale } = parsed.data;
  const normalized = email.toLowerCase().trim();

  await db
    .insert(emailSubscribersTable)
    .values({
      email: normalized,
      source,
      locale: locale ?? null,
      userId: req.user?.id ?? null,
    })
    .onConflictDoNothing({ target: emailSubscribersTable.email });

  // Fire-and-forget welcome — never block or fail the subscribe response.
  sendEmail(
    normalized,
    "Welcome to Hikāya — stories that speak",
    `<p>You're in. Hikāya turns stories into audio dramas — every character voiced, in six languages.</p>
     <p>Every week we'll send you one new voiced story.</p>
     <p>— The Hikāya team</p>`,
  ).catch((e) => req.log.error({ err: e }, "welcome email failed"));

  res.json({ ok: true });
});

export default router;
