/**
 * Server-only: confirm a PawaPay deposit is COMPLETED via the provider API.
 * Fail closed — never trust callback body status alone.
 */
export async function confirmPawaPayDepositCompleted(depositId: string): Promise<boolean> {
  const apiToken = process.env.PAWAPAY_API_TOKEN?.trim();
  if (!apiToken || !depositId.trim()) return false;

  const isSandbox = process.env.PAWAPAY_ENV === "sandbox";
  const baseUrl = isSandbox ? "https://api.sandbox.pawapay.io" : "https://api.pawapay.io";

  try {
    const verifyRes = await fetch(`${baseUrl}/deposits/${encodeURIComponent(depositId)}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
      cache: "no-store",
    });
    if (!verifyRes.ok) return false;
    const verifyData = await verifyRes.json();
    const depositEntry = Array.isArray(verifyData) ? verifyData[0] : verifyData;
    const confirmedStatus = String(depositEntry?.status ?? "").toUpperCase();
    return confirmedStatus === "COMPLETED";
  } catch {
    return false;
  }
}
