import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleFeedback } from "@/components/support/article-feedback";
import { getSupportArticle, relatedArticles } from "@/lib/support/articles";
import { categoryById } from "@/lib/support/format";

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getSupportArticle(slug);
  if (!article) notFound();
  const category = categoryById(article.category);
  const related = relatedArticles(article);

  return (
    <article className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#FF5A1F]">
        <Link href={category?.href ?? "/help"}>{category?.title}</Link>
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{article.title}</h1>
      <p className="mt-2 text-xs text-[#6B7280]">Updated {article.updated}</p>
      <p className="mt-6 text-base leading-7">{article.lead}</p>
      <h2 className="mt-8 text-lg font-semibold">What to do</h2>
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6">
        {article.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <h2 className="mt-8 text-lg font-semibold">Eligibility</h2>
      <p className="mt-2 text-sm leading-6 text-[#374151]">{article.eligibility}</p>
      <h2 className="mt-8 text-lg font-semibold">If something goes wrong</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
        {article.troubleshooting.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <p className="mt-6 text-sm leading-6">{article.next}</p>
      <div className="mt-8">
        <ArticleFeedback slug={article.slug} />
      </div>
      <div className="mt-6 flex flex-wrap gap-4 text-sm">
        <Link href="/help/tickets/new" className="font-semibold text-[#FF5A1F]">
          Create a ticket
        </Link>
        <Link href="/help/contact" className="font-semibold text-[#111827]">
          Contact support
        </Link>
      </div>
      {related.length > 0 ? (
        <aside className="mt-8">
          <h2 className="text-lg font-semibold">Related articles</h2>
          <ul className="mt-3 space-y-2">
            {related.map((item) => (
              <li key={item.slug}>
                <Link href={`/help/articles/${item.slug}`} className="text-sm font-medium text-[#FF5A1F]">
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </article>
  );
}
