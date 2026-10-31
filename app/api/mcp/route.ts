import { NextResponse } from "next/server";
import { authenticateMcpRequest, getMcpResourceMetadataUrl } from "@/lib/auth/mcp-token";
import {
  createMediaDraft,
  getMediaArticle,
  isPublishConfirmationValid,
  publishMediaArticle,
  searchMediaArticles,
  updateMediaArticle,
  uploadMediaFeaturedImage,
  verifyPublishedArticle,
} from "@/lib/editorial/mcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOOLS = [
  {
    name: "search_media_articles",
    description: "Search Jimvio Media articles by title, excerpt, slug, tags, category, or editorial status. Returns article metadata without full body HTML.",
    inputSchema: { type: "object", properties: { query: { type: "string" }, category: { type: "string" }, status: { type: "string", enum: ["draft", "review", "scheduled", "published", "archived"] }, limit: { type: "integer", minimum: 1, maximum: 100 } }, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_media_article",
    description: "Get a complete Jimvio Media article, its current revision timestamp, and recent audit history.",
    inputSchema: { type: "object", properties: { article_id: { type: "string", format: "uuid" } }, required: ["article_id"], additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "create_media_draft",
    description: "Create a validated Media draft. This tool never publishes an article.",
    inputSchema: { type: "object", properties: { title: { type: "string" }, excerpt: { type: "string" }, bodyHtml: { type: "string" }, category: { type: "string" }, kicker: { type: "string" }, imageUrl: { type: "string" }, imageAlt: { type: "string" }, section: { type: "string" }, tags: { type: "array", items: { type: "string" } }, seoTitle: { type: "string" }, seoDescription: { type: "string" }, authorName: { type: "string" }, slug: { type: "string" }, sourceName: { type: "string" }, sourceUrl: { type: "string" }, correctionNote: { type: "string" } }, required: ["title", "category"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "update_media_article",
    description: "Update an existing draft or review article using optimistic revision checking. This tool cannot publish.",
    inputSchema: { type: "object", properties: { article_id: { type: "string", format: "uuid" }, expectedUpdatedAt: { type: "string", format: "date-time" }, title: { type: "string" }, excerpt: { type: "string" }, bodyHtml: { type: "string" }, category: { type: "string" }, kicker: { type: "string" }, imageUrl: { type: "string" }, imageAlt: { type: "string" }, section: { type: "string" }, tags: { type: "array", items: { type: "string" } }, seoTitle: { type: "string" }, seoDescription: { type: "string" }, authorName: { type: "string" }, slug: { type: "string" }, sourceName: { type: "string" }, sourceUrl: { type: "string" }, correctionNote: { type: "string" } }, required: ["article_id", "expectedUpdatedAt"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "upload_media_featured_image",
    description: "Upload a JPEG, PNG, WebP, or GIF featured image to the existing Jimvio editorial Cloudinary folder. Supply raw base64 bytes; maximum 4 MB.",
    inputSchema: { type: "object", properties: { image_base64: { type: "string" }, filename: { type: "string" } }, required: ["image_base64"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  {
    name: "publish_media_article",
    description: "Publish one validated draft/review/scheduled article. Requires article_id, expectedUpdatedAt, and exact article-specific confirmation: PUBLISH <article_id>. This is the only MCP tool that publishes.",
    inputSchema: { type: "object", properties: { article_id: { type: "string", format: "uuid" }, expectedUpdatedAt: { type: "string", format: "date-time" }, confirmation: { type: "string" } }, required: ["article_id", "expectedUpdatedAt", "confirmation"], additionalProperties: false },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  },
  {
    name: "verify_published_article",
    description: "Verify that an article is marked published in Media storage and that its public Jimvio Media URL responds with the article page.",
    inputSchema: { type: "object", properties: { article_id: { type: "string", format: "uuid" }, slug: { type: "string" } }, additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  },
];

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...Object.fromEntries(new Headers(headers).entries()) },
  });
}

function rpcError(id: unknown, code: number, message: string) {
  return { jsonrpc: "2.0", id: id ?? null, error: { code, message } };
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Tool arguments must be an object.");
  return value as Record<string, unknown>;
}

function toolResult(value: unknown) {
  const structured = value && typeof value === "object" ? value : { result: value };
  return { content: [{ type: "text", text: JSON.stringify(structured, null, 2) }], structuredContent: structured, isError: false };
}

export async function POST(request: Request) {
  const auth = await authenticateMcpRequest(request);
  if (!auth.ok) {
    const headers = auth.status === 401
      ? { "WWW-Authenticate": `Bearer resource_metadata="${getMcpResourceMetadataUrl()}", scope="openid email profile"` }
      : undefined;
    return jsonResponse({ error: auth.reason }, auth.status, headers);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 1024 * 1024) return jsonResponse({ error: "MCP request is too large." }, 413);
  const accept = request.headers.get("accept") ?? "*/*";
  if (!accept.includes("*/*") && !accept.includes("application/json") && !accept.includes("text/event-stream")) {
    return jsonResponse({ error: "Accept must include application/json or text/event-stream." }, 406);
  }

  let message: Record<string, unknown>;
  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > 1024 * 1024) return jsonResponse({ error: "MCP request is too large." }, 413);
    const parsed = JSON.parse(new TextDecoder().decode(body));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid JSON-RPC message.");
    message = parsed as Record<string, unknown>;
  } catch {
    return jsonResponse(rpcError(null, -32700, "Parse error."), 400);
  }

  const id = message.id;
  const method = message.method;
  if (message.jsonrpc !== "2.0" || typeof method !== "string") {
    return jsonResponse(rpcError(id, -32600, "Invalid Request."), 400);
  }
  if (method.startsWith("notifications/")) return new Response(null, { status: 202 });
  if (method === "ping") return jsonResponse({ jsonrpc: "2.0", id, result: {} });
  if (method === "initialize") {
    const params = asObject(message.params ?? {});
    const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : "2025-03-26";
    const supported = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];
    const protocolVersion = supported.includes(requested) ? requested : "2025-03-26";
    return jsonResponse({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "jimvio-media-publisher", version: "1.0.0" },
        instructions: "Jimvio Media editorial tools. All operations require a Jimvio platform administrator. Publishing requires exact article-specific confirmation.",
      },
    });
  }
  if (method === "tools/list") {
    return jsonResponse({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
  }
  if (method !== "tools/call") return jsonResponse(rpcError(id, -32601, "Method not found."), 200);

  try {
    const params = asObject(message.params);
    const name = params.name;
    const args = asObject(params.arguments ?? {});
    if (typeof name !== "string") throw new Error("Tool name is required.");
    let result: unknown;
    switch (name) {
      case "search_media_articles":
        result = await searchMediaArticles(args);
        break;
      case "get_media_article":
        result = await getMediaArticle(String(args.article_id ?? ""));
        break;
      case "create_media_draft":
        result = await createMediaDraft(auth.identity, args);
        break;
      case "update_media_article":
        result = await updateMediaArticle(auth.identity, args);
        break;
      case "upload_media_featured_image":
        result = await uploadMediaFeaturedImage(auth.identity, args);
        break;
      case "publish_media_article":
        if (!isPublishConfirmationValid(String(args.article_id ?? ""), String(args.confirmation ?? ""))) {
          throw new Error("Explicit article-specific publication confirmation is required.");
        }
        result = await publishMediaArticle(auth.identity, args);
        break;
      case "verify_published_article":
        result = await verifyPublishedArticle(args);
        break;
      default:
        return jsonResponse(rpcError(id, -32602, "Unknown tool."), 200);
    }
    return jsonResponse({ jsonrpc: "2.0", id, result: toolResult(result) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCP tool failed.";
    return jsonResponse({
      jsonrpc: "2.0",
      id,
      result: { content: [{ type: "text", text: message }], isError: true },
    });
  }
}

export async function GET() {
  return jsonResponse({ error: "Use POST with the MCP Streamable HTTP transport." }, 405, { Allow: "POST" });
}

export async function DELETE() {
  return jsonResponse({ error: "This MCP endpoint is stateless; sessions are not created." }, 405, { Allow: "POST" });
}
