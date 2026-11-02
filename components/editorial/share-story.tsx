"use client";

import { useState } from "react";

export function ShareStory({ title, url }: { title: string; url: string }) {
  const [notice, setNotice] = useState("");
  const [manual, setManual] = useState(false);

  async function onShare() {
    setNotice("");
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setManual(false);
      setNotice("Link copied.");
    } catch {
      setManual(true);
      setNotice("Select the address and copy it.");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={onShare}
        className="inline-flex h-10 items-center rounded-full border border-[#ffd0bc] bg-[#fff5f0] px-4 text-sm font-bold text-[#df4b10] shadow-sm transition hover:border-[#ffb18e] hover:bg-[#ffebe1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]"
      >
        Share
      </button>
      {notice ? (
        <p className="text-xs text-[#667085]" role="status">
          {notice}
        </p>
      ) : null}
      {manual ? (
        <input
          readOnly
          value={url}
          aria-label="Article address"
          onFocus={(event) => event.currentTarget.select()}
          className="h-9 w-full max-w-sm rounded-lg border border-[#e6e8ee] px-2 text-xs text-[#172033] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fd5000]"
        />
      ) : null}
    </div>
  );
}
