import { NextResponse } from "next/server";
import { WebhookReceiver } from "livekit-server-sdk";
import { getLiveKitApiKey, getLiveKitApiSecret } from "@/lib/live/livekit-config";
import { markRecordingReady } from "@/lib/live/egress";
import { extractEgressFileResult } from "@/lib/live/egress-file-result";
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
      const file = extractEgressFileResult(info);
      const location = file.location;
      const hasStream = (info.streamResults?.length ?? 0) > 0;
      const hasFile = Boolean(location);

      if (event.event === "egress_ended" && (hasFile || !hasStream)) {
        const error = failed
          ? info.error || "Egress failed"
          : !location
            ? "Egress completed without a storage location"
            : null;
        await markRecordingReady({
          egressId,
          cloudinaryUrl: error ? null : location,
          durationSeconds: file.durationNs
            ? Math.round(file.durationNs / 1e9)
            : null,
          byteSize: file.sizeBytes,
          error,
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

      liveStudioLog(failed || (!hasFile && !hasStream) ? "error" : "info", "egress_webhook", {
        egressId,
        failed,
        hasLocation: hasFile,
        hasStream,
        fileSource: file.source,
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
