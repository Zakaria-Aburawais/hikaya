import jwt from "jsonwebtoken";
import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { RequestMagicLinkBody } from "@workspace/api-zod";
import { sendEmail } from "../lib/email";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_TTL,
  type SessionData,
} from "../lib/auth";

const router: IRouter = Router();

const TOKEN_TTL = "15m";

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

router.post("/auth/magic/request", async (req, res): Promise<void> => {
  const secret = process.env.MAGIC_LINK_SECRET;
  if (!secret) {
    req.log.error("MAGIC_LINK_SECRET not set — magic-link sign-in disabled");
    res.status(503).json({ error: "magic_link_unavailable" });
    return;
  }
  const parsed = RequestMagicLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const email = parsed.data.email.toLowerCase().trim();
  const returnTo = getSafeReturnTo(parsed.data.returnTo);

  const token = jwt.sign({ email }, secret, { expiresIn: TOKEN_TTL });
  const base = process.env.APP_BASE_URL ?? getOrigin(req);
  const link = `${base}/api/auth/magic/verify?token=${encodeURIComponent(token)}&returnTo=${encodeURIComponent(returnTo)}`;

  sendEmail(
    email,
    "Your Hikāya sign-in link",
    `<p><a href="${link}">Tap to sign in</a> — this link works once and expires in 15 minutes.</p>
     <p>If you didn't request this, you can ignore it.</p>`,
  ).catch((e) => req.log.error({ err: e }, "magic-link email failed"));

  // Always ok — do not reveal whether the address has an account.
  res.json({ ok: true });
});

router.get("/auth/magic/verify", async (req, res): Promise<void> => {
  const secret = process.env.MAGIC_LINK_SECRET;
  if (!secret) {
    res.status(503).send("Magic-link sign-in is not configured.");
    return;
  }
  let email: string;
  try {
    ({ email } = jwt.verify(String(req.query.token ?? ""), secret) as { email: string });
  } catch {
    res.status(400).send("This link is invalid or expired.");
    return;
  }

  // Feed the same users table as OIDC login. Magic-link users always start as
  // role "user" — the first-user→super_admin promotion stays OIDC-only.
  let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    await db.insert(usersTable).values({ email }).onConflictDoNothing({ target: usersTable.email });
    [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  }
  if (!user) {
    res.status(500).send("Could not sign you in. Please try again.");
    return;
  }

  const sessionData: SessionData = {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
    },
    // No OIDC tokens for magic-link sessions; with no expires_at the session
    // middleware never tries to refresh and the sessions-table TTL governs.
    access_token: "",
  };
  const sid = await createSession(sessionData);
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
  res.redirect(getSafeReturnTo(req.query.returnTo));
});

export default router;
