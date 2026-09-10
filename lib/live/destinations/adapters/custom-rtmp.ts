import { platformCapabilities } from "../capabilities";
import { buildPushUrl, validateRtmpUrl } from "../ssrf";
import type {
  AdapterContext,
  AdapterResult,
  DestinationAdapter,
} from "./base";
import type { PreparedIngest } from "../types";

export class CustomRtmpDestinationAdapter implements DestinationAdapter {
  readonly platform = "custom_rtmp" as const;
  readonly capabilities = platformCapabilities("custom_rtmp");

  async validate(ctx: AdapterContext): Promise<AdapterResult<{ ok: true }>> {
    const url = ctx.credentials?.rtmpUrl;
    const key = ctx.credentials?.streamKey;
    if (!url || !key) {
      return {
        ok: false,
        error: "Custom RTMP URL and stream key are required.",
        permanent: true,
      };
    }
    const check = validateRtmpUrl(url);
    if (!check.ok) {
      return { ok: false, error: check.error, permanent: true };
    }
    return { ok: true, value: { ok: true } };
  }

  async prepare(ctx: AdapterContext): Promise<AdapterResult<PreparedIngest>> {
    const validated = await this.validate(ctx);
    if (!validated.ok) return validated;

    const url = ctx.credentials!.rtmpUrl!;
    const key = ctx.credentials!.streamKey!;
    const check = validateRtmpUrl(url);
    if (!check.ok) {
      return { ok: false, error: check.error, permanent: true };
    }

    let pushUrl: string;
    try {
      pushUrl = buildPushUrl(check.normalizedUrl, key);
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Invalid stream key",
        permanent: true,
      };
    }

    return {
      ok: true,
      value: {
        rtmpUrl: check.normalizedUrl,
        pushUrl,
        providerBroadcastId: null,
        providerStreamId: null,
      },
    };
  }

  async start(): Promise<AdapterResult<void>> {
    return { ok: true, value: undefined };
  }

  async stop(): Promise<AdapterResult<void>> {
    return { ok: true, value: undefined };
  }
}
