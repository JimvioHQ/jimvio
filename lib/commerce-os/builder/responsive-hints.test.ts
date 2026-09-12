import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { detectBuilderHints } from "./responsive-hints";
import { DEFAULT_THEME_SETTINGS, type ThemeSection } from "../themes/registry";

describe("detectBuilderHints", () => {
  it("flags long hero headlines for mobile", () => {
    const sections: ThemeSection[] = [
      {
        id: "hero-1",
        type: "hero",
        enabled: true,
        props: {
          headline:
            "This is an extremely long storefront hero headline that will struggle on small screens",
        },
      },
    ];
    const hints = detectBuilderHints({
      settings: DEFAULT_THEME_SETTINGS,
      sections,
    });
    const hit = hints.find((h) => h.id === "hero-headline-hero-1");
    assert.ok(hit);
    assert.equal(hit?.breakpoint, "mobile");
    assert.ok(hit?.fix?.propsPatch?.headline);
  });

  it("flags invalid video URLs", () => {
    const sections: ThemeSection[] = [
      {
        id: "vid-1",
        type: "video",
        enabled: true,
        props: { url: "not-a-url" },
      },
    ];
    const hints = detectBuilderHints({
      settings: DEFAULT_THEME_SETTINGS,
      sections,
    });
    assert.ok(hints.some((h) => h.id === "video-vid-1"));
  });
});
