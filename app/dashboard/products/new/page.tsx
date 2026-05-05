"use client";
import { useState } from "react";
import {
    ArrowLeft,
    ChevronRight,
    Zap,
    X,
    Sparkles,
    Upload,
    Image as ImageIcon,
    Play,
    BookOpen,
    Target,
    FileText,
    Monitor,
    LayoutTemplate,
    Users,
    Package,
    Globe,
    Lock,
    Search,
    Clock,
    Check,
    Circle,
    Link,
    ChevronDown,
    AlertTriangle,
} from "lucide-react";

/* ─── HELPERS ──────────────────────────────────── */
const slugify = (t: string) =>
    t
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");

/* ─── CONSTANTS ────────────────────────────────── */
const STEPS = [
    { id: 1, label: "Details" },
    { id: 2, label: "Pricing" },
    { id: 3, label: "Settings" },
    { id: 4, label: "Publish" },
];

const BILLING_PERIODS = [
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
    { id: "quarterly", label: "Quarterly" },
    { id: "yearly", label: "Yearly" },
];

const STATUS_OPTIONS = [
    { id: "draft", label: "Draft" },
    { id: "active", label: "Active" },
    { id: "paused", label: "Paused" },
    { id: "archived", label: "Archived" },
];

const PRODUCT_SUBTYPES = [
    { id: "course", label: "Course", Icon: BookOpen },
    { id: "coaching", label: "Coaching", Icon: Target },
    { id: "ebook", label: "E-book", Icon: FileText },
    { id: "software", label: "Software", Icon: Monitor },
    { id: "templates", label: "Templates", Icon: LayoutTemplate },
    { id: "community", label: "Community", Icon: Users },
    { id: "bundle", label: "Bundle", Icon: Package },
];

const BUTTON_TEXTS = [
    "Buy Now",
    "Get Access",
    "Order Now",
    "Purchase",
    "Download",
    "Subscribe",
    "Join now",
];

const CATEGORIES = [
    { id: "1", name: "Online Education", type: "digital" },
    { id: "2", name: "Business & Finance", type: "digital" },
    { id: "3", name: "Design & Creative", type: "digital" },
    { id: "4", name: "Health & Fitness", type: "both" },
    { id: "5", name: "Technology", type: "digital" },
    { id: "6", name: "Physical Books", type: "physical" },
    { id: "7", name: "Merchandise", type: "physical" },
];

/* ─── FORM TYPE ─────────────────────────────────── */
interface FormState {
    name: string;
    slug: string;
    short_description: string;
    description: string;
    product_type: "digital" | "physical";
    product_subtype: string;
    price: string;
    currency: string;
    category_id: string;
    pricing_type: "one_time" | "recurring";
    billing_period: string;
    digital_file_url: string;
    track_inventory: boolean;
    inventory_quantity: string;
    affiliate_enabled: boolean;
    affiliate_commission_rate: string;
    is_featured: boolean;
    status: string;
    button_text: string;
    tags: string;
    weight: string;
    dimensions: string;
    images: string[];
    custom_domain: boolean;
    show_author: boolean;
    show_reviews: boolean;
    enable_discussions: boolean;
}

