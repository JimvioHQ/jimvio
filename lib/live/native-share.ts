export type NativeShareResult = "shared" | "cancelled" | "unsupported" | "failed";

export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

function isShareCancel(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String((err as { name?: string }).name) : "";
  return name === "AbortError";
}

export async function nativeShareLive(input: {
  title: string;
  text: string;
  url: string;
}): Promise<NativeShareResult> {
  if (!canUseNativeShare()) return "unsupported";
  try {
    const payload = {
      title: input.title,
      text: input.text,
      url: input.url,
    };
    if (typeof navigator.canShare === "function" && !navigator.canShare(payload)) {
      return "unsupported";
    }
    await navigator.share(payload);
    return "shared";
  } catch (err) {
    if (isShareCancel(err)) return "cancelled";
    return "failed";
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      /* fall through */
    }
  }
  if (typeof document === "undefined") return false;
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
