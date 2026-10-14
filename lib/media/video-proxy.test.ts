import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isStreamableVideoStatus,
  parseProductVideoProxyTarget,
  videoProxyResponseHeaders,
  videoProxyUpstreamHeaders,
} from "./video-proxy.ts";

const SAMPLE =
  "https://download-only-api.cjdropshipping.com/71e73320ad1171edbf8f6723a78f0102/sample-ld.mp4";

describe("product video proxy", () => {
  it("forwards byte ranges and does not put the source url in request headers", () => {
    const headers = videoProxyUpstreamHeaders("bytes=0-1");
    assert.equal(headers.get("Range"), "bytes=0-1");
    assert.equal(headers.get("Referer"), "https://developers.cjdropshipping.com/");
    assert.equal([...headers.values()].some((value) => value.includes("cjdropshipping.com/71")), false);
  });

  it("allows the known CJ video hosts and rejects other origins", () => {
    assert.ok(parseProductVideoProxyTarget(SAMPLE));
    assert.equal(parseProductVideoProxyTarget("https://evil.example/video.mp4"), null);
    assert.equal(parseProductVideoProxyTarget("http://download-only-api.cjdropshipping.com/a.mp4"), null);
    assert.equal(parseProductVideoProxyTarget(null), null);
  });

  it("preserves 206 range metadata for mobile Safari", () => {
    const upstream = new Headers({
      "content-type": "video/mp4",
      "content-length": "2",
      "content-range": "bytes 0-1/3898173",
      "accept-ranges": "bytes",
    });
    const headers = videoProxyResponseHeaders(upstream, 206);
    assert.equal(headers.get("content-type"), "video/mp4");
    assert.equal(headers.get("content-range"), "bytes 0-1/3898173");
    assert.equal(headers.get("accept-ranges"), "bytes");
    assert.equal(headers.get("vary"), "Range");
    assert.equal(isStreamableVideoStatus(206), true);
    assert.equal(isStreamableVideoStatus(404), false);
  });

  it("does not advertise a cached full response as the range response", () => {
    const headers = videoProxyResponseHeaders(new Headers({ "content-type": "video/mp4" }), 200);
    assert.equal(headers.get("vary"), "Range");
    assert.match(headers.get("cache-control") ?? "", /max-age=/);
  });
});
