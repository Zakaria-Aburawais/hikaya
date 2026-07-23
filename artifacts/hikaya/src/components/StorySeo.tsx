import { Helmet } from "react-helmet-async";

type SeoStory = {
  title: string;
  description?: string | null;
  coverImage?: string | null;
  language: string;
  slug: string;
  ratingAvg?: number | null;
  ratingCount?: number;
};

export function StorySeo({ story }: { story: SeoStory }) {
  const url = `${location.origin}/story/${story.slug}`;
  const description =
    story.description ||
    `Read and listen to ${story.title} on Hikāya — a full-cast audio drama.`;
  const image = story.coverImage ?? `${location.origin}/opengraph.jpg`;
  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Audiobook",
    name: story.title,
    description,
    image,
    inLanguage: story.language,
    url,
    publisher: { "@type": "Organization", name: "Hikāya" },
  };
  if (story.ratingAvg != null && (story.ratingCount ?? 0) > 0) {
    ld.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: (story.ratingAvg / 10).toFixed(1),
      ratingCount: story.ratingCount,
      bestRating: 5,
    };
  }
  return (
    <Helmet>
      <title>{`${story.title} — Hikāya`}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={story.title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:type" content="book" />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
      <html lang={story.language} />
      <script type="application/ld+json">{JSON.stringify(ld)}</script>
    </Helmet>
  );
}
