import { platformCapabilities } from "../capabilities";
import type { DestinationAdapter, AdapterContext, AdapterResult } from "./base";
import type { PreparedIngest } from "../types";

/** Jimvio is the primary Live session — no external egress. */
export class JimvioDestinationAdapter implements DestinationAdapter {
  readonly platform = "jimvio" as const;
  readonly capabilities = platformCapabilities("jimvio");

  async validate(): Promise<AdapterResult<{ ok: true }>> {
    return { ok: true, value: { ok: true } };
  }

  async prepare(): Promise<AdapterResult<PreparedIngest>> {
    return {
      ok: true,
      value: {
        rtmpUrl: "jimvio://local",
        pushUrl: "jimvio://local",
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

  async getStatus(ctx: AdapterContext): Promise<AdapterResult<{ status: string }>> {
    return { ok: true, value: { status: `jimvio:${ctx.destinationId}` } };
  }
}
