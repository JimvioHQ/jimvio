import Link from "next/link";
import { notFound } from "next/navigation";
import { SupportSearch } from "@/components/support/support-search";
import { articlesInCategory } from "@/lib/support/articles";
import { SUPPORT_CATEGORIES } from "@/lib/support/types";

export default async function HelpTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = SUPPORT_CATEGORIES.find((item) => item.id === slug);
  if (!category) notFound();
  const articles = articlesInCategory(category.id);
  const related = SUPPORT_CATEGORIES.filter((item) => item.id !== category.id).slice(0, 4);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">{category.title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4B5563]">{category.summary}</p>
      </header>
      <SupportSearch category={category.id} placeholder={`Search ${category.title}`} />
      <ul className="space-y-3">
        {articles.map((article) => (
          <li key={article.slug} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <Link href={`/help/articles/${article.slug}`} className="font-semibold hover:text-[#FF5A1F]">
              {article.title}
            </Link>
            <p className="mt-1 text-sm text-[#6B7280]">{article.lead}</p>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3 text-sm">
        {related.map((item) => (
          <Link key={item.id} href={item.href} className="rounded-full border border-neutral-200 bg-white px-3 py-1">
            {item.title}
          </Link>
        ))}
        <Link href="/help/contact" className="rounded-full bg-[#FF5A1F] px-3 py-1 font-semibold text-white">
          Contact support
        </Link>
      </div>
    </div>
  );
}
