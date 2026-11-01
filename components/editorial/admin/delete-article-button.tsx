"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { permanentlyDeleteMediaArticle } from "@/lib/editorial/actions";

export function DeleteArticleButton({ articleId, title, canDelete }: { articleId: string; title: string; canDelete: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, startTransition] = useTransition();
  const matches = confirmation.trim() === title;

  function remove() {
    if (!matches || pending) return;
    startTransition(async () => {
      const result = await permanentlyDeleteMediaArticle(articleId, confirmation);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Article permanently deleted.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" disabled={!canDelete} title={canDelete ? "Permanently delete this unpublished article" : "Unpublish or archive this article before deleting"} onClick={() => { setConfirmation(""); setOpen(true); }} className="font-semibold text-[#b42318] hover:underline disabled:cursor-not-allowed disabled:opacity-40">
        Delete
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#101828]/60 p-4" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="delete-article-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="delete-article-title" className="text-lg font-bold text-[#101828]">Permanently delete article?</h2>
            <p className="mt-2 text-sm leading-6 text-[#475467]">This cannot be undone. The article and its image-rights record will be deleted. The image file itself will be retained to avoid removing an asset used elsewhere.</p>
            <p className="mt-4 break-words rounded-lg bg-[#f9fafb] p-3 text-sm font-semibold text-[#101828]">{title}</p>
            <label className="mt-4 block text-sm font-semibold text-[#344054]">
              Type the full article title to confirm
              <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-[#d0d5dd] px-3 text-sm font-normal outline-none focus:border-[#fd5000]" autoComplete="off" />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={pending} onClick={() => setOpen(false)} className="h-10 rounded-lg border border-[#d0d5dd] px-4 text-sm font-semibold text-[#344054]">Cancel</button>
              <button type="button" disabled={!matches || pending} onClick={remove} className="h-10 rounded-lg bg-[#b42318] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{pending ? "Deleting…" : "Delete permanently"}</button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
