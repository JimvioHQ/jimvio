import Link from "next/link";

export default function MediaAdminNotFound() {
  return (
    <div className="rounded-2xl border border-[#eceff3] bg-white px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-[#172033]">That editorial page is not here</h1>
      <Link href="/media/admin/articles" className="mt-5 inline-flex h-10 items-center rounded-lg bg-[#fd5000] px-4 text-sm font-semibold text-white">
        Back to articles
      </Link>
    </div>
  );
}
