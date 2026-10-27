import type { Metadata } from "next";
import { HomeView } from "@/components/editorial/home-view";
import { JsonLd } from "@/components/editorial/json-ld";
import { MediaEmptyState, MediaErrorState, SampleBanner } from "@/components/editorial/presentation";
import { loadCatalog } from "@/lib/editorial/catalog";
import { composeHome } from "@/lib/editorial/compose";
import { mediaCollectionJsonLd } from "@/lib/editorial/discover";
import { getSiteUrl } from "@/lib/site-url";

export async function generateMetadata(): Promise<Metadata> {
  const catalog = await loadCatalog();
  const indexable = !catalog.usingFixtures && !catalog.unavailable;
  const canonical = `${getSiteUrl()}/media`;
  const description = "Real stories and deeper insights from Jimvio Media.";
  return {
    title: { absolute: "Jimvio Media" },
    description,
    alternates: { canonical },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: "Jimvio Media",
      description,
      url: canonical,
      type: "website",
      siteName: "Jimvio Media",
      locale: "en_US",
    },
  };
}

export default async function MediaHomePage() {
  const catalog = await loadCatalog();
  if (!catalog.usingFixtures && catalog.unavailable) return <MediaErrorState />;
  const composition = composeHome(catalog.articles);
  const hasStories =
    composition.heroes.length +
      composition.featured.length +
      composition.latest.length +
      composition.magazine.length +
      composition.guides.length >
    0;
  const jsonLd = catalog.usingFixtures ? null : mediaCollectionJsonLd(getSiteUrl());
  if (!hasStories) {
    return (
      <>
        <JsonLd data={jsonLd} />
        <MediaEmptyState />
      </>
    );
  }
  return (
    <>
      <JsonLd data={jsonLd} />
      {catalog.usingFixtures ? <SampleBanner /> : null}
      <HomeView composition={composition} />
    </>
  );
}
