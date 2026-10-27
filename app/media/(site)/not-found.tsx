import Link from "next/link";

export default function MediaNotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#fd5000]">Jimvio Media</p>
      <h1 className="mt-3 text-3xl font-bold tracking-[-0.03em] text-[#172033]">Story not found</h1>
      <p className="mt-3 text-sm leading-relaxed text-[#667085]">
        That article is not published, or the link is out of date.
      </p>
      <Link href="/media" className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#fd5000] px-4 text-sm font-semibold text-white">
        Back to Media
      </Link>
    </div>
  );
}