/* ─── CSS ───────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

  /* ── LIGHT THEME (default) ── */
  .pf-root {
    --pf-bg: #f5f5f5;
    --pf-surface: #ffffff;
    --pf-surface-secondary: #f4f4f4;
    --pf-border: #e4e4e4;
    --pf-border-strong: #cccccc;
    --pf-accent: #fd5000;
    --pf-accent-hover: #e04700;
    --pf-accent-light: #fff3ee;
    --pf-accent-subtle: #ffe8de;
    --pf-text-primary: #11181c;
    --pf-text-secondary: #3c4248;
    --pf-text-muted: #7e8a92;
    --pf-success: #30a46c;
    --pf-success-light: #e9f9ef;
    --pf-success-border: rgba(48,164,108,0.25);
    --pf-err-bg: #fff5f5;
    --pf-err-border: #fecaca;
    --pf-err-text: #dc2626;
    --pf-tb-bg: rgba(245,245,245,0.92);
    --pf-btn-next-hover: #2a2a2a;
    --pf-cover-gradient: linear-gradient(135deg, #f4f4f4 0%, #eeeceb 100%);

    font-family: 'DM Sans', system-ui, sans-serif;
    background: var(--pf-bg);
    min-height: 100vh;
    color: var(--pf-text-primary);
    -webkit-font-smoothing: antialiased;
    letter-spacing: -0.01em;
  }

  /* ── DARK THEME — system preference ── */
  @media (prefers-color-scheme: dark) {
    .pf-root {
      --pf-bg: #0f0f0f;
      --pf-surface: #1a1a1a;
      --pf-surface-secondary: #222222;
      --pf-border: #2e2e2e;
      --pf-border-strong: #3d3d3d;
      --pf-accent: #fd5000;
      --pf-accent-hover: #ff6820;
      --pf-accent-light: #2a1500;
      --pf-accent-subtle: #3a1c00;
      --pf-text-primary: #ededed;
      --pf-text-secondary: #b0b8be;
      --pf-text-muted: #6b7580;
      --pf-success: #3dba7f;
      --pf-success-light: #0d2a1a;
      --pf-success-border: rgba(61,186,127,0.25);
      --pf-err-bg: #2a0a0a;
      --pf-err-border: #7f1d1d;
      --pf-err-text: #f87171;
      --pf-tb-bg: rgba(15,15,15,0.92);
      --pf-btn-next-hover: #dedede;
      --pf-cover-gradient: linear-gradient(135deg, #222 0%, #1a1a1a 100%);
    }
  }

  /* ── DARK THEME — explicit data attribute (for manual toggle) ── */
  .pf-root[data-theme="dark"] {
    --pf-bg: #0f0f0f;
    --pf-surface: #1a1a1a;
    --pf-surface-secondary: #222222;
    --pf-border: #2e2e2e;
    --pf-border-strong: #3d3d3d;
    --pf-accent: #fd5000;
    --pf-accent-hover: #ff6820;
    --pf-accent-light: #2a1500;
    --pf-accent-subtle: #3a1c00;
    --pf-text-primary: #ededed;
    --pf-text-secondary: #b0b8be;
    --pf-text-muted: #6b7580;
    --pf-success: #3dba7f;
    --pf-success-light: #0d2a1a;
    --pf-success-border: rgba(61,186,127,0.25);
    --pf-err-bg: #2a0a0a;
    --pf-err-border: #7f1d1d;
    --pf-err-text: #f87171;
    --pf-tb-bg: rgba(15,15,15,0.92);
    --pf-btn-next-hover: #dedede;
    --pf-cover-gradient: linear-gradient(135deg, #222 0%, #1a1a1a 100%);
  }

  .pf-root *, .pf-root *::before, .pf-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* TOP BAR */
  .pf-tb {
    position: sticky; top: 0; z-index: 50;
    height: 60px;
    display: flex; align-items: center; gap: 16px;
    padding: 0 20px;
    background: var(--pf-tb-bg);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--pf-border);
  }
  .pf-tb-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
  .pf-tb-back {
    width: 34px; height: 34px; border-radius: 10px;
    border: 1px solid var(--pf-border);
    background: var(--pf-surface);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--pf-text-muted);
    flex-shrink: 0;
    transition: border-color 0.15s, color 0.15s;
  }
  .pf-tb-back:hover { border-color: var(--pf-border-strong); color: var(--pf-text-primary); }
  .pf-tb-title { font-size: 14px; font-weight: 600; color: var(--pf-text-primary); }
  .pf-tb-badge {
    font-size: 10px; font-weight: 600;
    padding: 2px 8px; border-radius: 999px;
    background: var(--pf-surface); border: 1px solid var(--pf-border);
    color: var(--pf-text-muted); letter-spacing: 0.02em;
  }
  .pf-tb-steps { display: flex; align-items: center; gap: 2px; }
  .pf-tb-step-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 0 11px; height: 34px; border-radius: 9px;
    border: 1px solid transparent; background: transparent;
    font-size: 12px; font-weight: 500; cursor: pointer;
    color: var(--pf-text-muted);
    font-family: inherit;
    transition: all 0.15s; white-space: nowrap;
  }
  .pf-tb-step-btn.is-active {
    background: var(--pf-surface);
    border-color: var(--pf-border);
    color: var(--pf-text-primary);
  }
  .pf-tb-step-btn.is-done { color: var(--pf-text-secondary); }
  .pf-tb-step-num {
    width: 18px; height: 18px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 700;
    background: var(--pf-surface-secondary); border: 1px solid var(--pf-border);
    color: var(--pf-text-muted); flex-shrink: 0;
    transition: all 0.15s;
  }
  .pf-tb-step-num.is-active { background: var(--pf-accent); border-color: var(--pf-accent); color: #fff; }
  .pf-tb-step-num.is-done { background: var(--pf-success-light); border-color: var(--pf-success-border); color: var(--pf-success); }
  .pf-tb-sep { color: var(--pf-border-strong); font-size: 11px; padding: 0 2px; }

  .pf-btn-publish {
    display: flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 18px; border-radius: 999px;
    background: var(--pf-accent); color: #fff; border: none;
    font-size: 13px; font-weight: 600; cursor: pointer;
    font-family: inherit;
    transition: background 0.15s, transform 0.1s;
    white-space: nowrap; flex-shrink: 0;
  }
  .pf-btn-publish:hover { background: var(--pf-accent-hover); }
  .pf-btn-publish:active { transform: scale(0.97); }
  .pf-btn-publish:disabled { background: var(--pf-border-strong); cursor: not-allowed; }

  .pf-btn-next {
    display: flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 18px; border-radius: 999px;
    background: var(--pf-text-primary); color: var(--pf-bg); border: none;
    font-size: 13px; font-weight: 600; cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    white-space: nowrap; flex-shrink: 0;
  }
  .pf-btn-next:hover { background: var(--pf-btn-next-hover); }
  .pf-btn-next:active { transform: scale(0.97); }

  /* ERROR BAR */
  .pf-err {
    display: flex; align-items: center; gap: 10px;
    margin: 14px 20px 0;
    padding: 11px 14px; border-radius: 12px;
    background: var(--pf-err-bg); border: 1px solid var(--pf-err-border);
    color: var(--pf-err-text); font-size: 13px;
  }
  .pf-err-close { margin-left: auto; border: none; background: none; color: var(--pf-err-text); cursor: pointer; display: flex; align-items: center; }

  /* LAYOUT */
  .pf-layout {
    display: grid;
    grid-template-columns: 1fr 288px 232px;
    gap: 18px;
    padding: 20px;
    max-width: 1340px;
    margin: 0 auto;
    align-items: start;
  }

  /* FORM CARD */
  .pf-fc {
    background: var(--pf-surface);
    border: 1px solid var(--pf-border);
    border-radius: 16px;
    overflow: hidden;
  }
  .pf-fc-body { padding: 28px 32px; }
  .pf-fc-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 28px;
    border-top: 1px solid var(--pf-border);
  }
  .pf-back-btn {
    display: flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 14px; border-radius: 999px;
    border: 1px solid var(--pf-border); background: transparent;
    font-size: 12px; font-weight: 500; color: var(--pf-text-muted);
    cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .pf-back-btn:hover:not(:disabled) { border-color: var(--pf-border-strong); color: var(--pf-text-secondary); }
  .pf-back-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* DOTS */
  .pf-dots { display: flex; align-items: center; gap: 5px; }
  .pf-dot {
    height: 5px; border-radius: 3px; cursor: pointer;
    transition: all 0.3s cubic-bezier(.16,1,.3,1);
  }
  .pf-dot.is-active { width: 22px; background: var(--pf-accent); }
  .pf-dot.is-done { width: 5px; background: var(--pf-success); opacity: 0.5; }
  .pf-dot.is-future { width: 5px; background: var(--pf-border-strong); }

  /* SECTION */
  .pf-sec-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
  .pf-sec-title { font-size: 13px; font-weight: 600; color: var(--pf-text-primary); }
  .pf-sec-desc { font-size: 11.5px; color: var(--pf-text-muted); margin-top: 2px; }
  .pf-divider { border: none; border-top: 1px solid var(--pf-border); margin: 26px 0; }

  /* FORM CONTROLS */
  .pf-field { margin-bottom: 14px; }
  .pf-field:last-child { margin-bottom: 0; }
  .pf-lbl {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 6px;
    font-size: 11.5px; font-weight: 500; color: var(--pf-text-muted);
  }
  .pf-req { color: var(--pf-accent); margin-left: 2px; }
  .pf-cc { font-size: 10px; font-family: monospace; }
  .pf-cc-ok { color: var(--pf-text-muted); }
  .pf-cc-warn { color: #f59e0b; }
  .pf-cc-over { color: #ef4444; }

  .pf-inp, .pf-sel, .pf-ta {
    width: 100%; border: 1px solid var(--pf-border);
    border-radius: 10px; padding: 0 12px; height: 40px;
    font-size: 13px; color: var(--pf-text-primary);
    background: var(--pf-surface); outline: none;
    font-family: inherit;
    transition: border-color 0.15s, outline-color 0.15s;
    -moz-appearance: textfield;
    appearance: none;
  }
  .pf-inp:focus, .pf-sel:focus, .pf-ta:focus {
    border-color: var(--pf-accent);
    outline: 3px solid color-mix(in srgb, var(--pf-accent) 20%, transparent);
    outline-offset: 0px;
  }
  .pf-inp::placeholder, .pf-ta::placeholder { color: var(--pf-text-muted); opacity: 1; }
  .pf-inp:disabled { opacity: 0.4; cursor: not-allowed; background: var(--pf-surface-secondary); }
  .pf-ta { height: auto; padding: 10px 12px; resize: vertical; line-height: 1.6; }

  .pf-sel-wrap { position: relative; }
  .pf-sel-wrap .pf-sel { padding-right: 32px; }
  .pf-sel-arrow { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--pf-text-muted); }

  /* INPUT GROUP */
  .pf-ig { display: flex; }
  .pf-ig-pre {
    display: flex; align-items: center; padding: 0 12px;
    border: 1px solid var(--pf-border); border-right: none;
    border-radius: 10px 0 0 10px;
    background: var(--pf-surface-secondary);
    font-size: 11px; font-family: monospace; color: var(--pf-text-muted);
    white-space: nowrap; flex-shrink: 0;
  }
  .pf-ig .pf-inp { border-radius: 0 10px 10px 0; }

  /* TOGGLE */
  .pf-tog {
    position: relative; width: 34px; height: 18px;
    border-radius: 9px; border: none; cursor: pointer;
    transition: background 0.2s; flex-shrink: 0;
  }
  .pf-tog-k {
    position: absolute; top: 2px; width: 14px; height: 14px;
    border-radius: 50%; background: #fff;
    transition: transform 0.2s cubic-bezier(.16,1,.3,1);
  }

  /* TAG INPUT */
  .pf-tag-wrap {
    display: flex; flex-wrap: wrap; gap: 5px; min-height: 40px;
    padding: 5px 8px; border-radius: 10px;
    border: 1px solid var(--pf-border); background: var(--pf-surface);
    transition: border-color 0.15s;
    cursor: text;
  }
  .pf-tag-wrap:focus-within { border-color: var(--pf-accent); outline: 3px solid color-mix(in srgb, var(--pf-accent) 20%, transparent); }
  .pf-tag {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 999px;
    font-size: 11px; font-weight: 500;
    background: var(--pf-accent-light); border: 1px solid rgba(253,80,0,0.18);
    color: var(--pf-accent);
  }
  .pf-tag-x { cursor: pointer; background: none; border: none; color: rgba(253,80,0,0.5); display: flex; align-items: center; padding: 0; }
  .pf-tag-x:hover { color: var(--pf-accent); }
  .pf-tag-inp { flex: 1; min-width: 60px; border: none; outline: none; font-size: 12px; color: var(--pf-text-primary); background: transparent; height: 26px; font-family: inherit; }
  .pf-tag-inp::placeholder { color: var(--pf-text-muted); }

  /* OPTION CARDS */
  .pf-opt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .pf-opt-card {
    display: flex; flex-direction: column; gap: 3px;
    padding: 13px; border-radius: 12px;
    border: 1.5px solid var(--pf-border);
    background: var(--pf-surface-secondary);
    cursor: pointer; text-align: left;
    transition: all 0.15s;
  }
  .pf-opt-card:hover:not(.is-sel) { border-color: var(--pf-border-strong); background: var(--pf-surface); }
  .pf-opt-card.is-sel { border-color: var(--pf-accent); background: var(--pf-accent-light); }
  .pf-opt-top { display: flex; align-items: center; justify-content: space-between; }
  .pf-opt-label { font-size: 13px; font-weight: 600; color: var(--pf-text-primary); }
  .pf-opt-hint { font-size: 11px; color: var(--pf-text-muted); }
  .pf-opt-check { color: var(--pf-accent); }

  /* PILLS */
  .pf-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .pf-pill {
    padding: 0 13px; height: 31px; border-radius: 999px;
    font-size: 12px; font-weight: 500; cursor: pointer;
    border: 1px solid var(--pf-border);
    background: var(--pf-surface-secondary); color: var(--pf-text-secondary);
    font-family: inherit; transition: all 0.15s;
  }
  .pf-pill:hover:not(.is-active) { border-color: var(--pf-border-strong); }
  .pf-pill.is-active { background: var(--pf-accent); color: #fff; border-color: var(--pf-accent); }

  /* BILLING TYPE */
  .pf-bill-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
  .pf-bill-btn {
    height: 38px; border-radius: 10px;
    font-size: 12px; font-weight: 500; cursor: pointer;
    border: 1.5px solid var(--pf-border);
    background: var(--pf-surface-secondary); color: var(--pf-text-secondary);
    font-family: inherit; transition: all 0.15s;
  }
  .pf-bill-btn.is-active { border-color: var(--pf-accent); background: var(--pf-accent-light); color: var(--pf-accent); }

  /* AI ASSIST BTN */
  .pf-ai-btn {
    display: flex; align-items: center; gap: 5px;
    padding: 0 11px; height: 30px; border-radius: 999px;
    border: 1px solid var(--pf-border);
    background: var(--pf-surface); color: var(--pf-text-secondary);
    font-size: 11.5px; font-weight: 500; cursor: pointer;
    font-family: inherit; transition: all 0.15s;
    white-space: nowrap; flex-shrink: 0;
  }
  .pf-ai-btn:hover { border-color: var(--pf-accent); color: var(--pf-accent); background: var(--pf-accent-light); }

  /* MEDIA UPLOAD */
  .pf-media-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-start; }
  .pf-upload-cover {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 7px; width: 148px; height: 106px;
    border-radius: 12px; border: 2px dashed var(--pf-border);
    background: var(--pf-surface-secondary); cursor: pointer;
    transition: all 0.15s;
  }
  .pf-upload-cover:hover { border-color: var(--pf-accent); background: var(--pf-accent-light); }
  .pf-upload-cover-label { font-size: 11px; font-weight: 500; color: var(--pf-text-muted); text-align: center; }
  .pf-upload-cover-hint { font-size: 10px; color: var(--pf-text-muted); opacity: 0.6; text-align: center; line-height: 1.4; }
  .pf-upload-sm {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 3px; width: 72px; height: 54px;
    border-radius: 10px; border: 1.5px dashed var(--pf-border);
    background: var(--pf-surface-secondary); cursor: pointer; font-size: 11px;
    color: var(--pf-text-muted); transition: all 0.15s;
  }
  .pf-upload-sm:hover { border-color: var(--pf-accent); color: var(--pf-accent); }

  /* GRID HELPERS */
  .pf-g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .pf-span2 { grid-column: span 2; }

  /* PREVIEW CARD */
  .pf-prev {
    background: var(--pf-surface); border: 1px solid var(--pf-border);
    border-radius: 16px; overflow: hidden;
    position: sticky; top: 76px;
  }
  .pf-prev-hd {
    display: flex; align-items: center; justify-content: space-between;
    padding: 11px 15px; border-bottom: 1px solid var(--pf-border);
  }
  .pf-prev-lbl { font-size: 11px; font-weight: 600; color: var(--pf-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .pf-prev-badge {
    font-size: 10px; font-weight: 500; padding: 2px 8px;
    border-radius: 999px; background: var(--pf-surface-secondary);
    border: 1px solid var(--pf-border); color: var(--pf-text-muted);
  }
  .pf-prev-bd { padding: 14px; }
  .pf-prev-cover {
    width: 100%; aspect-ratio: 16/9; border-radius: 10px;
    border: 1px solid var(--pf-border);
    background: var(--pf-cover-gradient);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 12px;
    position: relative; overflow: hidden;
  }
  .pf-prev-cover-inner { text-align: center; color: var(--pf-text-muted); opacity: 0.4; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .pf-prev-stats { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
  .pf-av-stack { display: flex; }
  .pf-av { width: 17px; height: 17px; border-radius: 50%; border: 2px solid var(--pf-surface); margin-right: -4px; }
  .pf-prev-stat-txt { font-size: 11px; color: var(--pf-text-muted); }
  .pf-prev-rating { font-size: 11px; color: var(--pf-text-muted); margin-left: auto; }
  .pf-prev-name { font-size: 14px; font-weight: 700; color: var(--pf-text-primary); line-height: 1.3; margin-bottom: 4px; letter-spacing: -0.02em; }
  .pf-prev-name.empty { color: var(--pf-border-strong); font-weight: 400; font-style: italic; }
  .pf-prev-headline { font-size: 11.5px; color: var(--pf-text-muted); margin-bottom: 10px; line-height: 1.5; }
  .pf-prev-price { font-size: 22px; font-weight: 700; color: var(--pf-text-primary); margin-bottom: 10px; letter-spacing: -0.03em; }
  .pf-prev-period { font-size: 12px; color: var(--pf-text-muted); font-weight: 400; }
  .pf-prev-cta {
    width: 100%; padding: 9px; border-radius: 10px;
    background: var(--pf-accent); color: #fff; border: none;
    font-size: 13px; font-weight: 600; cursor: default;
    font-family: inherit;
  }
  .pf-prev-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px; }
  .pf-prev-tag {
    font-size: 10px; padding: 2px 8px; border-radius: 999px;
    background: var(--pf-accent-light); border: 1px solid rgba(253,80,0,0.15);
    color: var(--pf-accent);
  }
  .pf-prev-divider { border: none; border-top: 1px solid var(--pf-border); margin: 12px 0; }
  .pf-prev-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; }
  .pf-prev-row-k { color: var(--pf-text-muted); }
  .pf-prev-row-v { font-weight: 500; color: var(--pf-text-secondary); }

  /* RIGHT SIDEBAR */
  .pf-sb { position: sticky; top: 76px; display: flex; flex-direction: column; gap: 12px; }
  .pf-panel {
    background: var(--pf-surface); border: 1px solid var(--pf-border);
    border-radius: 14px; overflow: hidden;
  }
  .pf-panel-hd { padding: 11px 15px; border-bottom: 1px solid var(--pf-border); }
  .pf-panel-title { font-size: 12px; font-weight: 600; color: var(--pf-text-primary); }
  .pf-panel-bd { padding: 12px 14px; }

  .pf-save-hint {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 10px; border-radius: 8px;
    background: var(--pf-surface-secondary); border: 1px solid var(--pf-border);
    font-size: 11px; color: var(--pf-text-muted); margin-top: 8px;
  }
  .pf-dot-amber { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; flex-shrink: 0; }

  .pf-tog-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 0; font-size: 12px; color: var(--pf-text-primary);
  }
  .pf-tog-row + .pf-tog-row { border-top: 1px solid var(--pf-border); }

  .pf-sub-list { padding: 5px; }
  .pf-sub-item {
    display: flex; align-items: center; gap: 9px;
    padding: 7px 9px; border-radius: 9px; cursor: pointer;
    border: 1px solid transparent; transition: all 0.12s;
    width: 100%; text-align: left; background: transparent;
    font-family: inherit;
  }
  .pf-sub-item:hover:not(.is-sel) { background: var(--pf-surface-secondary); }
  .pf-sub-item.is-sel { background: var(--pf-accent-light); border-color: rgba(253,80,0,0.18); }
  .pf-sub-icon {
    width: 26px; height: 26px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    background: var(--pf-surface-secondary);
    border: 1px solid var(--pf-border); flex-shrink: 0;
    transition: all 0.12s; color: var(--pf-text-muted);
  }
  .pf-sub-item.is-sel .pf-sub-icon { background: var(--pf-accent-light); border-color: rgba(253,80,0,0.25); color: var(--pf-accent); }
  .pf-sub-name { font-size: 12px; font-weight: 500; color: var(--pf-text-muted); flex: 1; transition: color 0.12s; }
  .pf-sub-item.is-sel .pf-sub-name { color: var(--pf-accent); }
  .pf-sub-check { color: var(--pf-accent); }

  .pf-adv-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 15px; font-size: 12px; color: var(--pf-text-primary);
    cursor: pointer; border: none; background: transparent;
    width: 100%; text-align: left; transition: background 0.1s;
    font-family: inherit;
  }
  .pf-adv-item:hover { background: var(--pf-surface-secondary); }
  .pf-adv-item + .pf-adv-item { border-top: 1px solid var(--pf-border); }
  .pf-adv-icon { color: var(--pf-text-muted); flex-shrink: 0; }
  .pf-adv-arr { margin-left: auto; color: var(--pf-border-strong); }

  /* CHECKLIST */
  .pf-chk-list { display: flex; flex-direction: column; gap: 7px; }
  .pf-chk-item {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 13px; border-radius: 10px; font-size: 12.5px;
  }
  .pf-chk-item.done { background: var(--pf-success-light); border: 1px solid var(--pf-success-border); color: var(--pf-success); }
  .pf-chk-item.todo { background: var(--pf-surface-secondary); border: 1px solid var(--pf-border); color: var(--pf-text-muted); }
  .pf-chk-icon { flex-shrink: 0; }
  .pf-chk-req {
    margin-left: auto; font-size: 10px; font-weight: 600;
    padding: 2px 8px; border-radius: 999px;
    background: var(--pf-accent-light); color: var(--pf-accent);
    border: 1px solid rgba(253,80,0,0.2);
  }

  /* SUMMARY TABLE */
  .pf-sum-tbl { border: 1px solid var(--pf-border); border-radius: 12px; overflow: hidden; }
  .pf-sum-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 15px; font-size: 12.5px; }
  .pf-sum-row + .pf-sum-row { border-top: 1px solid var(--pf-border); }
  .pf-sum-k { color: var(--pf-text-muted); }
  .pf-sum-v { font-weight: 600; color: var(--pf-text-primary); }

  /* BIG PUBLISH BTN */
  .pf-pub-big {
    width: 100%; height: 44px; border-radius: 12px;
    background: var(--pf-accent); color: #fff; border: none;
    font-size: 14px; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-family: inherit; margin-top: 10px;
    transition: background 0.15s, transform 0.1s;
    letter-spacing: -0.01em;
  }
  .pf-pub-big:hover:not(:disabled) { background: var(--pf-accent-hover); }
  .pf-pub-big:active:not(:disabled) { transform: scale(0.98); }
  .pf-pub-big:disabled { background: var(--pf-border-strong); cursor: not-allowed; }
  .pf-pub-note { font-size: 11px; color: var(--pf-text-muted); text-align: center; margin-top: 8px; }

  /* INFO BOX */
  .pf-info-box {
    font-size: 12px; padding: 10px 12px; border-radius: 10px;
    background: var(--pf-accent-light); border: 1px solid rgba(253,80,0,0.2);
    color: var(--pf-accent); line-height: 1.5;
  }

  /* SUCCESS */
  .pf-success {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 16px;
    background: var(--pf-bg);
  }
  .pf-success-icon {
    width: 60px; height: 60px; border-radius: 18px;
    background: var(--pf-success-light); border: 1px solid var(--pf-success-border);
    display: flex; align-items: center; justify-content: center;
    color: var(--pf-success);
  }
  .pf-success-title { font-size: 17px; font-weight: 700; color: var(--pf-text-primary); letter-spacing: -0.02em; }
  .pf-success-sub { font-size: 13px; color: var(--pf-text-muted); }

  /* FULFILLMENT CARDS */
  .pf-ful-card {
    display: flex; align-items: center; gap: 12px;
    padding: 12px; border-radius: 12px; cursor: pointer;
    border: 1.5px solid var(--pf-border);
    background: var(--pf-surface-secondary);
    transition: all 0.15s;
  }
  .pf-ful-card:hover:not(.is-sel) { border-color: var(--pf-border-strong); }
  .pf-ful-card.is-sel { border-color: var(--pf-accent); background: var(--pf-accent-light); }
  .pf-ful-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    background: var(--pf-surface);
    border: 1px solid var(--pf-border); flex-shrink: 0;
    color: var(--pf-text-muted);
    transition: all 0.15s;
  }
  .pf-ful-card.is-sel .pf-ful-icon { background: var(--pf-accent); border-color: var(--pf-accent); color: #fff; }
  .pf-ful-label { font-size: 13px; font-weight: 600; color: var(--pf-text-primary); }
  .pf-ful-hint { font-size: 11px; color: var(--pf-text-muted); margin-top: 2px; }

  /* INVENTORY CARD */
  .pf-inv-card {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px; border-radius: 10px;
    background: var(--pf-surface-secondary); border: 1px solid var(--pf-border);
  }
  .pf-inv-label { font-size: 12.5px; font-weight: 500; color: var(--pf-text-primary); }
  .pf-inv-hint { font-size: 11px; color: var(--pf-text-muted); margin-top: 2px; }

  /* VISIBILITY CARD */
  .pf-vis-card {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px; border-radius: 12px;
    border: 1px solid var(--pf-border);
    background: var(--pf-surface-secondary);
  }

  /* FILE ATTACHED */
  .pf-file-attached {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 12px; border-radius: 10px;
    background: var(--pf-success-light); border: 1px solid var(--pf-success-border);
    margin-bottom: 8px;
  }
  .pf-file-name { font-size: 12px; font-family: monospace; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pf-text-primary); }
  .pf-file-rm { border: none; background: none; color: var(--pf-err-text); cursor: pointer; display: flex; align-items: center; padding: 0; }
