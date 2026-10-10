"use client";

export function OpenSupportChat() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("jimvio-support-open"))}
      className="rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-sm hover:border-[#FF5A1F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
    >
      <h2 className="font-semibold">Chat with support</h2>
      <p className="mt-1 text-sm text-[#6B7280]">
        Start with help articles. Ask for a person when you want the queue.
      </p>
    </button>
  );
}
