import type { Metadata } from "next";
import Link from "next/link";
import { InfoLinkList, InfoSection, PublicInfoPage } from "@/components/layout/public-info-page";
import { pageMetadata } from "@/lib/seo";
import { getPublishedBlogPosts } from "@/services/db";

export const metadata: Metadata = pageMetadata("updates");

const UPDATE_PATTERN = /update|release|announce|changelog|news/i;

export default async function PlatformUpdatesPage() {
  const posts = await getPublishedBlogPosts(24).catch(() => []);
  const updates = posts.filter((post) =>
    UPDATE_PATTERN.test(`${post.category} ${post.title}`),
  );

  return (
    <PublicInfoPage
      eyebrow="Resources"
      title="Platform Updates"
      lede="Product announcements are published in the Jimvio Journal when they exist. This page does not invent release notes."
    >
      <InfoSection title="Announcements">
        {updates.length > 0 ? (
          <InfoLinkList
            items={updates.map((post) => ({
              href: `/blog/${post.slug}`,
              label: post.title,
              detail: post.excerpt || post.category,
            }))}
          />
        ) : (
          <p>
            No platform announcement is published right now. The{" "}
            <Link href="/blog" className="font-medium text-[var(--color-accent)] hover:underline">
              Journal
            </Link>{" "}
            lists every published article.
          </p>
        )}
      </InfoSection>

      <InfoSection title="System status">
        <p>
          Service availability is reported separately from product announcements.
        </p>
        <p>
          <Link
            href={process.env.STATUS_WEBSITE_URL || "https://status.jimvio.com"}
            className="font-medium text-[var(--color-accent)] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open the status page
          </Link>
        </p>
      </InfoSection>
    </PublicInfoPage>
  );
}
