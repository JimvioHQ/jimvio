"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_THEME_SETTINGS,
  DESIGN_PRESETS,
  HERO_PRESETS,
  applyDesignPreset,
  applyHeroPreset,
  contrastWarning,
  createCatalogSection,
  duplicateSection,
  mergeThemeSettings,
  defaultHomeSections,
  reorderSections,
  suggestHeadline,
  suggestSeoDescription,
  themeSettingsToCssVars,
  type ButtonStyle,
  type DesignPresetId,
  type ThemeDraft,
  type ThemeSection,
  type ThemeSettings,
} from "@/lib/commerce-os/themes/registry";
import {
  storefrontDisplayHost,
  storefrontDisplayUrl,
} from "@/lib/commerce-os/storefront-url";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";
import { isSafeNavHref, type NavItem } from "@/lib/commerce-os/builder/nav-safe";
import { POLICY_TEMPLATES } from "@/lib/commerce-os/builder/policy-templates";
import { detectBuilderHints } from "@/lib/commerce-os/builder/responsive-hints";
import {
  builderWorkspaceGrid,
  collapsePanelsForCanvas,
  defaultRightPanelOpen,
  openInspectorForSection,
  toggleBuilderNav,
  type BuilderPanelId,
} from "@/lib/commerce-os/builder/panel-layout";
import {
  editorBreakpointFromWidth,
  editorToolbarDensity,
  editorUsesOverlayPanels,
  type EditorBreakpoint,
} from "@/lib/commerce-os/builder/editor-chrome";
import {
  MOBILE_PREVIEW_WIDTHS,
  PREVIEW_DEVICE_LABELS,
  availableZoomModes,
  previewFrameWidth,
  resolvePreviewZoom,
  type MobilePreviewWidth,
  type PreviewDevice,
  type ZoomMode,
} from "@/lib/commerce-os/builder/preview-viewport";
import { detectCanvasOverflow, type CanvasIssue } from "@/lib/commerce-os/builder/canvas-overflow";
import { insertIndexForNewTemplateSection } from "@/lib/commerce-os/builder/section-zones";
import { resolveVideoEmbedUrl } from "@/lib/commerce-os/storefront/video-embed";
import { StorefrontHomeSections } from "@/components/commerce-os/storefront-home-sections";
import { StorefrontMobileNav } from "@/components/commerce-os/storefront-mobile-nav";
import {
  StorefrontAnnouncement,
  StorefrontFooter,
  StorefrontHeader,
} from "@/components/commerce-os/storefront-sections";
import { SectionPickerModal } from "@/components/commerce-os/builder/section-picker-modal";
import { SectionTree } from "@/components/commerce-os/builder/section-tree";
import { ProductPicker } from "@/components/commerce-os/builder/product-picker";
import { CollectionPicker } from "@/components/commerce-os/builder/collection-picker";
import { CanvasSectionFrame } from "@/components/commerce-os/builder/canvas-section-frame";
import { PreviewStage } from "@/components/commerce-os/builder/preview-stage";
import Link from "next/link";
import { useRouter } from "next/navigation";

type StorePage = {
  id: string;
  title: string;
  handle: string;
  body_html: string | null;
  seo: Record<string, unknown> | null;
  published: boolean;
};

type PreviewProduct = {
  id: string;
  name: string;
  slug: string;
  price: number | string | null;
  compare_at_price?: number | string | null;
  currency?: string | null;
  images?: unknown;
  short_description?: string | null;
  inventory_quantity?: number | null;
  track_inventory?: boolean | null;
};

type PreviewCollection = {
  id: string;
  title: string;
  handle: string;
  image_url?: string | null;
};

type Props = {
  storeId: string;
  storeName: string;
  handle: string;
  logoUrl?: string | null;
  status?: string;
  stores?: Array<{ id: string; name: string; handle: string; status: string }>;
  initialDraft: ThemeDraft | null;
  initialNav: { header: NavItem[]; footer: NavItem[] };
  initialPages: StorePage[];
  initialSeo: Record<string, unknown>;
  initialSocial: Record<string, unknown>;
  initialDescription?: string | null;
  previewProducts: PreviewProduct[];
  previewCollections?: PreviewCollection[];
};

type Panel = BuilderPanelId;

type Device = PreviewDevice;

type Snapshot = {
  sections: ThemeSection[];
  settings: ThemeSettings;
};

function ensureHomeSections(draft: ThemeDraft | null, storeName: string): ThemeSection[] {
  const home = draft?.sections?.home;
  if (Array.isArray(home) && home.length) return home as ThemeSection[];
  return defaultHomeSections(storeName);
}

const PANELS: Array<{ id: Panel; label: string }> = [
  { id: "design", label: "Design" },
  { id: "sections", label: "Sections" },
  { id: "navigation", label: "Navigation" },
  { id: "theme", label: "Theme" },
  { id: "media", label: "Media" },
  { id: "pages", label: "Pages" },
  { id: "seo", label: "SEO" },
  { id: "policies", label: "Policies" },
  { id: "settings", label: "Settings" },
  { id: "issues", label: "Issues" },
];

