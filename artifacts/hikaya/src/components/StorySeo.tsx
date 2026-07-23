import { Helmet } from "react-helmet-async";

type SeoStory = {
  title: string;
  description?: string | null;
  coverImage?: string | null;
  language: string;
  slug: string;
};

export function StorySeo({ story }: { story: SeoStory }) {
  const url = `${location.origin}/story/${story.slug}`;
  const description =
    story.description ||
    `Read and listen to ${story.title} on Hikāya — a full-cast audio drama.`;
  const image = story.coverImage ?? `${location.origin}/opengraph.jpg`;
  const ld = {
    "@context": "https://schema.org",
    "@type": "Audiobook",
    name: story.title,
    description,
    image,
    inLanguage: story.language,
    url,
    publisher: { "@type": "Organization", name: "Hikāya" },
  };
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
