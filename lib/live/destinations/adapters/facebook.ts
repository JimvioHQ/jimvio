import { platformCapabilities, platformReadiness } from "../capabilities";
import { ApprovalRequiredAdapter, type DestinationAdapter } from "./base";
import type {
  AdapterContext,
  AdapterResult,
} from "./base";
import type { EncryptedCredentialPayload, PreparedIngest } from "../types";

const GRAPH = "https://graph.facebook.com/v21.0";

function metaCreds(): { id: string; secret: string } | null {
  const id = process.env.META_APP_ID?.trim();
  const secret = process.env.META_APP_SECRET?.trim();
  if (!id || !secret) return null;
  return { id, secret };
}

/**
 * Facebook Page Live via official Live Video API.
 * Only active when META_LIVE_VIDEO_ENABLED=true (Jimvio App Review complete).
 */
export class FacebookDestinationAdapter implements DestinationAdapter {
  readonly platform = "facebook" as const;
  readonly capabilities = platformCapabilities("facebook");

  private gate(): AdapterResult<never> | null {
    const readiness = platformReadiness("facebook");
    if (readiness.status === "requires_approval") {
      return {
        ok: false,
        error:
          readiness.message ??
          "Facebook Live requires additional permissions.",
        permanent: true,
      };
    }
    return null;
  }

  async validate(ctx: AdapterContext): Promise<AdapterResult<{ ok: true }>> {
    const blocked = this.gate();
    if (blocked) return blocked;
    if (!ctx.credentials?.pageAccessToken && !ctx.credentials?.accessToken) {
      return {
        ok: false,
        error: "Facebook Page is not connected.",
        permanent: true,
      };
    }
    return { ok: true, value: { ok: true } };
  }

  async prepare(ctx: AdapterContext): Promise<AdapterResult<PreparedIngest>> {
    const blocked = this.gate();
    if (blocked) return blocked;

    const pageId = ctx.providerPageId || ctx.providerAccountId;
    const token =
      ctx.credentials?.pageAccessToken || ctx.credentials?.accessToken;
    if (!pageId || !token) {
      return {
        ok: false,
        error: "Facebook Page connection is incomplete.",
        permanent: true,
      };
    }

    const res = await fetch(
      `${GRAPH}/${encodeURIComponent(pageId)}/live_videos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "LIVE_NOW",
          title: ctx.metadata.title.slice(0, 255),
          description: ctx.metadata.description ?? "",
          access_token: token,
        }),
      }
    );

    if (!res.ok) {
      return {
        ok: false,
        error: "Facebook Live requires additional permissions or eligibility.",
        permanent: res.status === 403 || res.status === 400,
      };
    }

    const json = (await res.json()) as {
      id?: string;
      secure_stream_url?: string;
      stream_url?: string;
    };
    const pushUrl = json.secure_stream_url || json.stream_url;
    if (!json.id || !pushUrl) {
      return { ok: false, error: "Facebook did not return a stream URL." };
    }

    // secure_stream_url is typically rtmps://host/rtmp/KEY — use as full push URL
    const lastSlash = pushUrl.lastIndexOf("/");
    const rtmpUrl = lastSlash > 8 ? pushUrl.slice(0, lastSlash) : pushUrl;

    return {
      ok: true,
      value: {
        rtmpUrl,
        pushUrl,
        providerBroadcastId: json.id,
        providerStreamId: json.id,
      },
    };
  }

  async start(): Promise<AdapterResult<void>> {
    return { ok: true, value: undefined };
  }

  async stop(
    ctx: AdapterContext & { prepared?: PreparedIngest | null }
  ): Promise<AdapterResult<void>> {
    const blocked = this.gate();
    if (blocked) return { ok: true, value: undefined };
    const id = ctx.prepared?.providerBroadcastId;
    const token =
      ctx.credentials?.pageAccessToken || ctx.credentials?.accessToken;
    if (!id || !token) return { ok: true, value: undefined };

    await fetch(`${GRAPH}/${encodeURIComponent(id)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        end_live_video: true,
        access_token: token,
      }),
    }).catch(() => undefined);

    return { ok: true, value: undefined };
  }
}

export function createFacebookAdapter(): DestinationAdapter {
  const readiness = platformReadiness("facebook");
  if (readiness.status === "requires_approval") {
    return new ApprovalRequiredAdapter(
      "facebook",
      platformCapabilities("facebook"),
      readiness.message ?? "Facebook Live requires platform approval."
    );
  }
  return new FacebookDestinationAdapter();
}

export function facebookAuthUrl(input: {
  state: string;
  redirectUri: string;
}): string | null {
  if (platformReadiness("facebook").status === "requires_approval") return null;
  const creds = metaCreds();
  if (!creds) return null;
  const params = new URLSearchParams({
    client_id: creds.id,
    redirect_uri: input.redirectUri,
    state: input.state,
    response_type: "code",
    scope: [
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "publish_video",
    ].join(","),
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
}

export async function exchangeFacebookCode(input: {
  code: string;
  redirectUri: string;
}): Promise<
  AdapterResult<{
    credentials: EncryptedCredentialPayload;
    pageId: string;
    pageName: string;
    avatarUrl: string | null;
  }>
> {
  if (platformReadiness("facebook").status === "requires_approval") {
    return {
      ok: false,
      error: "Facebook Live requires platform approval.",
      permanent: true,
    };
  }
  const creds = metaCreds();
  if (!creds) {
    return { ok: false, error: "Meta app credentials are not configured.", permanent: true };
  }

  const tokenRes = await fetch(
    `${GRAPH}/oauth/access_token?` +
      new URLSearchParams({
        client_id: creds.id,
        client_secret: creds.secret,
        redirect_uri: input.redirectUri,
        code: input.code,
      }).toString()
  );
  if (!tokenRes.ok) {
    return { ok: false, error: "Facebook authorization failed.", permanent: true };
  }
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) {
    return { ok: false, error: "Facebook authorization failed.", permanent: true };
  }

  const pagesRes = await fetch(
    `${GRAPH}/me/accounts?fields=id,name,access_token,picture&access_token=${encodeURIComponent(tokens.access_token)}`
  );
  if (!pagesRes.ok) {
    return {
      ok: false,
      error: "Could not list Facebook Pages. Page ownership is required.",
      permanent: true,
    };
  }
  const pagesJson = (await pagesRes.json()) as {
    data?: Array<{
      id: string;
      name: string;
      access_token: string;
      picture?: { data?: { url?: string } };
    }>;
  };
  const page = pagesJson.data?.[0];
  if (!page) {
    return {
      ok: false,
      error: "No Facebook Page found. Connect a Page you administer.",
      permanent: true,
    };
  }

  return {
    ok: true,
    value: {
      credentials: {
        accessToken: tokens.access_token,
        pageAccessToken: page.access_token,
      },
      pageId: page.id,
      pageName: page.name,
      avatarUrl: page.picture?.data?.url ?? null,
    },
  };
}
