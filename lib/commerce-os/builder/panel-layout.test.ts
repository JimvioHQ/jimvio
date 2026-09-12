import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  builderWorkspaceGrid,
  closeLeftPanel,
  closeRightPanel,
  openInspectorForSection,
  toggleBuilderNav,
  type BuilderPanelState,
} from "./panel-layout";
import {
  previewFrameWidth,
  previewProductGridClass,
  previewShowDesktopNav,
  previewShowMobileNav,
} from "./preview-viewport";

function base(over: Partial<BuilderPanelState> = {}): BuilderPanelState {
  return {
    leftOpen: true,
    rightOpen: true,
    activePanel: "sections",
    leftMode: "tree",
    ...over,
  };
}

describe("builder panel layout", () => {
  it("toggles sections tree closed when already open", () => {
    const next = toggleBuilderNav(base(), "sections");
    assert.equal(next.leftOpen, false);
  });

  it("opens theme panel and right inspector", () => {
    const next = toggleBuilderNav(base({ leftOpen: false }), "theme");
    assert.equal(next.leftOpen, true);
    assert.equal(next.leftMode, "panels");
    assert.equal(next.activePanel, "theme");
    assert.equal(next.rightOpen, true);
  });

  it("closes matching panel on second click", () => {
    const open = toggleBuilderNav(base({ leftOpen: false }), "seo");
    const closed = toggleBuilderNav(open, "seo");
    assert.equal(closed.leftOpen, false);
  });

  it("releases grid columns when panels close", () => {
    assert.equal(
      builderWorkspaceGrid({ leftOpen: false, rightOpen: false, focusMode: false }),
      "0px minmax(0,1fr) 0px"
    );
    assert.equal(
      builderWorkspaceGrid({ leftOpen: true, rightOpen: true, focusMode: false }).includes(
        "minmax(0,1fr)"
      ),
      true
    );
    assert.equal(
      builderWorkspaceGrid({ leftOpen: true, rightOpen: true, focusMode: true }),
      "minmax(0,1fr)"
    );
  });

  it("close helpers preserve active panel id", () => {
    const s = base({ activePanel: "navigation" });
    assert.equal(closeLeftPanel(s).activePanel, "navigation");
    assert.equal(closeRightPanel(s).rightOpen, false);
    assert.equal(openInspectorForSection(s).rightOpen, true);
  });
});

describe("preview viewport", () => {
  it("uses real mobile widths not scaled desktop", () => {
    assert.equal(previewFrameWidth("mobile", 320), 320);
    assert.equal(previewFrameWidth("mobile", 375), 375);
    assert.equal(previewFrameWidth("mobile", 430), 430);
    assert.equal(previewFrameWidth("tablet"), 768);
    assert.equal(previewFrameWidth("desktop"), "100%");
  });

  it("forces compact nav modes for preview devices", () => {
    assert.equal(previewShowDesktopNav("desktop"), true);
    assert.equal(previewShowDesktopNav("mobile"), false);
    assert.equal(previewShowMobileNav("mobile"), true);
    assert.equal(previewShowMobileNav("desktop"), false);
  });

  it("uses compact product grids on mobile preview", () => {
    assert.match(previewProductGridClass("mobile"), /grid-cols-2/);
    assert.doesNotMatch(previewProductGridClass("mobile"), /lg:/);
  });
});
