import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleView } from "@/components/editorial/article-view";
import { JsonLd } from "@/components/editorial/json-ld";
import { MediaErrorState } from "@/components/editorial/presentation";
import { loadCatalog } from "@/lib/editorial/catalog";
import { absoluteImageUrl, breadcrumbJsonLd, mediaTitle, metaDescription, neighborArticles, publicCorrection, relatedArticles } from "@/lib/editorial/discover";
import { articleJsonLd } from "@/lib/editorial/publish";
import { getPublishedArticle } from "@/lib/editorial/public-store";
import { getSiteUrl } from "@/lib/site-url";
import { categoryLabel, isValidSlug } from "@/lib/editorial/validate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidSlug(slug)) return { title: "Story not found", robots: { index: false, follow: false } };
  const site = getSiteUrl();
  const catalog = await loadCatalog();
  if (!catalog.usingFixtures && catalog.unavailable) {
    const canonical = `${site}/media/article/${slug}`;
    const description = "Real stories and deeper insights from Jimvio Media.";
    return {
      title: { absolute: "Jimvio Media" },
      description,
      alternates: { canonical },
      robots: { index: false, follow: false },
      openGraph: {
        title: "Jimvio Media",
        description,
        url: canonical,
        siteName: "Jimvio Media",
        locale: "en_US",
        type: "website",
      },
    };
  }
  const article = catalog.usingFixtures
    ? catalog.articles.find((item) => item.slug === slug)
    : await getPublishedArticle(slug);
  if (!article) return { title: "Story not found", robots: { index: false, follow: false } };
  const title = mediaTitle(article.seoTitle || article.title);
  const description = metaDescription(article.seoDescription, article.excerpt);
  const canonical = `${site}/media/article/${article.slug}`;
  const image = absoluteImageUrl(site, article.imageUrl);
  const socialTitle = typeof title === "string" ? title : title.absolute;
  const indexable = !article.fixture;
  return {
    title,
    description,
    alternates: { canonical },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      title: socialTitle,
      description,
      type: "article",
      url: canonical,
      siteName: "Jimvio Media",
      locale: "en_US",
      publishedTime: article.fixture ? undefined : article.publishedAt ?? undefined,
      modifiedTime:
        !article.fixture && publicCorrection(article.correctionNote) ? article.updatedAt ?? undefined : undefined,
      images: image ? [{ url: image, alt: article.imageAlt || article.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: socialTitle,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function MediaArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isValidSlug(slug)) notFound();
  const catalog = await loadCatalog();
  if (!catalog.usingFixtures && catalog.unavailable) return <MediaErrorState />;
  const article = catalog.usingFixtures
    ? catalog.articles.find((item) => item.slug === slug)
    : await getPublishedArticle(slug);
  if (!article) notFound();
  const site = getSiteUrl();
  const related = relatedArticles(catalog.articles, article, 3);
  const neighbors = neighborArticles(catalog.articles, article);
  const jsonLd = articleJsonLd(article, site);
  const crumbs = article.fixture
    ? null
    : breadcrumbJsonLd(site, [
        { name: "Media", path: "/media" },
        { name: categoryLabel(article.category), path: `/media/category/${article.category}` },
        { name: article.title, path: `/media/article/${article.slug}` },
      ]);

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={crumbs} />
      <ArticleView
        article={article}
        related={related}
        previous={neighbors.previous}
        next={neighbors.next}
        shareUrl={article.fixture ? null : `${site}/media/article/${article.slug}`}
      />
    </>
  );
}
