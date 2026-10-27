export function StorageNotice({ failed = false }: { failed?: boolean }) {
  return (
    <div className="rounded-xl border border-[#f3d7a1] bg-[#fff8eb] px-4 py-3 text-sm text-[#8a5a12]">
      {failed
        ? "Articles could not be loaded. Publishing stays closed until Media storage responds."
        : "Media storage is not ready. Apply the media_articles migration before creating or publishing stories."}
    </div>
  );
}
