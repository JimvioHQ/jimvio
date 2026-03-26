import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PawaPayCallbackBody = Record<string, unknown>;

function pickDepositId(body: PawaPayCallbackBody): string | undefined {
  const top = body.depositId;
  if (typeof top === "string" && top.trim()) return top.trim();
  const data = body.data;
  if (data && typeof data === "object" && data !== null && "depositId" in data) {
    const id = (data as { depositId?: unknown }).depositId;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return undefined;
}

function pickStatus(body: PawaPayCallbackBody): string | undefined {
  const top = body.status;
  if (typeof top === "string" && top.trim()) return top.trim();
  const data = body.data;
  if (data && typeof data === "object" && data !== null && "status" in data) {
    const s = (data as { status?: unknown }).status;
    if (typeof s === "string" && s.trim()) return s.trim();
  }
  return undefined;
}

/**
 * Public webhook URL for PawaPay sandbox callbacks when using ngrok:
 * https://<your-ngrok-host>/api/webhook
 *
 * Configure the same URL under Deposits in the PawaPay dashboard (Callback URLs).
 */
export async function POST(req: Request) {
  let body: PawaPayCallbackBody;
  try {
    body = (await req.json()) as PawaPayCallbackBody;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Full payload for debugging in terminal / log drain
  console.log("[PawaPay /api/webhook] body:", JSON.stringify(body, null, 2));

  const depositId = pickDepositId(body);
  const statusRaw = pickStatus(body);
  const status = (statusRaw || "").toUpperCase();

  if (depositId) {
    console.log("[PawaPay /api/webhook] depositId:", depositId, "status:", statusRaw ?? "(none)");
  }

  if (status === "COMPLETED") {
    console.log("Payment successful", depositId ?? "");
  } else if (status === "FAILED") {
    console.log("Payment failed", depositId ?? "");
  } else if (status === "PENDING" || status === "PROCESSING" || status === "ACCEPTED") {
    console.log("Payment pending", depositId ?? "");
  } else if (status) {
    console.log("[PawaPay /api/webhook] unhandled status:", status, depositId ?? "");
  }

  return NextResponse.json({ success: true });
}
