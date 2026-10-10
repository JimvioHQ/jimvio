import Link from "next/link";
import { SUPPORT_ARTICLES } from "@/lib/support/articles";
import { categoryById } from "@/lib/support/format";

export default function HelpArticlesPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold">Help articles</h1>
      <p className="mt-2 text-sm text-[#6B7280]">{SUPPORT_ARTICLES.length} published articles.</p>
      <ul className="mt-6 space-y-3">
        {SUPPORT_ARTICLES.map((article) => (
          <li key={article.slug} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#FF5A1F]">
              {categoryById(article.category)?.title}
            </p>
            <Link href={`/help/articles/${article.slug}`} className="mt-1 block font-semibold hover:text-[#FF5A1F]">
              {article.title}
            </Link>
            <p className="mt-1 text-sm text-[#6B7280]">{article.lead}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
