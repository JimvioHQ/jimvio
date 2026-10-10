import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  builderShouldHideCommerceNav,
  constrainOverlayDrawers,
  editorBreakpointFromWidth,
  editorDrawerPlacement,
  editorToolbarDensity,
  editorUsesOverlayPanels,
} from "./editor-chrome";
import {
  BUILDER_NAV_GROUPS,
  collapsePanelsForCanvas,
  builderWorkspaceGrid,
  closeLeftPanel,
  closeRightPanel,
  defaultRightPanelOpen,
  nextBuilderEscapeAction,
  openInspectorForSection,
  toggleBuilderNav,
  type BuilderPanelState,
} from "./panel-layout";
import {
  availableZoomModes,
  fitPreviewZoom,
  previewFrameWidth,
  previewProductGridClass,
  previewProductGridStyle,
  previewShowDesktopNav,
  previewShowMobileNav,
  resolvePreviewZoom,
  scaledPreviewBox,
} from "./preview-viewport";
import { hasHorizontalOverflow } from "./canvas-overflow";

function base(over: Partial<BuilderPanelState> = {}): BuilderPanelState {
  return {
    leftOpen: true,
    rightOpen: true,
    activePanel: "sections",
    leftMode: "tree",
    ...over,
  };
}

describe("editor chrome breakpoints", () => {
  it("classifies 320-767 as mobile, 768-1099 tablet, 1100+ desktop", () => {
    assert.equal(editorBreakpointFromWidth(320), "mobile");
    assert.equal(editorBreakpointFromWidth(767), "mobile");
    assert.equal(editorBreakpointFromWidth(768), "tablet");
    assert.equal(editorBreakpointFromWidth(1024), "tablet");
    assert.equal(editorBreakpointFromWidth(1099), "tablet");
    assert.equal(editorBreakpointFromWidth(1100), "desktop");
    assert.equal(editorBreakpointFromWidth(1920), "desktop");
  });

  it("uses overlay drawers below desktop", () => {
    assert.equal(editorUsesOverlayPanels("desktop"), false);
    assert.equal(editorUsesOverlayPanels("tablet"), true);
    assert.equal(editorUsesOverlayPanels("mobile"), true);
    assert.equal(editorDrawerPlacement("mobile", "left"), "sheet");
    assert.equal(editorDrawerPlacement("tablet", "left"), "start");
    assert.equal(editorDrawerPlacement("tablet", "right"), "end");
  });

  it("collapses toolbar density", () => {
    assert.equal(editorToolbarDensity("desktop", false), "full");
    assert.equal(editorToolbarDensity("tablet", false), "compact");
    assert.equal(editorToolbarDensity("mobile", false), "minimal");
    assert.equal(editorToolbarDensity("desktop", true), "minimal");
  });

  it("keeps one overlay drawer at a time", () => {
    const both = constrainOverlayDrawers({
      leftOpen: true,
      rightOpen: true,
      editorBp: "tablet",
      prefer: "right",
    });
    assert.deepEqual(both, { leftOpen: false, rightOpen: true });
    const desktop = constrainOverlayDrawers({
      leftOpen: true,
      rightOpen: true,
      editorBp: "desktop",
      prefer: "right",
    });
    assert.deepEqual(desktop, { leftOpen: true, rightOpen: true });
  });

  it("hides Commerce OS nav only inside the visual editor", () => {
    assert.equal(builderShouldHideCommerceNav("/commerce/builder"), false);
    assert.equal(builderShouldHideCommerceNav("/commerce/builder", "storeId=x"), false);
    assert.equal(
      builderShouldHideCommerceNav("/commerce/builder", "storeId=x&view=editor"),
      true,
    );
    assert.equal(builderShouldHideCommerceNav("/commerce/builder?view=editor"), true);
    assert.equal(builderShouldHideCommerceNav("/commerce"), false);
    assert.equal(builderShouldHideCommerceNav("/commerce/products"), false);
  });
});

