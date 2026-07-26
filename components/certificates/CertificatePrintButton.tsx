"use client";

export function CertificatePrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
    >
      Print / Save PDF
    </button>
  );
}