`;

/* ─── SUB-COMPONENTS ────────────────────────────── */

function Toggle({
    checked,
    onChange,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <button
            type="button"
            className="pf-tog"
            onClick={() => onChange(!checked)}
            style={{
                background: checked
                    ? "var(--pf-accent)"
                    : "var(--pf-border-strong)",
            }}
        >
            <span
                className="pf-tog-k"
                style={{ transform: checked ? "translateX(17px)" : "translateX(2px)" }}
            />
        </button>
    );
}

function CharCount({ val, max }: { val: string; max: number }) {
    const n = (val || "").length;
    const cls =
        n >= max
            ? "pf-cc pf-cc-over"
            : n >= max * 0.85
                ? "pf-cc pf-cc-warn"
                : "pf-cc pf-cc-ok";
    return (
        <span className={cls}>
            {n}/{max}
        </span>
    );
}

function TagInput({
    value,
    onChange,
}: {
    value: string;
    onChange: (v: string) => void;
}) {
    const [inp, setInp] = useState("");
    const tags = value
        ? value
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

    const add = (t: string) => {
        const tr = t.trim();
        if (!tr || tags.includes(tr)) return;
        onChange([...tags, tr].join(", "));
        setInp("");
    };
    const rm = (i: number) =>
        onChange(tags.filter((_, idx) => idx !== i).join(", "));

    return (
        <div className="pf-tag-wrap">
            {tags.map((t, i) => (
                <span key={t} className="pf-tag">
                    {t}
                    <button className="pf-tag-x" onClick={() => rm(i)}>
                        <X size={10} />
                    </button>
                </span>
            ))}
            <input
                className="pf-tag-inp"
                value={inp}
                placeholder={tags.length === 0 ? "Add a tag…" : ""}
                onChange={(e) => setInp(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        add(inp);
                    }
                    if (e.key === "Backspace" && !inp && tags.length) rm(tags.length - 1);
                }}
                onBlur={() => {
                    if (inp) add(inp);
                }}
            />
        </div>
    );
}

function LivePreview({ form }: { form: FormState }) {
    const price = parseFloat(form.price) || 0;
    const isFree = price === 0;
    const tags = form.tags
        ? form.tags
            .split(",")
            .slice(0, 4)
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

    return (
        <div className="pf-prev">
            <div className="pf-prev-hd">
                <span className="pf-prev-lbl">Preview</span>
                <span className="pf-prev-badge">Buyer view</span>
            </div>
            <div className="pf-prev-bd">
                <div className="pf-prev-cover">
                    <div className="pf-prev-cover-inner">
                        <ImageIcon size={28} />
                        <div style={{ fontSize: 11 }}>Cover image</div>
                    </div>
                </div>
                <div className="pf-prev-stats">
                    <div className="pf-av-stack">
                        {["#ffb3a7", "#ffd6b8", "#c4c4ff"].map((c, i) => (
                            <div key={i} className="pf-av" style={{ background: c }} />
                        ))}
                    </div>
                    <span className="pf-prev-stat-txt">2.8k+ students</span>
                    <span className="pf-prev-rating">★ 4.9</span>
                </div>
                <p className={`pf-prev-name${form.name ? "" : " empty"}`}>
                    {form.name || "Your product name"}
                </p>
                {form.short_description && (
                    <p className="pf-prev-headline">{form.short_description}</p>
                )}
                <p className="pf-prev-price">
                    {isFree ? "Free" : `$${price.toFixed(2)}`}
                    {!isFree && form.pricing_type === "recurring" && (
                        <span className="pf-prev-period"> / {form.billing_period}</span>
                    )}
                </p>
                <button className="pf-prev-cta">{form.button_text || "Join now"}</button>
                {tags.length > 0 && (
                    <div className="pf-prev-tags">
                        {tags.map((t, i) => (
                            <span key={i} className="pf-prev-tag">
                                {t}
                            </span>
                        ))}
                    </div>
                )}
                {form.name && (
                    <>
                        <div className="pf-prev-divider" />
                        <div className="pf-prev-row">
                            <span className="pf-prev-row-k">Type</span>
                            <span className="pf-prev-row-v">{form.product_type}</span>
                        </div>
                        <div className="pf-prev-row">
                            <span className="pf-prev-row-k">Status</span>
                            <span className="pf-prev-row-v">{form.status}</span>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function RightSidebar({
    form,
    handleChange,
}: {
    form: FormState;
    handleChange: (field: string, value: unknown) => void;
}) {
    const advItems = [
        { label: "Drip content", Icon: Clock },
        { label: "Access rules", Icon: Lock },
        { label: "Localization", Icon: Globe },
        { label: "SEO settings", Icon: Search },
    ];

    return (
        <div className="pf-sb">
            <div className="pf-panel">
                <div className="pf-panel-hd">
                    <p className="pf-panel-title">Status</p>
                </div>
                <div className="pf-panel-bd">
                    <div className="pf-sel-wrap">
                        <select
                            className="pf-sel"
                            value={form.status}
                            onChange={(e) => handleChange("status", e.target.value)}
                            style={{ marginBottom: 0 }}
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.label}
                                </option>
                            ))}
                        </select>
                        <span className="pf-sel-arrow">
                            <ChevronDown size={14} />
                        </span>
                    </div>
                    <div className="pf-save-hint">
                        <div className="pf-dot-amber" />
                        Unsaved changes
                    </div>
                </div>
            </div>

            <div className="pf-panel">
                <div className="pf-panel-hd">
                    <p className="pf-panel-title">Sales page</p>
                </div>
                <div className="pf-panel-bd" style={{ paddingTop: 4, paddingBottom: 4 }}>
                    {[
                        { key: "custom_domain", label: "Custom domain" },
                        { key: "show_author", label: "Show author bio" },
                        { key: "show_reviews", label: "Show reviews" },
                        { key: "enable_discussions", label: "Discussions" },
                    ].map((item) => (
                        <div key={item.key} className="pf-tog-row">
                            <span>{item.label}</span>
                            <Toggle
                                checked={!!form[item.key as keyof FormState]}
                                onChange={(v) => handleChange(item.key, v)}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="pf-panel">
                <div className="pf-panel-hd">
                    <p className="pf-panel-title">Product type</p>
                </div>
                <div className="pf-sub-list">
                    {PRODUCT_SUBTYPES.map((type) => {
                        const sel = form.product_subtype === type.id;
                        return (
                            <button
                                key={type.id}
                                className={`pf-sub-item${sel ? " is-sel" : ""}`}
                                onClick={() => handleChange("product_subtype", type.id)}
                            >
                                <div className="pf-sub-icon">
                                    <type.Icon size={13} />
                                </div>
                                <span className="pf-sub-name">{type.label}</span>
                                {sel && (
                                    <span className="pf-sub-check">
                                        <Check size={12} />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="pf-panel">
                <div className="pf-panel-hd">
                    <p className="pf-panel-title">Advanced</p>
                </div>
                {advItems.map((item) => (
                    <button key={item.label} className="pf-adv-item">
                        <span className="pf-adv-icon">
                            <item.Icon size={13} />
                        </span>
                        <span>{item.label}</span>
                        <span className="pf-adv-arr">
                            <ChevronRight size={16} />
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ─── STEP 1 ─────────────────────────────────── */
function StepDetails({
    form,
    handleChange,
}: {
    form: FormState;
    handleChange: (field: string, value: unknown) => void;
}) {
    const cats = CATEGORIES.filter((c) =>
        form.product_type === "digital"
            ? c.type !== "physical"
            : c.type !== "digital"
    );

    return (
        <div>
            <div className="pf-sec-header">
                <div>
                    <p className="pf-sec-title">Basic information</p>
                    <p className="pf-sec-desc">Tell buyers what your product is about</p>
                </div>
                <button className="pf-ai-btn">
                    <Sparkles size={12} />
                    AI Assist
                </button>
            </div>

            <div className="pf-field">
                <div className="pf-lbl">
                    <span>
                        Product name<span className="pf-req">*</span>
                    </span>
                    <CharCount val={form.name} max={80} />
                </div>
                <input
                    className="pf-inp"
                    type="text"
                    value={form.name}
                    maxLength={80}
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g. How to Build a Viral App: 0 to $100k/mo"
                />
            </div>

            <div className="pf-field">
                <div className="pf-lbl">
                    <span>
                        Headline<span className="pf-req">*</span>
                    </span>
                    <CharCount val={form.short_description} max={80} />
                </div>
                <input
                    className="pf-inp"
                    type="text"
                    value={form.short_description}
                    maxLength={80}
                    onChange={(e) => handleChange("short_description", e.target.value)}
                    placeholder="e.g. Step-by-step blueprint to build, launch & monetize your app"
                />
            </div>

            <div className="pf-field">
                <div className="pf-lbl">
                    <span>
                        Short description<span className="pf-req">*</span>
                    </span>
                    <CharCount val={form.description || ""} max={200} />
                </div>
                <textarea
                    className="pf-ta"
                    rows={4}
                    value={form.description || ""}
                    maxLength={200}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="A complete guide to validate, build and launch your app…"
                />
            </div>

            <div className="pf-field">
                <div className="pf-lbl">
                    <span>
                        Category<span className="pf-req">*</span>
                    </span>
                </div>
                <div className="pf-sel-wrap">
                    <select
                        className="pf-sel"
                        value={form.category_id}
                        onChange={(e) => handleChange("category_id", e.target.value)}
                    >
                        <option value="">Select a category…</option>
                        {cats.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <span className="pf-sel-arrow">
                        <ChevronDown size={14} />
                    </span>
                </div>
            </div>

            <div className="pf-field">
                <div className="pf-lbl">
                    <span>Tags</span>
                </div>
                <TagInput value={form.tags} onChange={(v) => handleChange("tags", v)} />
                <p
                    style={{
                        fontSize: 10.5,
                        color: "var(--pf-text-muted)",
                        marginTop: 5,
                    }}
                >
                    Press Enter or comma to add a tag
                </p>
            </div>

            <hr className="pf-divider" />

            <div className="pf-sec-header">
                <div>
                    <p className="pf-sec-title">Media</p>
                    <p className="pf-sec-desc">Upload images and a preview video</p>
                </div>
            </div>
            <div className="pf-media-row">
                <div className="pf-upload-cover">
                    <Upload size={22} color="var(--pf-text-muted)" />
                    <span className="pf-upload-cover-label">Upload cover</span>
                    <span className="pf-upload-cover-hint">
                        PNG, JPG or WEBP
                        <br />
                        Recommended 1280×720
                    </span>
                </div>
                <div
                    style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 7,
                        alignItems: "flex-start",
                    }}
                >
                    <div className="pf-upload-sm">
                        <ImageIcon size={18} />
                        <span>Gallery</span>
                    </div>
                    <div className="pf-upload-sm">
                        <Play size={18} />
                        <span>Teaser</span>
                    </div>
                </div>
            </div>

            <hr className="pf-divider" />

            <div className="pf-sec-header">
                <div>
                    <p className="pf-sec-title">Product URL</p>
                    <p className="pf-sec-desc">Customize your product's permalink</p>
                </div>
            </div>
            <div className="pf-ig">
                <span className="pf-ig-pre">/product/</span>
                <input
                    className="pf-inp"
                    type="text"
                    value={form.slug}
                    onChange={(e) => handleChange("slug", e.target.value)}
                    placeholder="my-product-name"
                    style={{ fontFamily: "monospace", fontSize: 12 }}
                />
            </div>
        </div>
    );
}

/* ─── STEP 2 ─────────────────────────────────── */
function StepPricing({
    form,
    handleChange,
}: {
    form: FormState;
    handleChange: (field: string, value: unknown) => void;
}) {
    const isFree = parseFloat(form.price) === 0;

    return (
        <div>
            <div className="pf-sec-header">
                <div>
                    <p className="pf-sec-title">Pricing model</p>
                    <p className="pf-sec-desc">Set how customers will pay for your product</p>
                </div>
            </div>

            <div className="pf-opt-grid" style={{ marginBottom: 20 }}>
                {[
                    { id: "free", label: "Free", hint: "No charge to access" },
                    { id: "paid", label: "Paid", hint: "Charge customers" },
                ].map((opt) => {
                    const sel = opt.id === "free" ? isFree : !isFree;
                    return (
                        <div
                            key={opt.id}
                            className={`pf-opt-card${sel ? " is-sel" : ""}`}
                            onClick={() =>
                                handleChange("price", opt.id === "free" ? "0" : "9.99")
                            }
                        >
                            <div className="pf-opt-top">
                                <span className="pf-opt-label">{opt.label}</span>
                                {sel && (
                                    <span className="pf-opt-check">
                                        <Check size={15} />
                                    </span>
                                )}
                            </div>
                            <span className="pf-opt-hint">{opt.hint}</span>
                        </div>
                    );
                })}
            </div>

            {!isFree && (
                <div>
                    <div className="pf-g3" style={{ marginBottom: 20 }}>
                        <div>
                            <div className="pf-lbl">
                                <span>Currency</span>
                            </div>
                            <div className="pf-sel-wrap">
                                <select
                                    className="pf-sel"
                                    value={form.currency}
                                    onChange={(e) => handleChange("currency", e.target.value)}
                                >
                                    <option value="USD">USD – $</option>
                                    <option value="EUR">EUR – €</option>
                                    <option value="GBP">GBP – £</option>
                                </select>
                                <span className="pf-sel-arrow">
                                    <ChevronDown size={14} />
                                </span>
                            </div>
                        </div>
                        <div className="pf-span2">
                            <div className="pf-lbl">
                                <span>Price</span>
                            </div>
                            <input
                                className="pf-inp"
                                type="number"
                                value={form.price}
                                min={0}
                                step="0.01"
                                onChange={(e) => handleChange("price", e.target.value)}
                                style={{
                                    fontWeight: 700,
                                    fontSize: 18,
                                    letterSpacing: "-0.02em",
                                }}
                            />
                        </div>
                    </div>

                    <hr className="pf-divider" style={{ margin: "18px 0" }} />

                    <div className="pf-field">
                        <p
                            style={{
                                fontSize: 10.5,
                                fontWeight: 700,
                                color: "var(--pf-text-muted)",
                                letterSpacing: "0.08em",
                                marginBottom: 10,
                                textTransform: "uppercase",
                            }}
                        >
                            Billing type
                        </p>
                        <div className="pf-bill-grid">
                            {[
                                { id: "one_time", label: "One-time payment" },
                                { id: "recurring", label: "Recurring subscription" },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    className={`pf-bill-btn${form.pricing_type === opt.id ? " is-active" : ""
                                        }`}
                                    onClick={() => handleChange("pricing_type", opt.id)}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {form.pricing_type === "recurring" && (
                        <div className="pf-field">
                            <p
                                style={{
                                    fontSize: 10.5,
                                    fontWeight: 700,
                                    color: "var(--pf-text-muted)",
                                    letterSpacing: "0.08em",
                                    marginBottom: 10,
                                    textTransform: "uppercase",
                                }}
                            >
                                Billing period
                            </p>
                            <div className="pf-pills">
                                {BILLING_PERIODS.map((p) => (
                                    <button
                                        key={p.id}
                                        className={`pf-pill${form.billing_period === p.id ? " is-active" : ""
                                            }`}
                                        onClick={() => handleChange("billing_period", p.id)}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <hr className="pf-divider" />

            <div className="pf-sec-header">
                <div>
                    <p className="pf-sec-title">Affiliate program</p>
                    <p className="pf-sec-desc">Let others earn by promoting your product</p>
                </div>
            </div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: form.affiliate_enabled ? 16 : 0,
                }}
            >
                <span
                    style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--pf-text-primary)",
                    }}
                >
                    Enable affiliate program
                </span>
                <Toggle
                    checked={form.affiliate_enabled}
                    onChange={(v) => handleChange("affiliate_enabled", v)}
                />
            </div>
            {form.affiliate_enabled && (
                <div
                    style={{
                        paddingTop: 14,
                        borderTop: "1px solid var(--pf-border)",
                    }}
                >
                    <div className="pf-field">
                        <div className="pf-lbl">
                            <span>Commission rate</span>
                        </div>
                        <div style={{ position: "relative" }}>
                            <input
                                className="pf-inp"
                                type="number"
                                value={form.affiliate_commission_rate}
                                min="1"
                                max="100"
                                onChange={(e) =>
                                    handleChange("affiliate_commission_rate", e.target.value)
                                }
                                style={{ paddingRight: 36 }}
                            />
                            <span
                                style={{
                                    position: "absolute",
                                    right: 12,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: "var(--pf-text-muted)",
                                }}
                            >
                                %
                            </span>
                        </div>
                    </div>
                    <div className="pf-info-box">
                        Affiliates earn{" "}
                        <strong>{form.affiliate_commission_rate || 10}%</strong> per sale —
                        approx.{" "}
                        <strong>
                            $
                            {(
                                ((parseFloat(form.price) || 0) *
                                    (parseFloat(form.affiliate_commission_rate) || 10)) /
                                100
                            ).toFixed(2)}
                        </strong>{" "}
                        per conversion
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── STEP 3 ─────────────────────────────────── */
function StepSettings({
    form,
    handleChange,
}: {
    form: FormState;
    handleChange: (field: string, value: unknown) => void;
}) {
    return (
        <div>
            <div className="pf-sec-header">
                <div>
                    <p className="pf-sec-title">Call-to-action</p>
                    <p className="pf-sec-desc">The text shown on your buy button</p>
                </div>
            </div>
            <div className="pf-field">
                <div className="pf-lbl">
                    <span>Button label</span>
                </div>
                <input
                    className="pf-inp"
                    type="text"
                    value={form.button_text}
                    onChange={(e) => handleChange("button_text", e.target.value)}
                    placeholder="e.g. Join now"
                />
            </div>
            <div className="pf-pills">
                {BUTTON_TEXTS.map((txt) => (
                    <button
                        key={txt}
                        className={`pf-pill${form.button_text === txt ? " is-active" : ""}`}
                        onClick={() => handleChange("button_text", txt)}
                    >
                        {txt}
                    </button>
                ))}
            </div>

            <hr className="pf-divider" />

            <div className="pf-sec-header">
                <div>
                    <p className="pf-sec-title">Fulfillment</p>
                    <p className="pf-sec-desc">How is this product delivered to customers</p>
                </div>
            </div>
            <div className="pf-opt-grid" style={{ marginBottom: 16 }}>
                {[
                    {
                        id: "physical",
                        label: "Physical",
                        Icon: Package,
                        hint: "Ships to customer",
                    },
                    {
                        id: "digital",
                        label: "Digital",
                        Icon: Globe,
                        hint: "Instant access / download",
                    },
                ].map((type) => {
                    const sel = form.product_type === type.id;
                    return (
                        <div
                            key={type.id}
                            className={`pf-ful-card${sel ? " is-sel" : ""}`}
                            onClick={() => handleChange("product_type", type.id)}
                        >
                            <div className="pf-ful-icon">
                                <type.Icon size={17} />
                            </div>
                            <div>
                                <p className="pf-ful-label">{type.label}</p>
                                <p className="pf-ful-hint">{type.hint}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {form.product_type === "physical" && (
                <div>
                    <div className="pf-inv-card" style={{ marginBottom: 12 }}>
                        <div>
                            <p className="pf-inv-label">Track inventory</p>
                            <p className="pf-inv-hint">Auto-reduce stock on purchase</p>
                        </div>
                        <Toggle
                            checked={form.track_inventory}
                            onChange={(v) => handleChange("track_inventory", v)}
                        />
                    </div>
                    <div className="pf-g3">
                        <div>
                            <div className="pf-lbl">
                                <span>Stock qty</span>
                            </div>
                            <input
                                className="pf-inp"
                                type="number"
                                value={form.inventory_quantity}
                                disabled={!form.track_inventory}
                                onChange={(e) =>
                                    handleChange("inventory_quantity", e.target.value)
                                }
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <div className="pf-lbl">
                                <span>Weight (kg)</span>
                            </div>
                            <input
                                className="pf-inp"
                                type="number"
                                step="0.01"
                                value={form.weight}
                                onChange={(e) => handleChange("weight", e.target.value)}
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <div className="pf-lbl">
                                <span>Dimensions</span>
                            </div>
                            <input
                                className="pf-inp"
                                type="text"
                                value={form.dimensions}
                                onChange={(e) => handleChange("dimensions", e.target.value)}
                                placeholder="L×W×H"
                            />
                        </div>
                    </div>
                </div>
            )}

            {form.product_type === "digital" && (
                <div>
                    {form.digital_file_url ? (
                        <div className="pf-file-attached">
                            <Check size={16} color="var(--pf-success)" />
                            <span className="pf-file-name">{form.digital_file_url}</span>
                            <button
                                className="pf-file-rm"
                                onClick={() => handleChange("digital_file_url", "")}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : null}
                    <div className="pf-lbl">
                        <span>File URL or hosted link</span>
                    </div>
                    <div style={{ position: "relative" }}>
                        <input
                            className="pf-inp"
                            type="text"
                            placeholder="https://your-cdn.com/file.zip"
                            value={form.digital_file_url}
                            onChange={(e) => handleChange("digital_file_url", e.target.value)}
                            style={{ fontFamily: "monospace", fontSize: 12, paddingLeft: 36 }}
                        />
                        <span
                            style={{
                                position: "absolute",
                                left: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "var(--pf-text-muted)",
                            }}
                        >
                            <Link size={13} />
                        </span>
                    </div>
                </div>
            )}

            <hr className="pf-divider" />

            <div className="pf-sec-header">
                <div>
                    <p className="pf-sec-title">Visibility</p>
                    <p className="pf-sec-desc">
                        Control how this product appears in your store
                    </p>
                </div>
            </div>
            <div className="pf-vis-card">
                <div>
                    <p
                        style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--pf-text-primary)",
                        }}
                    >
                        Feature in store showcase
                    </p>
                    <p
                        style={{
                            fontSize: 11.5,
                            color: "var(--pf-text-muted)",
                            marginTop: 3,
                        }}
                    >
                        Pin this product to the top of your store
                    </p>
                </div>
                <Toggle
                    checked={form.is_featured}
                    onChange={(v) => handleChange("is_featured", v)}
                />
            </div>
        </div>
    );
}

/* ─── STEP 4 ─────────────────────────────────── */
function StepPublish({
    form,
    isPending,
    handleSubmit,
}: {
    form: FormState;
    isPending: boolean;
    handleSubmit: () => void;
}) {
    const price = parseFloat(form.price) || 0;
    const checks = [
        { label: "Product name added", done: !!form.name.trim() },
        { label: "Headline written", done: !!form.short_description.trim() },
        { label: "Category selected", done: !!form.category_id },
        { label: "Pricing configured", done: true },
        {
            label: "Fulfillment set up",
            done: form.product_type === "physical" || !!form.digital_file_url,
        },
    ];
    const allDone = checks.every((c) => c.done);

    return (
        <div>
            <div className="pf-sec-header">
                <div>
                    <p className="pf-sec-title">Pre-launch checklist</p>
                    <p className="pf-sec-desc">
                        Everything needs to be green before publishing
                    </p>
                </div>
            </div>
            <div className="pf-chk-list">
                {checks.map((item) => (
                    <div
                        key={item.label}
                        className={`pf-chk-item${item.done ? " done" : " todo"}`}
                    >
                        <span className="pf-chk-icon">
                            {item.done ? (
                                <Check size={15} />
                            ) : (
                                <Circle size={15} />
                            )}
                        </span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {!item.done && <span className="pf-chk-req">Required</span>}
                    </div>
                ))}
            </div>

            <hr className="pf-divider" />

            <div className="pf-sec-header">
                <div>
                    <p className="pf-sec-title">Summary</p>
                    <p className="pf-sec-desc">Review before going live</p>
                </div>
            </div>
            <div className="pf-sum-tbl">
                {[
                    { k: "Name", v: form.name || "—" },
                    {
                        k: "Price",
                        v:
                            price === 0 ? "Free" : `$${price.toFixed(2)} ${form.currency}`,
                    },
                    {
                        k: "Billing",
                        v:
                            price === 0
                                ? "—"
                                : form.pricing_type === "recurring"
                                    ? `Recurring · ${form.billing_period}`
                                    : "One-time",
                    },
                    {
                        k: "Fulfillment",
                        v: form.product_type === "digital" ? "Digital" : "Physical",
                    },
                    { k: "Status on publish", v: "Active" },
                ].map((row) => (
                    <div key={row.k} className="pf-sum-row">
                        <span className="pf-sum-k">{row.k}</span>
                        <span className="pf-sum-v">{row.v}</span>
                    </div>
                ))}
            </div>

            <button
                className="pf-pub-big"
                onClick={handleSubmit}
                disabled={isPending || !allDone}
            >
                <Zap size={16} />
                {isPending
                    ? "Publishing…"
                    : allDone
                        ? "Publish product"
                        : "Complete checklist to publish"}
            </button>
            <p className="pf-pub-note">
                {allDone
                    ? "Your product will go live immediately after publishing"
                    : "Complete all required fields above"}
            </p>
        </div>
    );
}

/* ─── MAIN COMPONENT ─────────────────────────── */
export default function ProductForm() {
    const [step, setStep] = useState(1);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [form, setForm] = useState<FormState>({
        name: "",
        slug: "",
        short_description: "",
        description: "",
        product_type: "digital",
        product_subtype: "course",
        price: "29.99",
        currency: "USD",
        category_id: "",
        pricing_type: "recurring",
        billing_period: "monthly",
        digital_file_url: "",
        track_inventory: true,
        inventory_quantity: "0",
        affiliate_enabled: false,
        affiliate_commission_rate: "10",
        is_featured: false,
        status: "draft",
        button_text: "Join now",
        tags: "",
        weight: "",
        dimensions: "",
        images: [],
        custom_domain: false,
        show_author: true,
        show_reviews: true,
        enable_discussions: false,
    });

    function handleChange(field: string, value: unknown) {
        setForm((prev) => {
            const u = { ...prev, [field]: value };
            if (field === "name") u.slug = slugify(value as string);
            if (field === "product_type" && value !== "digital")
                u.pricing_type = "one_time";
            return u;
        });
    }

    async function handleSubmit() {
        setError(null);
        if (!form.name.trim()) {
            setError("Product name is required.");
            return;
        }
        setIsPending(true);
        await new Promise((r) => setTimeout(r, 1400));
        setIsPending(false);
        setSuccess(true);
    }

    if (success)
        return (
            <>
                <style>{css}</style>
                <div className="pf-root">
                    <div className="pf-success">
                        <div className="pf-success-icon">
                            <Check size={26} />
                        </div>
                        <div style={{ textAlign: "center" }}>
                            <p className="pf-success-title">Product published!</p>
                            <p className="pf-success-sub">
                                Your product is now live in your store
                            </p>
                        </div>
                    </div>
                </div>
            </>
        );

    const nextStep = STEPS.find((s) => s.id === step + 1);

    return (
        <>
            <style>{css}</style>
            <div className="pf-root">
                {/* Top bar */}
                <div className="pf-tb">
                    <div className="pf-tb-left">
                        <button
                            className="pf-tb-back"
                            onClick={() => step > 1 && setStep(step - 1)}
                        >
                            <ArrowLeft size={15} />
                        </button>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span className="pf-tb-title">Create product</span>
                                <span className="pf-tb-badge">Draft</span>
                            </div>
                        </div>
                    </div>

                    <div className="pf-tb-steps">
                        {STEPS.map((s, i) => (
                            <span
                                key={s.id}
                                style={{ display: "flex", alignItems: "center", gap: 0 }}
                            >
                                <button
                                    className={`pf-tb-step-btn${step === s.id
                                        ? " is-active"
                                        : s.id < step
                                            ? " is-done"
                                            : ""
                                        }`}
                                    onClick={() => setStep(s.id)}
                                >
                                    <span
                                        className={`pf-tb-step-num${step === s.id
                                            ? " is-active"
                                            : s.id < step
                                                ? " is-done"
                                                : ""
                                            }`}
                                    >
                                        {s.id < step ? <Check size={8} /> : s.id}
                                    </span>
                                    {s.label}
                                </button>
                                {i < STEPS.length - 1 && (
                                    <span className="pf-tb-sep">
                                        <ChevronRight size={12} />
                                    </span>
                                )}
                            </span>
                        ))}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        {nextStep ? (
                            <button
                                className="pf-btn-next"
                                onClick={() => setStep(step + 1)}
                            >
                                Next: {nextStep.label}
                                <ChevronRight size={14} />
                            </button>
                        ) : (
                            <button
                                className="pf-btn-publish"
                                onClick={handleSubmit}
                                disabled={isPending}
                            >
                                <Zap size={14} />
                                {isPending ? "Publishing…" : "Publish"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="pf-err">
                        <AlertTriangle size={15} />
                        {error}
                        <button className="pf-err-close" onClick={() => setError(null)}>
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Layout */}
                <div className="pf-layout">
                    {/* Form */}
                    <div className="pf-fc">
                        <div className="pf-fc-body">
                            {step === 1 && (
                                <StepDetails form={form} handleChange={handleChange} />
                            )}
                            {step === 2 && (
                                <StepPricing form={form} handleChange={handleChange} />
                            )}
                            {step === 3 && (
                                <StepSettings form={form} handleChange={handleChange} />
                            )}
                            {step === 4 && (
                                <StepPublish
                                    form={form}
                                    isPending={isPending}
                                    handleSubmit={handleSubmit}
                                />
                            )}
                        </div>

                        <div className="pf-fc-footer">
                            <button
                                className="pf-back-btn"
                                disabled={step === 1}
                                onClick={() => setStep((s) => Math.max(1, s - 1))}
                            >
                                <ArrowLeft size={12} />
                                Back
                            </button>
                            <div className="pf-dots">
                                {STEPS.map((s) => (
                                    <div
                                        key={s.id}
                                        className={`pf-dot${step === s.id
                                            ? " is-active"
                                            : s.id < step
                                                ? " is-done"
                                                : " is-future"
                                            }`}
                                        onClick={() => setStep(s.id)}
                                    />
                                ))}
                            </div>
                            {nextStep ? (
                                <button
                                    className="pf-btn-next"
                                    style={{ borderRadius: 999 }}
                                    onClick={() => setStep((s) => Math.min(4, s + 1))}
                                >
                                    Next <ChevronRight size={14} />
                                </button>
                            ) : (
                                <button
                                    className="pf-btn-publish"
                                    onClick={handleSubmit}
                                    disabled={isPending}
                                >
                                    <Zap size={14} />
                                    {isPending ? "…" : "Publish"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Preview */}
                    <LivePreview form={form} />

                    {/* Sidebar */}
                    <RightSidebar form={form} handleChange={handleChange} />
                </div>
            </div>
        </>
    );
}