describe("builder panel layout", () => {
  it("toggles sections tree closed when already open", () => {
    const next = toggleBuilderNav(base(), "sections");
    assert.equal(next.leftOpen, false);
  });

  it("opens theme panel and right inspector on desktop", () => {
    const next = toggleBuilderNav(base({ leftOpen: false }), "theme", "desktop");
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

  it("opens inspector as overlay on tablet without leaving both drawers open", () => {
    const next = openInspectorForSection(
      base({ leftOpen: true, rightOpen: false }),
      "tablet"
    );
    assert.equal(next.rightOpen, true);
    assert.equal(next.leftOpen, false);
  });

  it("closes the left tree when inspecting a section on desktop so the canvas expands", () => {
    const next = openInspectorForSection(
      base({ leftOpen: true, rightOpen: false }),
      "desktop"
    );
    assert.equal(next.rightOpen, true);
    assert.equal(next.leftOpen, false);
  });

  it("collapses both panels for a full-width canvas", () => {
    const next = collapsePanelsForCanvas(base({ leftOpen: true, rightOpen: true }));
    assert.equal(next.leftOpen, false);
    assert.equal(next.rightOpen, false);
    assert.equal(next.activePanel, "sections");
  });

  it("releases grid columns when panels close", () => {
    assert.equal(
      builderWorkspaceGrid({
        leftOpen: false,
        rightOpen: false,
        focusMode: false,
        editorBp: "desktop",
      }),
      "0fr minmax(0,1fr) 0fr"
    );
    assert.equal(
      builderWorkspaceGrid({
        leftOpen: true,
        rightOpen: true,
        focusMode: false,
        editorBp: "desktop",
      }).includes("minmax(0,1fr)"),
      true
    );
    assert.equal(
      builderWorkspaceGrid({
        leftOpen: true,
        rightOpen: true,
        focusMode: true,
        editorBp: "desktop",
      }),
      "minmax(0,1fr)"
    );
  });

  it("gives overlay breakpoints a single canvas column", () => {
    assert.equal(
      builderWorkspaceGrid({
        leftOpen: true,
        rightOpen: true,
        focusMode: false,
        editorBp: "tablet",
      }),
      "minmax(0,1fr)"
    );
    assert.equal(
      builderWorkspaceGrid({
        leftOpen: true,
        rightOpen: false,
        focusMode: false,
        editorBp: "mobile",
      }),
      "minmax(0,1fr)"
    );
  });

  it("close helpers preserve active panel id", () => {
    const s = base({ activePanel: "navigation" });
    assert.equal(closeLeftPanel(s).activePanel, "navigation");
    assert.equal(closeRightPanel(s).rightOpen, false);
    assert.equal(openInspectorForSection(s).rightOpen, true);
  });

  it("defaults the right inspector closed", () => {
    assert.equal(defaultRightPanelOpen(), false);
  });
});

describe("preview viewport", () => {
  it("uses real device widths not leftover editor columns", () => {
    assert.equal(previewFrameWidth("mobile", { mobileWidth: 320 }), 320);
    assert.equal(previewFrameWidth("mobile", { mobileWidth: 360 }), 360);
    assert.equal(previewFrameWidth("mobile", { mobileWidth: 375 }), 375);
    assert.equal(previewFrameWidth("mobile", { mobileWidth: 414 }), 414);
    assert.equal(previewFrameWidth("mobile", { mobileWidth: 430 }), 430);
    assert.equal(previewFrameWidth("tablet"), 768);
    assert.equal(previewFrameWidth("laptop"), 1280);
    assert.equal(previewFrameWidth("desktop"), 1440);
    assert.equal(previewFrameWidth("custom", { customWidth: 1100 }), 1100);
  });

  it("forces compact nav modes for preview devices", () => {
    assert.equal(previewShowDesktopNav("desktop"), true);
    assert.equal(previewShowDesktopNav("laptop"), true);
    assert.equal(previewShowDesktopNav("mobile"), false);
    assert.equal(previewShowMobileNav("mobile"), true);
    assert.equal(previewShowMobileNav("desktop"), false);
  });

  it("uses compact product grids on mobile preview", () => {
    assert.match(previewProductGridClass("mobile"), /grid-cols-2/);
    assert.doesNotMatch(previewProductGridClass("mobile"), /lg:/);
    assert.match(previewProductGridClass("tablet"), /grid-cols-3/);
    assert.match(previewProductGridClass(), /grid-cols-2/);
    assert.equal(previewProductGridStyle(), undefined);
    assert.ok(
      previewProductGridStyle("desktop")?.gridTemplateColumns.includes(
        "--store-grid-cols"
      )
    );
    assert.equal(
      previewProductGridStyle("tablet")?.gridTemplateColumns,
      "repeat(3, minmax(0, 1fr))"
    );
    assert.equal(
      previewProductGridStyle("mobile")?.gridTemplateColumns,
      "repeat(2, minmax(0, 1fr))"
    );
  });

  it("fits zoom without scaling text below 40%", () => {
    assert.equal(fitPreviewZoom(720, 1440), 50);
    assert.equal(fitPreviewZoom(1440, 1440), 100);
    assert.equal(resolvePreviewZoom("fit", 390, 390), 100);
    assert.equal(resolvePreviewZoom(100, 800, 1440), 100);
    assert.ok(availableZoomModes(2000, 1440).includes(125));
    assert.equal(availableZoomModes(800, 1440).includes(125), false);
  });

  it("computes scaled box so transform does not leak layout", () => {
    const box = scaledPreviewBox(1440, 2000, 50);
    assert.equal(box.width, 720);
    assert.equal(box.height, 1000);
    assert.equal(box.scale, 0.5);
  });
});

describe("canvas overflow detector", () => {
  it("treats 2px slack as no overflow", () => {
    assert.equal(hasHorizontalOverflow(800, 800), false);
    assert.equal(hasHorizontalOverflow(802, 800), false);
    assert.equal(hasHorizontalOverflow(810, 800), true);
  });
});

describe("builder escape order", () => {
  it("closes overlays, then inspector, then tree, then selection", () => {
    assert.equal(
      nextBuilderEscapeAction({
        pickerOpen: true,
        moreOpen: true,
        focusMode: true,
        rightOpen: true,
        leftOpen: true,
        selectedId: "hero",
      }),
      "picker"
    );
    assert.equal(
      nextBuilderEscapeAction({
        pickerOpen: false,
        moreOpen: false,
        focusMode: false,
        rightOpen: true,
        leftOpen: true,
        selectedId: "hero",
      }),
      "right"
    );
    assert.equal(
      nextBuilderEscapeAction({
        pickerOpen: false,
        moreOpen: false,
        focusMode: false,
        rightOpen: false,
        leftOpen: false,
        selectedId: "hero",
      }),
      "selection"
    );
    assert.equal(
      nextBuilderEscapeAction({
        pickerOpen: false,
        moreOpen: false,
        focusMode: false,
        rightOpen: false,
        leftOpen: false,
        selectedId: null,
      }),
      null
    );
  });

  it("exposes grouped builder nav for progressive disclosure", () => {
    assert.ok(BUILDER_NAV_GROUPS.length >= 5);
    assert.ok(BUILDER_NAV_GROUPS.some((g) => g.id === "store"));
    assert.ok(BUILDER_NAV_GROUPS.some((g) => g.id === "sections"));
    assert.ok(
      BUILDER_NAV_GROUPS.flatMap((g) => g.items).some((i) => i.id === "media")
    );
  });
});
