import { Router, type IRouter, type Request } from "express";
import { asc, eq } from "drizzle-orm";
import { db, storiesTable } from "@workspace/db";

const router: IRouter = Router();

function getBase(req: Request): string {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/+$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

router.get("/sitemap.xml", async (req, res): Promise<void> => {
  const base = getBase(req);
  const stories = await db
    .select({
      slug: storiesTable.slug,
      updatedAt: storiesTable.updatedAt,
    })
    .from(storiesTable)
    .where(eq(storiesTable.status, "published"))
    .orderBy(asc(storiesTable.slug));

  const staticUrls = ["", "/library"];
  const entries = [
    ...staticUrls.map((p) => `  <url><loc>${base}${p}</loc></url>`),
    ...stories.map(
      (s) =>
        `  <url><loc>${base}/story/${escapeXml(s.slug)}</loc><lastmod>${s.updatedAt.toISOString().slice(0, 10)}</lastmod></url>`,
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;
  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.send(xml);
});

export default router;