export function BuilderClient({
  storeId,
  storeName,
  handle,
  logoUrl,
  status,
  stores = [],
  initialDraft,
  initialNav,
  initialPages,
  initialSeo,
  initialSocial,
  initialDescription,
  previewProducts,
  previewCollections = [],
}: Props) {
  const router = useRouter();
  const [sections, setSections] = useState<ThemeSection[]>(() =>
    ensureHomeSections(initialDraft, storeName)
  );
  const [settings, setSettings] = useState<ThemeSettings>(() =>
    mergeThemeSettings(DEFAULT_THEME_SETTINGS, {
      ...(initialDraft?.settings || {}),
      logoUrl: initialDraft?.settings?.logoUrl || logoUrl || null,
    })
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    () =>
      ensureHomeSections(initialDraft, storeName).find((s) => s.type === "hero")?.id ||
      null
  );
  const [panel, setPanel] = useState<Panel>("sections");
  const [device, setDevice] = useState<Device>("desktop");
  const [mobileWidth, setMobileWidth] = useState<MobilePreviewWidth>(390);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [headerNav, setHeaderNav] = useState<NavItem[]>(initialNav.header);
  const [footerNav, setFooterNav] = useState<NavItem[]>(initialNav.footer);
  const [navDirty, setNavDirty] = useState(false);
  const [pages, setPages] = useState<StorePage[]>(initialPages);
  const [pageId, setPageId] = useState<string | null>(initialPages[0]?.id || null);
  const [seo, setSeo] = useState<Record<string, unknown>>(initialSeo || {});
  const [social, setSocial] = useState<Record<string, unknown>>(initialSocial || {});
  const [seoDirty, setSeoDirty] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit");
  const [customWidth, setCustomWidth] = useState(1100);
  const [focusMode, setFocusMode] = useState(false);
  const [storeStatus, setStoreStatus] = useState(status || "draft");
  const [hintsOpen, setHintsOpen] = useState(false);
  const [leftMode, setLeftMode] = useState<"tree" | "panels">("tree");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(defaultRightPanelOpen);
  const [moreOpen, setMoreOpen] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [panelQuery, setPanelQuery] = useState("");
  const [editorBp, setEditorBp] = useState<EditorBreakpoint>("desktop");
  const [stageWidth, setStageWidth] = useState(1200);
  const [canvasIssues, setCanvasIssues] = useState<CanvasIssue[]>([]);
  const previewRootRef = useRef<HTMLDivElement>(null);

  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const skippingHistory = useRef(false);

  const liveUrl = storefrontDisplayUrl(handle);
  const liveHost = storefrontDisplayHost(handle);
  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) || null,
    [sections, selectedId]
  );
  const cssVars = themeSettingsToCssVars(settings);
  const logo = settings.logoUrl || logoUrl || null;
  const page = pages.find((p) => p.id === pageId) || null;

  const setupSteps = useMemo(() => {
    const hasLogo = Boolean(logo);
    const hasProducts = previewProducts.length > 0;
    const hasHero = sections.some((s) => s.type === "hero" && s.enabled);
    const hasNav = headerNav.length > 0;
    const hasPolicy = pages.some((p) =>
      ["terms", "privacy"].includes(p.handle)
    );
    return [
      { id: "logo", label: "Add logo", done: hasLogo },
      { id: "colors", label: "Choose colors", done: Boolean(settings.primaryColor) },
      { id: "products", label: "Add products", done: hasProducts },
      { id: "homepage", label: "Customize homepage", done: hasHero },
      { id: "nav", label: "Configure navigation", done: hasNav },
      { id: "policies", label: "Add policies", done: hasPolicy },
    ];
  }, [logo, previewProducts.length, sections, headerNav.length, pages, settings.primaryColor]);

  const setupDone = setupSteps.filter((s) => s.done).length;

  const pushHistory = useCallback((next: Snapshot) => {
    if (skippingHistory.current) return;
    past.current = [...past.current.slice(-39), next];
    future.current = [];
  }, []);

  function markDirty() {
    setDirty(true);
    setMessage(null);
  }

  function commitSnapshot(nextSections: ThemeSection[], nextSettings: ThemeSettings) {
    pushHistory({ sections: nextSections, settings: nextSettings });
  }

  function patchSettings(patch: Partial<ThemeSettings>) {
    setSettings((prev) => {
      const next = mergeThemeSettings(prev, patch);
      commitSnapshot(sections, next);
      return next;
    });
    markDirty();
  }

  function setSectionsWithHistory(updater: (prev: ThemeSection[]) => ThemeSection[]) {
    setSections((prev) => {
      const next = updater(prev);
      commitSnapshot(next, settings);
      return next;
    });
    markDirty();
  }

  function undo() {
    const prev = past.current.pop();
    if (!prev) return;
    future.current.push({ sections, settings });
    skippingHistory.current = true;
    setSections(prev.sections);
    setSettings(prev.settings);
    skippingHistory.current = false;
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
    markDirty();
  }

  function redo() {
    const next = future.current.pop();
    if (!next) return;
    past.current.push({ sections, settings });
    skippingHistory.current = true;
    setSections(next.sections);
    setSettings(next.settings);
    skippingHistory.current = false;
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
    markDirty();
  }

  useEffect(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }, [sections, settings]);

  useEffect(() => {
    function onResize() {
      setEditorBp(editorBreakpointFromWidth(window.innerWidth));
    }
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (pickerOpen) {
          setPickerOpen(false);
          return;
        }
        if (moreOpen) {
          setMoreOpen(false);
          return;
        }
        if (focusMode) {
          setFocusMode(false);
          return;
        }
        if (rightOpen) {
          setRightOpen(false);
          return;
        }
        if (leftOpen) {
          setLeftOpen(false);
          return;
        }
        setSelectedId(null);
        return;
      }
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        meta &&
        (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, settings, pickerOpen, moreOpen, focusMode, rightOpen, leftOpen]);

  function move(index: number, dir: -1 | 1) {
    setSectionsWithHistory((prev) => reorderSections(prev, index, index + dir));
  }

  function toggle(id: string) {
    setSectionsWithHistory((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  }

  function updateSectionProps(id: string, patch: Record<string, unknown>) {
    setSectionsWithHistory((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, props: { ...(s.props || {}), ...patch } } : s
      )
    );
  }

  function addSection(type: ThemeSection["type"]) {
    const section = createCatalogSection(type, storeName);
    setSectionsWithHistory((prev) => {
      const idx = insertIndexForNewTemplateSection(prev);
      const next = [...prev];
      next.splice(idx, 0, section);
      return next;
    });
    setSelectedId(section.id);
    setPanel("sections");
    setLeftMode("tree");
  }

  function removeSection(id: string) {
    setSectionsWithHistory((prev) => prev.filter((s) => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function dupSection(id: string) {
    const src = sections.find((s) => s.id === id);
    if (!src || src.type === "header" || src.type === "footer") return;
    const copy = duplicateSection(src);
    setSectionsWithHistory((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    setSelectedId(copy.id);
  }

  function buildDraft(): ThemeDraft {
    return {
      settings: {
        ...settings,
        logoUrl: settings.logoUrl || logoUrl || null,
      },
      sections: {
        ...(initialDraft?.sections || {}),
        home: sections,
      },
    };
  }

  async function saveDraft() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const draft = buildDraft();
      const res = await fetch("/api/commerce/builder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          theme_draft: draft,
          logo_url: draft.settings.logoUrl || null,
          favicon_url: draft.settings.faviconUrl || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Save failed.");
        return;
      }
      if (navDirty) await saveNav();
      if (seoDirty) await saveSeo();
      setDirty(false);
      setMessage("Draft saved.");
    } catch {
      setError("Could not save draft.");
    } finally {
      setBusy(false);
    }
  }

  async function saveNav() {
    await Promise.all([
      fetch("/api/commerce/navigation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, location: "header", items: headerNav }),
      }),
      fetch("/api/commerce/navigation", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, location: "footer", items: footerNav }),
      }),
    ]);
    setNavDirty(false);
  }

  async function saveSeo() {
    const res = await fetch(`/api/commerce/stores/${storeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seo, social }),
    });
    if (!res.ok) throw new Error("seo");
    setSeoDirty(false);
  }

  async function publishTheme() {
    setBusy(true);
    setError(null);
    setMessage(null);
    setConfirmPublish(false);
    try {
      await saveDraft();
      const res = await fetch("/api/commerce/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storeId, action: "publish" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Publish failed.");
        return;
      }
      setDirty(false);
      setStoreStatus("published");
      setMessage("Published to " + liveHost);
    } catch {
      setError("Publish failed.");
    } finally {
      setBusy(false);
    }
  }

  async function savePagePatch(patch: Partial<StorePage>) {
    if (!page) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/commerce/pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          pageId: page.id,
          title: patch.title,
          body_html: patch.body_html,
          published: patch.published,
          seo: patch.seo,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Page save failed.");
        return;
      }
      setPages((prev) =>
        prev.map((p) => (p.id === page.id ? { ...p, ...json.page } : p))
      );
      setMessage("Page saved.");
    } catch {
      setError("Page save failed.");
    } finally {
      setBusy(false);
    }
  }

  function applyTemplate(handleKey: string) {
    const tpl = POLICY_TEMPLATES[handleKey];
    if (!tpl || !page) return;
    void savePagePatch({
      title: tpl.title,
      body_html: tpl.bodyHtml(storeName),
    });
  }

  const contrast = contrastWarning(settings.backgroundColor, settings.textColor);
  const hints = useMemo(
    () =>
      detectBuilderHints({
        settings,
        sections,
        logo,
        headerNavCount: headerNav.length,
        headerNav,
        pages,
        seo,
        products: previewProducts,
      }),
    [settings, sections, logo, headerNav, pages, seo, previewProducts]
  );
  const overlayPanels = editorUsesOverlayPanels(editorBp);
  const toolbarDensity = editorToolbarDensity(editorBp, focusMode);
  const canvasWidth = previewFrameWidth(device, {
    mobileWidth,
    customWidth,
  });
  const zoomPercent = resolvePreviewZoom(
    zoomMode,
    Math.max(320, stageWidth - 48),
    canvasWidth
  );
  const zoomChoices = availableZoomModes(
    Math.max(320, stageWidth - 48),
    canvasWidth
  );
  const dockLeft = leftOpen && !focusMode && !overlayPanels;
  const dockRight = rightOpen && !focusMode && !overlayPanels;
  const workspaceGrid = builderWorkspaceGrid({
    leftOpen: dockLeft,
    rightOpen: dockRight,
    focusMode,
    editorBp,
  });

  const enabledSections = sections.filter((s) => s.enabled);
  const selectedLabel = selected
    ? selected.type.replace(/_/g, " ")
    : null;
  const filteredPanels = PANELS.filter((p) =>
    !panelQuery.trim()
      ? true
      : p.label.toLowerCase().includes(panelQuery.trim().toLowerCase())
  );

  function expandCanvas() {
    const next = collapsePanelsForCanvas({
      leftOpen,
      rightOpen,
      activePanel: panel,
      leftMode,
    });
    setLeftOpen(next.leftOpen);
    setRightOpen(next.rightOpen);
    setFocusMode(false);
  }

  function selectSection(id: string) {
    setSelectedId(id);
    const next = openInspectorForSection(
      {
        leftOpen,
        rightOpen,
        activePanel: panel,
        leftMode,
      },
      editorBp
    );
    setPanel(next.activePanel);
    setLeftMode(next.leftMode);
    setRightOpen(next.rightOpen);
    setLeftOpen(next.leftOpen);
  }

  function activateNav(next: Panel) {
    if (next === "issues") {
      setHintsOpen(true);
      setPanel("issues");
      const drawers = toggleBuilderNav(
        { leftOpen, rightOpen, activePanel: panel, leftMode },
        "issues",
        editorBp
      );
      setLeftOpen(drawers.leftOpen);
      setRightOpen(true);
      return;
    }
    const toggled = toggleBuilderNav(
      { leftOpen, rightOpen, activePanel: panel, leftMode },
      next,
      editorBp
    );
    setLeftOpen(toggled.leftOpen);
    setRightOpen(toggled.rightOpen);
    setPanel(toggled.activePanel);
    setLeftMode(toggled.leftMode);
    if (next === "sections") setHintsOpen(false);
  }

  const onStageWidth = useCallback((w: number) => {
    setStageWidth(w);
  }, []);

  useEffect(() => {
    const root = previewRootRef.current;
    if (!root) return;
    const t = window.setTimeout(() => {
      setCanvasIssues(detectCanvasOverflow(root, device));
    }, 250);
    return () => window.clearTimeout(t);
  }, [device, mobileWidth, customWidth, sections, settings, headerNav, zoomPercent]);

  const issueCount = hints.length + canvasIssues.length;
  const showFullToolbar = toolbarDensity === "full";
  const showCompactToolbar = toolbarDensity === "compact";
  const showMinimalToolbar = toolbarDensity === "minimal";
  const deviceOptions: Device[] = ["desktop", "laptop", "tablet", "mobile", "custom"];

  return (
    <div
      className="flex h-dvh flex-col overflow-hidden bg-[#E8EAED]"
      data-jimvio-builder="4"
      data-builder-bp={editorBp}
      data-left-open={leftOpen ? "1" : "0"}
      data-right-open={rightOpen ? "1" : "0"}
      data-focus-mode={focusMode ? "1" : "0"}
      data-preview-device={device}
    >
      <header className="z-40 flex shrink-0 items-center gap-2 overflow-x-auto border-b border-[#E5E7EB] bg-white px-2 py-1.5 sm:px-3">
        <Link
          href="/commerce"
          className="grid h-8 shrink-0 place-items-center rounded-lg border border-[#E5E7EB] px-2 text-[11px] font-bold text-[#FF5A1F] hover:bg-[#FFF7ED]"
          aria-label="Back to Commerce"
          title="Back to Commerce"
        >
          {showMinimalToolbar ? "Back" : "Commerce"}
        </Link>
        {!showMinimalToolbar ? (
          <nav className="flex items-center gap-0.5" aria-label="Builder panels">
            {(showFullToolbar
              ? PANELS.filter((p) => p.id !== "issues")
              : PANELS.filter((p) => p.id === "sections" || p.id === "theme")
            ).map((p) => {
              const active =
                leftOpen &&
                ((p.id === "sections" && leftMode === "tree" && panel === "sections") ||
                  (p.id !== "sections" && leftMode === "panels" && panel === p.id));
              return (
                <button
                  key={p.id}
                  type="button"
                  title={p.label}
                  aria-pressed={active}
                  onClick={() => activateNav(p.id)}
                  className={
                    active
                      ? "shrink-0 rounded-md bg-[#EFF6FF] px-2 py-1.5 text-[11px] font-semibold text-[#2563EB]"
                      : "shrink-0 rounded-md px-2 py-1.5 text-[11px] font-semibold text-[#6B7280] hover:bg-[#F3F4F6]"
                  }
                >
                  {p.label}
                </button>
              );
            })}
            {showCompactToolbar ? (
              <button
                type="button"
                className="shrink-0 rounded-md px-2 py-1.5 text-[11px] font-semibold text-[#6B7280] hover:bg-[#F3F4F6]"
                onClick={() => setMoreOpen((v) => !v)}
              >
                More
              </button>
            ) : null}
          </nav>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Open sections"
              onClick={() => activateNav("sections")}
              className="rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[11px] font-semibold"
            >
              Sections
            </button>
            <button
              type="button"
              aria-label="Open settings"
              onClick={() => {
                setRightOpen(true);
                setLeftOpen(false);
              }}
              className="rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[11px] font-semibold"
            >
              Settings
            </button>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[#111827]">
            {storeName}
            <span
              className={
                storeStatus === "published"
                  ? "ml-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700"
                  : "ml-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
              }
            >
              {storeStatus === "published" ? "Active" : "Draft"}
            </span>
            {dirty ? (
              <span className="ml-1 text-[10px] font-semibold text-amber-700">Unsaved</span>
            ) : null}
          </p>
          {showFullToolbar ? (
            <p className="truncate text-[10px] text-[#6B7280]">
              Home
              {selectedLabel ? ` · ${selectedLabel}` : ""}
              {" · "}
              <a href={liveUrl} target="_blank" rel="noreferrer" className="text-[#FF5A1F] hover:underline">
                {liveHost}
              </a>
            </p>
          ) : null}
        </div>
        {showFullToolbar && stores.length > 1 ? (
          <label className="hidden items-center gap-1 text-[10px] font-semibold text-[#6B7280] md:flex">
            Store
            <select
              aria-label="Switch store"
              className="h-8 max-w-[140px] rounded-md border border-[#E5E7EB] px-1 text-[11px] font-semibold text-[#111827]"
              value={storeId}
              onChange={(e) => {
                router.push(`/commerce/builder?storeId=${e.target.value}`);
              }}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="flex shrink-0 items-center gap-1">
          {!showMinimalToolbar ? (
            <>
              <button type="button" disabled={!canUndo || busy} onClick={undo} aria-label="Undo" className="rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[11px] font-semibold disabled:opacity-40">Undo</button>
              <button type="button" disabled={!canRedo || busy} onClick={redo} aria-label="Redo" className="rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[11px] font-semibold disabled:opacity-40">Redo</button>
            </>
          ) : null}
          <select
            aria-label="Device"
            value={device}
            onChange={(e) => setDevice(e.target.value as Device)}
            className="h-8 rounded-md border border-[#E5E7EB] px-1 text-[11px] font-semibold"
          >
            {deviceOptions.map((d) => (
              <option key={d} value={d}>{PREVIEW_DEVICE_LABELS[d]}</option>
            ))}
          </select>
          {device === "mobile" ? (
            <select
              aria-label="Mobile width"
              value={mobileWidth}
              onChange={(e) => setMobileWidth(Number(e.target.value) as MobilePreviewWidth)}
              className="h-8 rounded-md border border-[#E5E7EB] px-1 text-[11px] font-semibold"
            >
              {MOBILE_PREVIEW_WIDTHS.map((w) => (
                <option key={w} value={w}>{w}px</option>
              ))}
            </select>
          ) : null}
          {device === "custom" ? (
            <label className="flex items-center gap-1 text-[10px] font-semibold text-[#6B7280]">
              <span className="sr-only">Custom width</span>
              <input
                type="number"
                min={320}
                max={1920}
                value={customWidth}
                onChange={(e) => setCustomWidth(Number(e.target.value) || 1100)}
                className="h-8 w-16 rounded-md border border-[#E5E7EB] px-1 text-[11px]"
              />
              px
            </label>
          ) : null}
          {showFullToolbar || showCompactToolbar ? (
            <select
              aria-label="Canvas zoom"
              value={String(zoomMode)}
              onChange={(e) => {
                const v = e.target.value;
                setZoomMode(v === "fit" ? "fit" : (Number(v) as ZoomMode));
              }}
              className="h-8 rounded-md border border-[#E5E7EB] px-1 text-[11px] font-semibold"
            >
              {zoomChoices.map((z) => (
                <option key={String(z)} value={String(z)}>
                  {z === "fit" ? "Fit" : `${z}%`}
                </option>
              ))}
            </select>
          ) : null}
          <button
            type="button"
            onClick={expandCanvas}
            className="rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[11px] font-semibold"
          >
            Expand
          </button>
          <button
            type="button"
            onClick={() => {
              setFocusMode((v) => !v);
              if (!focusMode) {
                setLeftOpen(false);
                setRightOpen(false);
              }
            }}
            className="rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[11px] font-semibold"
          >
            {focusMode ? "Exit focus" : "Focus"}
          </button>
          {showFullToolbar ? (
            <button
              type="button"
              onClick={() => {
                setHintsOpen(true);
                setPanel("issues");
                setRightOpen(true);
                if (overlayPanels) setLeftOpen(false);
              }}
              className="rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[11px] font-semibold"
            >
              Issues{issueCount ? ` (${issueCount})` : ""}
            </button>
          ) : null}
          <div className="relative">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-label="More actions"
              onClick={() => setMoreOpen((v) => !v)}
              className="rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[11px] font-semibold"
            >
              More
            </button>
            {moreOpen ? (
              <div className="absolute right-0 z-50 mt-1 w-48 rounded-lg border border-[#E5E7EB] bg-white p-1 shadow-lg">
                <a href={liveUrl} target="_blank" rel="noreferrer" className="block rounded-md px-2 py-1.5 text-[11px] font-semibold hover:bg-[#F3F4F6]">View live store</a>
                <Link href="/commerce" className="block rounded-md px-2 py-1.5 text-[11px] font-semibold hover:bg-[#F3F4F6]">Back to Commerce</Link>
                <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-semibold hover:bg-[#F3F4F6]" onClick={() => { setLeftOpen(true); setRightOpen(false); setFocusMode(false); setMoreOpen(false); }}>Open sections</button>
                <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-semibold hover:bg-[#F3F4F6]" onClick={() => { setRightOpen(true); if (overlayPanels) setLeftOpen(false); setFocusMode(false); setMoreOpen(false); }}>Open settings</button>
                <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-semibold hover:bg-[#F3F4F6]" onClick={() => { expandCanvas(); setMoreOpen(false); }}>Expand preview</button>
                {showMinimalToolbar ? (
                  <>
                    <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-semibold hover:bg-[#F3F4F6]" disabled={!canUndo} onClick={() => { undo(); setMoreOpen(false); }}>Undo</button>
                    <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-semibold hover:bg-[#F3F4F6]" disabled={!canRedo} onClick={() => { redo(); setMoreOpen(false); }}>Redo</button>
                    <button type="button" className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-semibold hover:bg-[#F3F4F6]" onClick={() => { setHintsOpen(true); setPanel("issues"); setRightOpen(true); setMoreOpen(false); }}>Issues</button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
          <button type="button" disabled={busy} onClick={() => void saveDraft()} className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#374151] disabled:opacity-50">Save</button>
          <button type="button" disabled={busy} onClick={() => setConfirmPublish(true)} className="rounded-md bg-[#FF5A1F] px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50">Publish</button>
          {showFullToolbar ? (
            <a href={liveUrl} target="_blank" rel="noreferrer" className="rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[11px] font-semibold">View live</a>
          ) : null}
        </div>
      </header>

      {confirmPublish ? (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Publish storefront?</p>
          <p className="mt-1 text-xs opacity-80">Theme, homepage sections, and brand assets go live at {liveHost}.</p>
          <div className="mt-2 flex gap-2">
            <button type="button" disabled={busy} onClick={() => void publishTheme()} className="rounded-md bg-[#FF5A1F] px-3 py-1.5 text-xs font-semibold text-white">Confirm publish</button>
            <button type="button" onClick={() => setConfirmPublish(false)} className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-semibold">Cancel</button>
          </div>
        </div>
      ) : null}

      {!focusMode && !setupDismissed && setupDone < setupSteps.length ? (
        <div className="border-b border-[#E5E7EB] bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#111827]">Build your storefront · {setupDone}/{setupSteps.length}</p>
            <button type="button" onClick={() => setSetupDismissed(true)} className="text-xs font-semibold text-[#6B7280] underline">Skip</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {setupSteps.map((s) => (
              <span key={s.id} className={s.done ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700" : "rounded-full bg-[#F3F4F6] px-2.5 py-1 text-[11px] font-semibold text-[#6B7280]"}>
                {s.done ? "✓ " : ""}{s.label}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {(error || message) && (
        <div className="border-b border-[#E5E7EB] bg-white px-4 py-2 text-xs">
          {error ? <p className="font-semibold text-red-600">{error}</p> : null}
          {message ? <p className="font-semibold text-emerald-700">{message}</p> : null}
        </div>
      )}

      <div
        className="relative grid min-h-0 min-w-0 flex-1 overflow-hidden transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none"
        style={{ gridTemplateColumns: workspaceGrid }}
        data-builder-workspace="1"
      >
        <aside
          className={
            dockLeft
              ? "min-h-0 min-w-0 overflow-hidden border-r border-[#E5E7EB] bg-white"
              : leftOpen && overlayPanels && !focusMode
                ? editorBp === "mobile"
                  ? "absolute inset-x-0 bottom-0 z-40 flex max-h-[min(85dvh,720px)] flex-col rounded-t-2xl border-t border-[#E5E7EB] bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl"
                  : "absolute inset-y-0 left-0 z-40 flex w-[min(280px,88vw)] flex-col border-r border-[#E5E7EB] bg-white shadow-2xl"
                : focusMode || overlayPanels
                  ? "hidden"
                  : "min-h-0 min-w-0 overflow-hidden"
          }
          aria-hidden={!dockLeft && !(leftOpen && overlayPanels && !focusMode)}
        >
          <div className="flex h-full min-h-0 min-w-0 flex-col">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                {leftMode === "tree" ? "Sections" : PANELS.find((p) => p.id === panel)?.label || "Panel"}
              </p>
              <button
                type="button"
                aria-label="Close left panel"
                onClick={() => setLeftOpen(false)}
                className="rounded-md px-2 py-1 text-[11px] font-semibold text-[#6B7280] hover:bg-[#F3F4F6]"
              >
                Close
              </button>
            </div>
            {leftMode === "panels" ? (
              <div className="border-b border-[#E5E7EB] p-2">
                <label className="sr-only" htmlFor="builder-panel-search">Search panels</label>
                <input
                  id="builder-panel-search"
                  value={panelQuery}
                  onChange={(e) => setPanelQuery(e.target.value)}
                  placeholder="Search…"
                  className="h-8 w-full rounded-md border border-[#E5E7EB] px-2 text-xs"
                />
                <nav className="mt-2 flex flex-col gap-0.5">
                  {filteredPanels.filter((p) => p.id !== "issues").map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => activateNav(p.id)}
                      className={
                        panel === p.id
                          ? "rounded-lg bg-[#111827] px-3 py-2 text-left text-xs font-semibold text-white"
                          : "rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#4B5563] hover:bg-[#F3F4F6]"
                      }
                    >
                      {p.label}
                    </button>
                  ))}
                </nav>
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {leftMode === "tree" ? (
              <SectionTree
                sections={sections}
                selectedId={selectedId}
                onSelect={selectSection}
                onMove={move}
                onToggle={toggle}
                onDuplicate={dupSection}
                onRemove={removeSection}
                onAddInZone={() => setPickerOpen(true)}
              />
            ) : null}
            {leftMode === "panels" && panel === "design" && (
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Starter themes</p>
                {(Object.keys(DESIGN_PRESETS) as DesignPresetId[]).map((id) => (
                  <button key={id} type="button" onClick={() => { patchSettings(applyDesignPreset(settings, id)); setPanel("theme"); }} className="block w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-left hover:border-[#FF5A1F]/50">
                    <span className="text-xs font-semibold text-[#111827]">{DESIGN_PRESETS[id].label}</span>
                    <span className="mt-0.5 block text-[11px] text-[#6B7280]">{DESIGN_PRESETS[id].description}</span>
                  </button>
                ))}
              </div>
            )}
            {leftMode === "panels" && panel === "navigation" && (
              <NavEditor title="Header" items={headerNav} onChange={(items) => { setHeaderNav(items); setNavDirty(true); markDirty(); }} />
            )}
            {leftMode === "panels" && panel === "theme" && (
              <ThemeControls settings={settings} contrast={contrast} onPatch={patchSettings} />
            )}
            {leftMode === "panels" && panel === "media" && (
              <p className="text-xs text-[#6B7280]">Logo, favicon, and section images use Cloudinary. Edit in the inspector.</p>
            )}
            {leftMode === "panels" && panel === "pages" && (
              <div className="space-y-2">
                <button type="button" className="block w-full rounded-lg bg-[#EFF6FF] px-3 py-2 text-left text-xs font-semibold text-[#2563EB]" onClick={() => { setLeftMode("tree"); setPanel("sections"); }}>Home page (visual editor)</button>
                {pages.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPageId(p.id)} className={pageId === p.id ? "block w-full rounded-lg bg-[#111827] px-3 py-2 text-left text-xs font-semibold text-white" : "block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#374151] hover:bg-[#F3F4F6]"}>
                    {p.title}
                    <span className="mt-0.5 block text-[10px] font-normal opacity-70">/{p.handle}</span>
                  </button>
                ))}
              </div>
            )}
            {leftMode === "panels" && panel === "seo" && (
              <p className="text-xs text-[#6B7280]">Edit SEO fields in the right panel.</p>
            )}
            {leftMode === "panels" && panel === "policies" && (
              <div className="space-y-2">
                {pages.filter((p) => ["terms", "privacy", "refund-policy", "shipping-policy", "contact", "about"].includes(p.handle)).map((p) => (
                  <button key={p.id} type="button" onClick={() => { setPageId(p.id); setPanel("pages"); }} className="block w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-left text-xs font-semibold">{p.title}</button>
                ))}
              </div>
            )}
            {leftMode === "panels" && panel === "settings" && (
              <p className="text-xs text-[#6B7280]">Brand assets live in the right panel.</p>
            )}
            </div>
          </div>
        </aside>

        <div className="relative min-h-0 min-w-0 overflow-hidden">
          <PreviewStage
            frameWidth={canvasWidth}
            zoomPercent={zoomPercent}
            selectedId={selectedId}
            onStageWidth={onStageWidth}
            onBackgroundClick={expandCanvas}
          >
            <div
              ref={previewRootRef}
              className="min-w-0 overflow-x-clip"
              data-preview-device={device}
              data-preview-width={canvasWidth}
              style={{
                ...cssVars,
                backgroundColor: settings.backgroundColor,
                color: settings.textColor,
                fontSize: `calc(100% * var(--store-font-scale, 1))`,
                fontFamily: `${settings.fontFamily}, system-ui, sans-serif`,
              }}
            >
              <PreviewCanvas
                storeName={storeName}
                handle={handle}
                logo={logo}
                settings={settings}
                sections={enabledSections}
                headerNav={headerNav}
                footerNav={footerNav}
                products={previewProducts}
                collections={previewCollections}
                storeId={storeId}
                device={device}
                onSelect={selectSection}
                selectedId={selectedId}
                onRequestAddSection={() => setPickerOpen(true)}
              />
            </div>
          </PreviewStage>
        </div>

        {(overlayPanels && !focusMode && (leftOpen || rightOpen)) ? (
          <button
            type="button"
            aria-label="Close panel"
            className="absolute inset-0 z-30 bg-[#111827]/25"
            onClick={() => {
              setLeftOpen(false);
              setRightOpen(false);
            }}
          />
        ) : null}

        <aside
          className={
            dockRight
              ? "min-h-0 min-w-0 overflow-hidden border-l border-[#E5E7EB] bg-white"
              : rightOpen && overlayPanels && !focusMode
                ? editorBp === "mobile"
                  ? "absolute inset-x-0 bottom-0 z-40 flex max-h-[min(85dvh,720px)] flex-col rounded-t-2xl border-t border-[#E5E7EB] bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl"
                  : "absolute inset-y-0 right-0 z-40 flex w-[min(340px,90vw)] flex-col border-l border-[#E5E7EB] bg-white shadow-2xl"
                : focusMode || overlayPanels
                  ? "hidden"
                  : "min-h-0 min-w-0 overflow-hidden"
          }
          aria-hidden={!dockRight && !(rightOpen && overlayPanels && !focusMode)}
        >
          <div className="flex h-full min-h-0 min-w-0 flex-col">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Inspector</p>
              <button type="button" aria-label="Close inspector" onClick={() => setRightOpen(false)} className="rounded-md px-2 py-1 text-[11px] font-semibold text-[#6B7280] hover:bg-[#F3F4F6]">Close</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {(panel === "issues" || hintsOpen) ? (
                <div className="mb-4 space-y-2">
                  <p className="text-xs font-semibold text-[#111827]">
                    Issues · {hints.length + canvasIssues.length}
                  </p>
                  {canvasIssues.length ? (
                    <ul className="space-y-2">
                      {canvasIssues.map((issue) => (
                        <li key={issue.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px]">
                          <p className="font-semibold text-amber-900">
                            [{issue.breakpoint}] {issue.sectionName} · {issue.severity}
                          </p>
                          <p className="mt-0.5 text-[#6B7280]">{issue.explanation}</p>
                          <p className="mt-0.5 text-[#374151]">{issue.fixHint}</p>
                          {issue.sectionId ? (
                            <button type="button" className="mt-1 font-semibold text-[#2563EB] underline" onClick={() => selectSection(issue.sectionId!)}>
                              Open setting
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {!hints.length && !canvasIssues.length ? (
                    <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800">No layout or content issues detected for this viewport.</p>
                  ) : (
                    <ul className="space-y-2">
                      {hints.map((h) => (
                        <li key={h.id} className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-[11px]">
                          <p className={h.severity === "warn" ? "font-semibold text-amber-800" : "font-semibold text-[#374151]"}>[{h.breakpoint}] {h.message}</p>
                          <p className="mt-0.5 text-[#6B7280]">{h.suggestion}</p>
                          {h.sectionId ? (
                            <button type="button" className="mt-1 mr-2 font-semibold text-[#2563EB] underline" onClick={() => selectSection(h.sectionId!)}>Go to section</button>
                          ) : null}
                          {h.fix?.propsPatch && h.fix.sectionId ? (
                            <button
                              type="button"
                              className="mt-1 font-semibold text-[#FF5A1F] underline"
                              onClick={() => {
                                updateSectionProps(h.fix!.sectionId, h.fix!.propsPatch || {});
                                if (h.fix?.sectionId) selectSection(h.fix.sectionId);
                              }}
                            >
                              Apply suggested fix
                            </button>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
          {panel === "design" || panel === "settings" || panel === "media" ? (
            <BrandPanel settings={settings} logo={logo} storeName={storeName} onPatch={patchSettings} onError={setError} />
          ) : null}
          {panel === "theme" ? (
            <ThemeControls settings={settings} contrast={contrast} onPatch={patchSettings} />
          ) : null}
          {(panel === "sections" || leftMode === "tree") && selected ? (
            <SectionInspector section={selected} storeId={storeId} onProps={(patch) => updateSectionProps(selected.id, patch)} onToggle={() => toggle(selected.id)} />
          ) : null}
          {(panel === "sections" || leftMode === "tree") && !selected ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#111827]">Select a section to edit</p>
              <p className="text-xs text-[#6B7280]">
                Click a section in the preview or the left tree. Settings stay closed until something is selected.
              </p>
              <button type="button" onClick={() => setPickerOpen(true)} className="w-full rounded-lg bg-[#2563EB] px-3 py-2 text-xs font-semibold text-white">+ Add section</button>
            </div>
          ) : null}
          {panel === "navigation" ? (
            <div className="space-y-4">
              <NavEditor title="Header menu" items={headerNav} onChange={(items) => { setHeaderNav(items); setNavDirty(true); markDirty(); }} />
              <NavEditor title="Footer menu" items={footerNav} onChange={(items) => { setFooterNav(items); setNavDirty(true); markDirty(); }} />
              <button type="button" disabled={busy || !navDirty} onClick={() => void saveNav().then(() => setMessage("Navigation saved."))} className="rounded-md bg-[#111827] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Save navigation</button>
            </div>
          ) : null}
          {panel === "pages" && page ? (
            <div className="space-y-3">
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-[#374151]">Title</span>
                <input
                  value={page.title}
                  onChange={(e) =>
                    setPages((prev) =>
                      prev.map((p) => (p.id === page.id ? { ...p, title: e.target.value } : p))
                    )
                  }
                  className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold text-[#374151]">Body HTML</span>
                <textarea
                  value={page.body_html || ""}
                  onChange={(e) =>
                    setPages((prev) =>
                      prev.map((p) =>
                        p.id === page.id ? { ...p, body_html: e.target.value } : p
                      )
                    )
                  }
                  rows={10}
                  className="w-full rounded-md border border-[#E5E7EB] px-2 py-2 font-mono text-[11px]"
                />
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={page.published}
                  onChange={(e) =>
                    setPages((prev) =>
                      prev.map((p) =>
                        p.id === page.id ? { ...p, published: e.target.checked } : p
                      )
                    )
                  }
                />
                Published
              </label>
              {POLICY_TEMPLATES[page.handle] ? (
                <button
                  type="button"
                  onClick={() => applyTemplate(page.handle)}
                  className="rounded-md border border-[#E5E7EB] px-3 py-2 text-xs font-semibold"
                >
                  Apply professional template
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  void savePagePatch({
                    title: page.title,
                    body_html: page.body_html || "",
                    published: page.published,
                  })
                }
                className="rounded-md bg-[#111827] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Save page
              </button>
              <a
                href={`${liveUrl.replace(/\/$/, "")}/${["terms","privacy","contact","about","refund-policy","shipping-policy"].includes(page.handle) ? page.handle : `pages/${page.handle}`}`}
                target="_blank"
                rel="noreferrer"
                className="block text-xs font-semibold text-[#FF5A1F] hover:underline"
              >
                View live ↗
              </a>
            </div>
          ) : null}
          {panel === "seo" ? (
            <div className="space-y-3">
              <label className="block text-xs">
                <span className="mb-1 block font-semibold">SEO title ({String(seo.title || storeName).length}/60)</span>
                <input
                  value={String(seo.title || "")}
                  onChange={(e) => {
                    setSeo((s) => ({ ...s, title: e.target.value }));
                    setSeoDirty(true);
                    markDirty();
                  }}
                  placeholder={storeName}
                  className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
                />
              </label>
              <label className="block text-xs">
                <span className="mb-1 block font-semibold">Meta description ({String(seo.description || "").length}/155)</span>
                <textarea
                  value={String(seo.description || "")}
                  onChange={(e) => {
                    setSeo((s) => ({ ...s, description: e.target.value }));
                    setSeoDirty(true);
                    markDirty();
                  }}
                  rows={3}
                  className="w-full rounded-md border border-[#E5E7EB] px-2 py-2 text-sm"
                />
              </label>
              <button
                type="button"
                className="text-xs font-semibold text-[#FF5A1F] underline"
                onClick={() => {
                  setSeo((s) => ({
                    ...s,
                    description: suggestSeoDescription(storeName, initialDescription),
                  }));
                  setSeoDirty(true);
                  markDirty();
                }}
              >
                Suggest description
              </button>
              <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-3">
                <p className="text-[11px] font-semibold text-[#6B7280]">Google preview</p>
                <p className="mt-2 text-sm text-[#1a0dab]">{String(seo.title || storeName)}</p>
                <p className="text-[11px] text-emerald-800">{liveUrl}</p>
                <p className="mt-1 text-xs text-[#4B5563]">
                  {String(seo.description || initialDescription || `Shop ${storeName}`).slice(0, 155)}
                </p>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Social links</p>
              {["instagram", "tiktok", "facebook", "youtube", "x", "linkedin"].map((key) => (
                <label key={key} className="block text-xs capitalize">
                  <span className="mb-1 block font-semibold">{key}</span>
                  <input
                    value={String(social[key] || "")}
                    onChange={(e) => {
                      setSocial((s) => ({ ...s, [key]: e.target.value }));
                      setSeoDirty(true);
                      markDirty();
                    }}
                    placeholder="https://"
                    className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
                  />
                </label>
              ))}
              <button
                type="button"
                disabled={busy || !seoDirty}
                onClick={() => void saveSeo().then(() => setMessage("SEO saved.")).catch(() => setError("SEO save failed."))}
                className="rounded-md bg-[#111827] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Save SEO
              </button>
            </div>
          ) : null}
          {panel === "policies" ? (
            <p className="text-xs text-[#6B7280]">Open a policy from the left list to edit content and apply templates.</p>
          ) : null}

            </div>
          </div>
        </aside>
      </div>
    <SectionPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(type) => addSection(type)} />
    </div>
  );
}

function BrandPanel({
  settings,
  logo,
  storeName,
  onPatch,
  onError,
}: {
  settings: ThemeSettings;
  logo: string | null;
  storeName: string;
  onPatch: (p: Partial<ThemeSettings>) => void;
  onError: (e: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Brand</p>
        <div className="mt-2 flex items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="h-14 w-14 rounded-xl object-cover" style={{ boxShadow: "var(--store-shadow)" }} />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-xl text-lg font-bold text-white" style={{ background: settings.primaryColor }}>
              {storeName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="space-y-2">
            <CloudinaryUploadButton
              folder="jimvio/vendor-logos"
              resourceType="image"
              buttonText={logo ? "Replace logo" : "Upload logo"}
              onUploadSuccess={(url) => onPatch({ logoUrl: url })}
              onUploadError={onError}
            />
            {logo ? (
              <button type="button" onClick={() => onPatch({ logoUrl: null })} className="block text-xs font-semibold text-[#6B7280] underline">
                Remove logo
              </button>
            ) : null}
          </div>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold">Logo size</p>
        <div className="flex gap-1">
          {(["small", "medium", "large"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onPatch({ logoSize: s })}
              className={
                settings.logoSize === s
                  ? "rounded-md bg-[#111827] px-2.5 py-1.5 text-[11px] font-semibold capitalize text-white"
                  : "rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-[11px] font-semibold capitalize"
              }
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold">Header alignment</p>
        <div className="flex gap-1">
          {(["left", "centered"] as const).map((a) => (
            <button
              key={a}
              type="button"
              onClick={() => onPatch({ headerAlign: a, headerStyle: a === "centered" ? "centered" : "simple" })}
              className={
                (settings.headerAlign || "left") === a
                  ? "rounded-md bg-[#111827] px-2.5 py-1.5 text-[11px] font-semibold capitalize text-white"
                  : "rounded-md border border-[#E5E7EB] px-2.5 py-1.5 text-[11px] font-semibold capitalize"
              }
            >
              {a}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold">Favicon</p>
        <CloudinaryUploadButton
          folder="jimvio/vendor-logos"
          resourceType="image"
          buttonText={settings.faviconUrl ? "Replace favicon" : "Upload favicon"}
          onUploadSuccess={(url) => onPatch({ faviconUrl: url })}
          onUploadError={onError}
        />
        {settings.faviconUrl ? (
          <button type="button" onClick={() => onPatch({ faviconUrl: null })} className="mt-2 block text-xs font-semibold text-[#6B7280] underline">
            Remove favicon
          </button>
        ) : null}
      </div>
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input
          type="checkbox"
          checked={settings.stickyHeader !== false}
          onChange={(e) => onPatch({ stickyHeader: e.target.checked })}
        />
        Sticky header
      </label>
      <label className="flex items-center gap-2 text-xs font-semibold">
        <input
          type="checkbox"
          checked={settings.showPoweredBy !== false}
          onChange={(e) => onPatch({ showPoweredBy: e.target.checked })}
        />
        Show “Powered by Jimvio”
      </label>
      <label className="block text-xs">
        <span className="mb-1 block font-semibold">Mobile navigation</span>
        <select
          value={settings.mobileNavStyle || "bottom"}
          onChange={(e) => onPatch({ mobileNavStyle: e.target.value as ThemeSettings["mobileNavStyle"] })}
          className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
        >
          <option value="bottom">Bottom bar</option>
          <option value="drawer">Menu drawer only</option>
          <option value="hidden">Hidden</option>
        </select>
      </label>
    </div>
  );
}

function ThemeControls({
  settings,
  contrast,
  onPatch,
}: {
  settings: ThemeSettings;
  contrast: string | null;
  onPatch: (p: Partial<ThemeSettings>) => void;
}) {
  const colors: Array<[keyof ThemeSettings, string]> = [
    ["primaryColor", "Primary"],
    ["secondaryColor", "Secondary"],
    ["accentColor", "Accent"],
    ["backgroundColor", "Background"],
    ["surfaceColor", "Surface"],
    ["textColor", "Text"],
    ["mutedTextColor", "Muted"],
    ["borderColor", "Border"],
    ["headerBackground", "Header"],
    ["announcementBackground", "Announcement"],
    ["announcementTextColor", "Announcement text"],
    ["buttonColor", "Button"],
    ["buttonTextColor", "Button text"],
  ];
  return (
    <div className="space-y-2">
      {contrast ? <p className="rounded-md bg-amber-50 px-2 py-1.5 text-[11px] font-semibold text-amber-800">{contrast}</p> : null}
      <details open className="rounded-lg border border-[#E5E7EB] p-2">
        <summary className="cursor-pointer text-xs font-semibold text-[#111827]">Color palette</summary>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {colors.map(([key, label]) => (
            <label key={key} className="block text-[11px]">
              <span className="mb-1 block font-semibold text-[#6B7280]">{label}</span>
              <input
                type="color"
                value={String(settings[key] || "#000000").startsWith("#") ? String(settings[key]) : "#000000"}
                onChange={(e) => onPatch({ [key]: e.target.value } as Partial<ThemeSettings>)}
                className="h-9 w-full cursor-pointer rounded border border-[#E5E7EB]"
              />
            </label>
          ))}
        </div>
      </details>
      <details className="rounded-lg border border-[#E5E7EB] p-2">
        <summary className="cursor-pointer text-xs font-semibold text-[#111827]">Typography</summary>
        <div className="mt-2 space-y-2">
          <label className="block text-xs">
            <span className="mb-1 block font-semibold">Font family</span>
            <select
              value={settings.fontFamily}
              onChange={(e) => onPatch({ fontFamily: e.target.value, headingFont: e.target.value })}
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
            >
              {["DM Sans", "Inter", "Georgia", "system-ui"].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-semibold">Font scale</span>
            <select
              value={settings.fontScale || "md"}
              onChange={(e) => onPatch({ fontScale: e.target.value as ThemeSettings["fontScale"] })}
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </label>
        </div>
      </details>
      <details className="rounded-lg border border-[#E5E7EB] p-2">
        <summary className="cursor-pointer text-xs font-semibold text-[#111827]">Buttons</summary>
        <div className="mt-2 space-y-2">
          <label className="block text-xs">
            <span className="mb-1 block font-semibold">Button style</span>
            <select
              value={settings.buttonStyle || "filled"}
              onChange={(e) => onPatch({ buttonStyle: e.target.value as ButtonStyle })}
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
            >
              {["filled", "outline", "ghost", "soft", "link"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-semibold">Button radius</span>
            <select
              value={settings.buttonRadius || "9999px"}
              onChange={(e) => onPatch({ buttonRadius: e.target.value })}
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
            >
              {["4px", "8px", "12px", "9999px"].map((r) => (
                <option key={r} value={r}>{r === "9999px" ? "Pill" : r}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-semibold">Input radius</span>
            <select
              value={settings.inputRadius || "9999px"}
              onChange={(e) => onPatch({ inputRadius: e.target.value })}
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
            >
              {["4px", "8px", "12px", "9999px"].map((r) => (
                <option key={r} value={r}>{r === "9999px" ? "Pill" : r}</option>
              ))}
            </select>
          </label>
        </div>
      </details>
      <details className="rounded-lg border border-[#E5E7EB] p-2">
        <summary className="cursor-pointer text-xs font-semibold text-[#111827]">Layout & shape</summary>
        <div className="mt-2 space-y-2">
          <label className="block text-xs">
            <span className="mb-1 block font-semibold">Corner radius</span>
            <select
              value={settings.radius}
              onChange={(e) => onPatch({ radius: e.target.value, cardRadius: e.target.value })}
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
            >
              {["4px", "8px", "12px", "16px", "24px"].map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-semibold">Product columns</span>
            <select
              value={String(settings.productGridColumns || 3)}
              onChange={(e) => onPatch({ productGridColumns: Number(e.target.value) as 2 | 3 | 4 })}
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
            >
              {[2, 3, 4].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-semibold">Shadow</span>
            <select
              value={settings.shadow || "subtle"}
              onChange={(e) => onPatch({ shadow: e.target.value as ThemeSettings["shadow"] })}
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
            >
              {["none", "subtle", "medium", "strong"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
      </details>
    </div>
  );
}

function NavEditor({
  title,
  items,
  onChange,
}: {
  title: string;
  items: NavItem[];
  onChange: (items: NavItem[]) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">{title}</p>
      {items.map((item, i) => (
        <div key={`${item.label}-${i}`} className="space-y-1 rounded-lg border border-[#E5E7EB] p-2">
          <input
            value={item.label}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...item, label: e.target.value };
              onChange(next);
            }}
            className="h-8 w-full rounded border border-[#E5E7EB] px-2 text-xs"
            placeholder="Label"
          />
          <input
            value={item.href}
            onChange={(e) => {
              const next = [...items];
              next[i] = { ...item, href: e.target.value };
              onChange(next);
            }}
            className="h-8 w-full rounded border border-[#E5E7EB] px-2 text-xs"
            placeholder="/collections/all"
          />
          {!isSafeNavHref(item.href) ? (
            <p className="text-[10px] font-semibold text-red-600">Unsafe URL</p>
          ) : null}
          <div className="flex gap-1">
            <button type="button" className="text-[10px] font-semibold" onClick={() => {
              if (i === 0) return;
              const next = [...items];
              const [x] = next.splice(i, 1);
              next.splice(i - 1, 0, x!);
              onChange(next);
            }}>↑</button>
            <button type="button" className="text-[10px] font-semibold" onClick={() => {
              if (i >= items.length - 1) return;
              const next = [...items];
              const [x] = next.splice(i, 1);
              next.splice(i + 1, 0, x!);
              onChange(next);
            }}>↓</button>
            <button type="button" className="text-[10px] font-semibold text-red-600" onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove</button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, { label: "New link", href: "/" }])}
        className="rounded-md border border-dashed border-[#D1D5DB] px-2 py-1.5 text-[11px] font-semibold text-[#374151]"
      >
        + Add item
      </button>
    </div>
  );
}

function SectionInspector({
  section,
  storeId,
  onProps,
  onToggle,
}: {
  section: ThemeSection;
  storeId: string;
  onProps: (patch: Record<string, unknown>) => void;
  onToggle: () => void;
}) {
  const props = section.props || {};
  const [aiBusy, setAiBusy] = useState(false);
  const [aiPreview, setAiPreview] = useState<{
    headline?: string;
    subhead?: string;
    cta?: string;
    body?: string;
  } | null>(null);
  const [aiNote, setAiNote] = useState<string | null>(null);

  const isProductSection = [
    "featured_products",
    "best_sellers",
    "new_arrivals",
    "sale_rail",
  ].includes(section.type);
  const isCollectionSection = section.type === "collections";

  const videoCheck =
    section.type === "video"
      ? resolveVideoEmbedUrl(typeof props.url === "string" ? props.url : "")
      : null;

  async function improveCopy() {
    setAiBusy(true);
    setAiNote(null);
    setAiPreview(null);
    const seed =
      String(props.headline || props.title || props.text || section.type).slice(0, 120) ||
      "storefront";
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "store_section_copy",
          sectionType: section.type,
          storeName: seed,
          current: {
            headline: props.headline,
            subhead: props.subhead,
            title: props.title,
            cta: props.cta,
            body: props.body || props.text,
          },
          tone: "ecommerce",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { headline?: string; subhead?: string; cta?: string; body?: string };
        code?: string;
        error?: string;
      };
      if (res.ok && json.success && json.data) {
        setAiPreview(json.data);
        setAiNote("Preview AI suggestions — apply only if you like them.");
      } else {
        setAiPreview({
          headline: suggestHeadline(String(props.headline || seed), seed),
        });
        setAiNote(
          json.code === "provider_unconfigured"
            ? "AI provider not configured — showing local suggestion."
            : "AI unavailable — showing local suggestion."
        );
      }
    } catch {
      setAiPreview({
        headline: suggestHeadline(String(props.headline || seed), seed),
      });
      setAiNote("AI unavailable — showing local suggestion.");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold capitalize text-[#111827]">
          {section.type.replace(/_/g, " ")}
        </p>
        <button type="button" onClick={onToggle} className="text-xs font-semibold text-[#6B7280] underline">
          {section.enabled ? "Disable" : "Enable"}
        </button>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-2.5">
        <p className="mb-2 text-[11px] font-semibold text-[#374151]">Visibility</p>
        {(
          [
            ["hideOnMobile", "Hide on mobile"],
            ["hideOnTablet", "Hide on tablet"],
            ["hideOnDesktop", "Hide on desktop"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="mb-1 flex items-center gap-2 text-[11px] text-[#4B5563]">
            <input
              type="checkbox"
              checked={props[key] === true}
              onChange={(e) => onProps({ [key]: e.target.checked })}
            />
            {label}
          </label>
        ))}
      </div>

      {section.type === "hero" ? (
        <>
          <label className="block text-xs">
            <span className="mb-1 block font-semibold">Preset</span>
            <select
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
              defaultValue=""
              onChange={(e) => {
                if (!e.target.value) return;
                onProps(applyHeroPreset(props, e.target.value));
              }}
            >
              <option value="">Keep current</option>
              {Object.entries(HERO_PRESETS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </label>
          {(["eyebrow", "headline", "headlineAccent", "subhead", "cta", "ctaSecondary", "trustItems"] as const).map((k) => (
            <Field key={k} label={k} value={String(props[k] || "")} onChange={(v) => onProps({ [k]: v })} />
          ))}
          <label className="block text-xs">
            <span className="mb-1 block font-semibold">Primary CTA destination</span>
            <select
              value={String(props.ctaHref || "/collections/all")}
              onChange={(e) => onProps({ ctaHref: e.target.value })}
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
            >
              <option value="/collections/all">All products</option>
              <option value="/search">Search</option>
              <option value="/pages/about">About</option>
              <option value="/pages/contact">Contact</option>
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-semibold">Layout</span>
            <select
              value={String(props.layout || "left")}
              onChange={(e) => onProps({ layout: e.target.value })}
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
            >
              {["left", "center", "right", "split"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
          <div>
            <p className="mb-1 text-xs font-semibold">Hero image</p>
            <CloudinaryUploadButton
              folder="jimvio/banners"
              resourceType="image"
              buttonText={props.imageUrl ? "Replace image" : "Upload image"}
              onUploadSuccess={(url) => onProps({ imageUrl: url })}
            />
            {typeof props.imageUrl === "string" && props.imageUrl ? (
              <button type="button" className="mt-1 text-xs underline" onClick={() => onProps({ imageUrl: "" })}>
                Remove image
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {section.type === "announcement" ? (
        <Field label="Text" value={String(props.text || "")} onChange={(v) => onProps({ text: v })} />
      ) : null}

      {isProductSection ? (
        <div className="space-y-2 rounded-lg border border-[#E5E7EB] p-2.5">
          <p className="text-[11px] font-semibold text-[#374151]">Merchandising</p>
          <Field
            label="title"
            value={String(props.title || "")}
            onChange={(v) => onProps({ title: v })}
          />
          <label className="block text-xs">
            <span className="mb-1 block font-semibold">Sort</span>
            <select
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
              value={String(props.sort || (section.type === "new_arrivals" ? "newest" : "manual"))}
              onChange={(e) => onProps({ sort: e.target.value })}
            >
              <option value="manual">Featured / catalog order</option>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-semibold">Limit</span>
            <input
              type="number"
              min={1}
              max={24}
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
              value={Number(props.limit) || 8}
              onChange={(e) => onProps({ limit: Math.min(24, Math.max(1, Number(e.target.value) || 8)) })}
            />
          </label>
          <ProductPicker
            storeId={storeId}
            selectedIds={
              Array.isArray(props.productIds)
                ? props.productIds.filter((id): id is string => typeof id === "string")
                : []
            }
            onChange={(ids) => onProps({ productIds: ids })}
          />
        </div>
      ) : null}

      {isCollectionSection ? (
        <div className="space-y-2 rounded-lg border border-[#E5E7EB] p-2.5">
          <Field
            label="title"
            value={String(props.title || "")}
            onChange={(v) => onProps({ title: v })}
          />
          <label className="block text-xs">
            <span className="mb-1 block font-semibold">Layout</span>
            <select
              className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
              value={String(props.layout || "icons")}
              onChange={(e) => onProps({ layout: e.target.value })}
            >
              <option value="icons">Icon row</option>
              <option value="tiles">Collection tiles</option>
            </select>
          </label>
          <CollectionPicker
            storeId={storeId}
            selectedIds={
              Array.isArray(props.collectionIds)
                ? props.collectionIds.filter((id): id is string => typeof id === "string")
                : []
            }
            onChange={(ids) => onProps({ collectionIds: ids })}
          />
        </div>
      ) : null}

      {section.type === "video" ? (
        <div className="space-y-2">
          <Field
            label="Video URL (YouTube / Vimeo / HTTPS embed)"
            value={String(props.url || "")}
            onChange={(v) => onProps({ url: v })}
          />
          {videoCheck && !videoCheck.ok ? (
            <p className="text-[11px] font-medium text-amber-700">{videoCheck.error}</p>
          ) : null}
          {videoCheck?.ok ? (
            <p className="text-[11px] text-emerald-700">
              Detected {videoCheck.provider} — ready for storefront embed.
            </p>
          ) : null}
          <label className="flex items-center gap-2 text-[11px] text-[#4B5563]">
            <input
              type="checkbox"
              checked={props.autoplay === true}
              onChange={(e) => onProps({ autoplay: e.target.checked, muted: e.target.checked ? true : props.muted })}
            />
            Autoplay (muted)
          </label>
        </div>
      ) : null}

      {["gallery", "newsletter", "faq", "testimonials", "stats", "contact_block", "discount_banner", "trust_shipping", "banner", "image_text", "rich_text"].includes(section.type) ? (
        <div className="space-y-2">
          {Object.entries(props)
            .filter(([k, v]) =>
              !k.startsWith("hideOn") &&
              k !== "sort" &&
              k !== "limit" &&
              (typeof v === "string" || typeof v === "number")
            )
            .map(([k, v]) => (
              <Field key={k} label={k} value={String(v)} onChange={(nv) => onProps({ [k]: nv })} />
            ))}
          {section.type === "image_text" ? (
            <>
              <CloudinaryUploadButton
                folder="jimvio/banners"
                resourceType="image"
                buttonText="Upload section image"
                onUploadSuccess={(url) => onProps({ imageUrl: url })}
              />
              <Field
                label="imageAlt"
                value={String(props.imageAlt || "")}
                onChange={(v) => onProps({ imageAlt: v })}
              />
            </>
          ) : null}
          {section.type === "newsletter" ? (
            <p className="text-[11px] text-[#6B7280]">
              Subscribers are captured per-store with ownership isolation. Email delivery uses your configured provider when available.
            </p>
          ) : null}
        </div>
      ) : null}

      {["hero", "announcement", "banner", "newsletter", "faq", "testimonials", "image_text", "rich_text", "discount_banner"].includes(section.type) ? (
        <div className="space-y-2 border-t border-[#E5E7EB] pt-3">
          <button
            type="button"
            disabled={aiBusy}
            className="text-xs font-semibold text-[#FF5A1F] underline disabled:opacity-50"
            onClick={() => void improveCopy()}
          >
            {aiBusy ? "Generating…" : "Suggest copy (AI)"}
          </button>
          {aiNote ? <p className="text-[11px] text-[#6B7280]">{aiNote}</p> : null}
          {aiPreview ? (
            <div className="rounded-lg border border-[#E5E7EB] bg-[#FFF7ED] p-2.5 text-[11px]">
              {aiPreview.headline ? <p><span className="font-semibold">Headline:</span> {aiPreview.headline}</p> : null}
              {aiPreview.subhead ? <p className="mt-1"><span className="font-semibold">Subhead:</span> {aiPreview.subhead}</p> : null}
              {aiPreview.cta ? <p className="mt-1"><span className="font-semibold">CTA:</span> {aiPreview.cta}</p> : null}
              {aiPreview.body ? <p className="mt-1"><span className="font-semibold">Body:</span> {aiPreview.body}</p> : null}
              <button
                type="button"
                className="mt-2 font-semibold text-[#FF5A1F] underline"
                onClick={() => {
                  const patch: Record<string, unknown> = {};
                  if (aiPreview.headline) {
                    if ("headline" in props || section.type === "hero") patch.headline = aiPreview.headline;
                    else if ("title" in props) patch.title = aiPreview.headline;
                    else if ("text" in props) patch.text = aiPreview.headline;
                    else patch.headline = aiPreview.headline;
                  }
                  if (aiPreview.subhead) patch.subhead = aiPreview.subhead;
                  if (aiPreview.cta) patch.cta = aiPreview.cta;
                  if (aiPreview.body) {
                    if ("body" in props) patch.body = aiPreview.body;
                    else if (section.type === "announcement") patch.text = aiPreview.body;
                  }
                  onProps(patch);
                  setAiPreview(null);
                  setAiNote("Applied — draft only until you Save / Publish.");
                }}
              >
                Apply suggestion
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-semibold capitalize text-[#6B7280]">{label.replace(/_/g, " ")}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-[#E5E7EB] px-2 text-sm"
      />
    </label>
  );
}


function PreviewCanvas({
  storeName,
  handle,
  logo,
  settings,
  sections,
  headerNav,
  footerNav,
  products,
  collections,
  storeId,
  device,
  onSelect,
  selectedId,
  onRequestAddSection,
}: {
  storeName: string;
  handle: string;
  logo: string | null;
  settings: ThemeSettings;
  sections: ThemeSection[];
  headerNav: NavItem[];
  footerNav: NavItem[];
  products: PreviewProduct[];
  collections: PreviewCollection[];
  storeId: string;
  device: Device;
  onSelect: (id: string) => void;
  selectedId: string | null;
  onRequestAddSection?: () => void;
}) {
  const announcement = sections.find((s) => s.type === "announcement" && s.enabled);
  const header = sections.find((s) => s.type === "header" && s.enabled);
  const footer = sections.find((s) => s.type === "footer" && s.enabled);
  const contentSections = sections.filter(
    (s) => !["announcement", "header", "footer"].includes(s.type)
  );

  return (
    <div className="text-[var(--store-text)]">
      {announcement ? (
        <CanvasSectionFrame
          sectionId={announcement.id}
          sectionType={announcement.type}
          selected={selectedId === announcement.id}
          onSelect={onSelect}
          showInsertBelow
          onInsertBelow={onRequestAddSection}
        >
          <StorefrontAnnouncement
            storeName={storeName}
            previewDevice={device}
            text={
              typeof announcement.props?.text === "string"
                ? announcement.props.text
                : null
            }
          />
        </CanvasSectionFrame>
      ) : null}
      {header ? (
        <CanvasSectionFrame
          sectionId={header.id}
          sectionType={header.type}
          selected={selectedId === header.id}
          onSelect={onSelect}
          showInsertBelow
          onInsertBelow={onRequestAddSection}
        >
          <StorefrontHeader
            storeName={storeName}
            handle={handle}
            logoUrl={logo}
            navItems={headerNav}
            onStoreHost
            sticky={settings.stickyHeader !== false}
            centered={
              settings.headerAlign === "centered" ||
              settings.headerStyle === "centered"
            }
            showPoweredBy={settings.showPoweredBy !== false}
            storeId={storeId}
            previewDevice={device}
          />
        </CanvasSectionFrame>
      ) : null}
      {!products.length &&
      contentSections.some((s) =>
        ["featured_products", "best_sellers", "new_arrivals", "collections", "sale_rail"].includes(
          s.type
        )
      ) ? (
        <p className="mx-4 my-6 rounded-xl border border-dashed border-black/10 px-4 py-8 text-center text-xs opacity-60">
          No products published yet — product sections will fill once you add catalog items.
        </p>
      ) : null}
      <StorefrontHomeSections
        sections={contentSections}
        products={products}
        collections={collections}
        handle={handle}
        storeName={storeName}
        themeSettings={settings}
        onStoreHost
        device={device}
        preview
        onSelectSection={onSelect}
        selectedId={selectedId}
        storeId={storeId}
      />
      {footer ? (
        <CanvasSectionFrame
          sectionId={footer.id}
          sectionType={footer.type}
          selected={selectedId === footer.id}
          onSelect={onSelect}
        >
          <StorefrontFooter
            storeName={storeName}
            handle={handle}
            navItems={footerNav}
            onStoreHost
            previewDevice={device}
            logoUrl={logo}
            showPoweredBy={settings.showPoweredBy !== false}
          />
        </CanvasSectionFrame>
      ) : null}
      {(settings.mobileNavStyle || "bottom") === "bottom" &&
      (device === "mobile" || device === "tablet") ? (
        <StorefrontMobileNav
          handle={handle}
          storeId={storeId}
          onStoreHost
          previewDevice={device}
        />
      ) : null}
    </div>
  );
}
