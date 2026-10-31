import { createClient } from "@/lib/supabase/server";
import { getSupabaseUrl } from "@/lib/supabase/public-env";
import { getAdminDB } from "@/services/base";
import { isBootstrapAdminEmail } from "@/lib/auth/platform-admin";
import { previewPrivilegedDenied } from "@/lib/ops/preview-guard";

export type McpIdentity = {
  userId: string;
  email: string | null;
  clientId: string;
};

export type McpAuthResult =
  | { ok: true; identity: McpIdentity }
  | { ok: false; status: 401 | 403 | 503; reason: string };

export function getMcpResourceUrl(): string {
  const value = process.env.MCP_RESOURCE_URL?.trim() || "https://www.jimvio.com/api/mcp";
  const parsed = new URL(value);
  if (parsed.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("MCP_RESOURCE_URL must use HTTPS in production.");
  }
  return parsed.toString().replace(/\/$/, "");
}

export function getMcpResourceMetadataUrl(): string {
  const resource = new URL(getMcpResourceUrl());
  return new URL("/.well-known/oauth-protected-resource/api/mcp", resource.origin).toString();
}

export function validateMcpTokenClaims(
  claims: Record<string, unknown>,
  resource = getMcpResourceUrl(),
  issuer = `${getSupabaseUrl().replace(/\/$/, "")}/auth/v1`,
): string | null {
  if (claims.iss !== issuer) return "The access token was issued by an unexpected authority.";
  const audience = claims.aud;
  const audiences = typeof audience === "string" ? [audience] : Array.isArray(audience) ? audience : [];
  if (!audiences.some((value) => value === resource)) {
    return "The access token is not bound to the Jimvio Media MCP resource.";
  }
  if (typeof claims.client_id !== "string" || !claims.client_id.trim()) {
    return "The access token is missing its OAuth client identifier.";
  }
  if (typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000)) {
    return "The access token has expired.";
  }
  return null;
}

function decodeClaims(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function authenticateMcpRequest(request: Request): Promise<McpAuthResult> {
  if (previewPrivilegedDenied()) {
    return { ok: false, status: 403, reason: "Privileged MCP operations are disabled in Preview." };
  }

  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) return { ok: false, status: 401, reason: "A valid OAuth bearer token is required." };

  const token = match[1];
  const claims = decodeClaims(token);
  if (!claims) return { ok: false, status: 401, reason: "The bearer token is malformed." };
  const claimError = validateMcpTokenClaims(claims);
  if (claimError) return { ok: false, status: 401, reason: claimError };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser(token);
    const user = data.user;
    if (error || !user) return { ok: false, status: 401, reason: "The bearer token is invalid or expired." };

    const adminDb = getAdminDB() as any;
    const { data: roles, error: roleError } = await adminDb
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (roleError) return { ok: false, status: 503, reason: "Administrator authorization could not be checked." };
    const roleAdmin = Array.isArray(roles) && roles.some((row: { role?: string }) =>
      row.role === "admin" || row.role === "super_admin"
    );
    const bootstrapAdmin = isBootstrapAdminEmail(user.email);
    if (!roleAdmin && !bootstrapAdmin) {
      return { ok: false, status: 403, reason: "Jimvio platform administrator access is required." };
    }

    return {
      ok: true,
      identity: {
        userId: user.id,
        email: user.email ?? null,
        clientId: String(claims.client_id),
      },
    };
  } catch {
    return { ok: false, status: 503, reason: "MCP authentication is temporarily unavailable." };
  }
}
