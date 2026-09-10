import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { getLiveKitApiKey, getLiveKitApiSecret } from "@/lib/live/livekit-config";
import { markRecordingReady } from "@/lib/live/egress";
import { handleStreamEgressWebhook } from "@/lib/live/destinations/destination-manager";
import { liveStudioLog } from "@/lib/live/observability";

export const dynamic = "force-dynamic";

/**
 * LiveKit webhook — egress_ended → mark replay ready + multistream destination status.
 * Configure in LiveKit Cloud → Settings → Webhooks → /api/live/egress/webhook
 */
export async function POST(req: Request) {
  const apiKey = getLiveKitApiKey();
  const apiSecret = getLiveKitApiSecret();
  if (!apiKey || !apiSecret) {
    liveStudioLog("error", "egress_webhook_failed", { reason: "livekit_unconfigured" });
    return NextResponse.json({ error: "LiveKit not configured" }, { status: 503 });
  }

  const body = await req.text();
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";

  try {
    const receiver = new WebhookReceiver(apiKey, apiSecret);
    const event = await receiver.receive(body, authHeader);

    if (
      (event.event === "egress_ended" || event.event === "egress_updated") &&
      event.egressInfo
    ) {
      const info = event.egressInfo;
      const egressId = info.egressId;
      const failed = Boolean(info.error);
      const fileResult = info.fileResults?.[0];
      const location = fileResult?.location || fileResult?.filename || null;
      const hasStream = (info.streamResults?.length ?? 0) > 0;

      if (event.event === "egress_ended" && (fileResult || !hasStream)) {
        await markRecordingReady({
          egressId,
          cloudinaryUrl: location,
          durationSeconds: fileResult?.duration
            ? Math.round(Number(fileResult.duration) / 1e9)
            : null,
          byteSize: fileResult?.size ? Number(fileResult.size) : null,
          error: failed ? info.error || "Egress failed" : null,
        });
      }

      if (hasStream || failed) {
        await handleStreamEgressWebhook({
          egressId,
          error: failed ? info.error || "Stream egress failed" : null,
          streamResults: (info.streamResults ?? []).map((r) => ({
            url: undefined,
            status: r.status,
          })),
        });
      }

      liveStudioLog(failed ? "error" : "info", "egress_webhook", {
        egressId,
        failed,
        hasLocation: Boolean(location),
        hasStream,
        event: event.event,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    liveStudioLog("error", "egress_webhook_failed", {
      error: e instanceof Error ? e.message : "verify_failed",
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Webhook verify failed" },
      { status: 401 }
    );
  }
}
