// "use client";
// import { useState } from "react";
// import {
//     ArrowLeft,
//     ChevronRight,
//     Zap,
//     X,
//     Sparkles,
//     Upload,
//     Image as ImageIcon,
//     Play,
//     BookOpen,
//     Target,
//     FileText,
//     Monitor,
//     LayoutTemplate,
//     Users,
//     Package,
//     Globe,
//     Lock,
//     Search,
//     Clock,
//     Check,
//     Circle,
//     Link,
//     ChevronDown,
//     AlertTriangle,
// } from "lucide-react";

// /* ─── HELPERS ──────────────────────────────────── */
// const slugify = (t: string) =>
//     t
//         .toLowerCase()
//         .replace(/[^\w\s-]/g, "")
//         .replace(/[\s_-]+/g, "-")
//         .replace(/^-+|-+$/g, "");

// /* ─── CONSTANTS ────────────────────────────────── */
// const STEPS = [
//     { id: 1, label: "Details" },
//     { id: 2, label: "Pricing" },
//     { id: 3, label: "Settings" },
//     { id: 4, label: "Publish" },
// ];

// const BILLING_PERIODS = [
//     { id: "weekly", label: "Weekly" },
//     { id: "monthly", label: "Monthly" },
//     { id: "quarterly", label: "Quarterly" },
//     { id: "yearly", label: "Yearly" },
// ];

// const STATUS_OPTIONS = [
//     { id: "draft", label: "Draft" },
//     { id: "active", label: "Active" },
//     { id: "paused", label: "Paused" },
//     { id: "archived", label: "Archived" },
// ];

// const PRODUCT_SUBTYPES = [
//     { id: "course", label: "Course", Icon: BookOpen },
//     { id: "coaching", label: "Coaching", Icon: Target },
//     { id: "ebook", label: "E-book", Icon: FileText },
//     { id: "software", label: "Software", Icon: Monitor },
//     { id: "templates", label: "Templates", Icon: LayoutTemplate },
//     { id: "community", label: "Community", Icon: Users },
//     { id: "bundle", label: "Bundle", Icon: Package },
// ];

// const BUTTON_TEXTS = [
//     "Buy Now",
//     "Get Access",
//     "Order Now",
//     "Purchase",
//     "Download",
//     "Subscribe",
//     "Join now",
// ];

// const CATEGORIES = [
//     { id: "1", name: "Online Education", type: "digital" },
//     { id: "2", name: "Business & Finance", type: "digital" },
//     { id: "3", name: "Design & Creative", type: "digital" },
//     { id: "4", name: "Health & Fitness", type: "both" },
//     { id: "5", name: "Technology", type: "digital" },
//     { id: "6", name: "Physical Books", type: "physical" },
//     { id: "7", name: "Merchandise", type: "physical" },
// ];

// /* ─── FORM TYPE ─────────────────────────────────── */
// interface FormState {
//     name: string;
//     slug: string;
//     short_description: string;
//     description: string;
//     product_type: "digital" | "physical";
//     product_subtype: string;
//     price: string;
//     currency: string;
//     category_id: string;
//     pricing_type: "one_time" | "recurring";
//     billing_period: string;
//     digital_file_url: string;
//     track_inventory: boolean;
//     inventory_quantity: string;
//     affiliate_enabled: boolean;
//     affiliate_commission_rate: string;
//     is_featured: boolean;
//     status: string;
//     button_text: string;
//     tags: string;
//     weight: string;
//     dimensions: string;
//     images: string[];
//     custom_domain: boolean;
//     show_author: boolean;
//     show_reviews: boolean;
//     enable_discussions: boolean;
// }

// /* ─── CSS ───────────────────────────────────────── */
// const css = `
//   @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&display=swap');

//   /* ── LIGHT THEME (default) ── */
//   .pf-root {
//     --pf-bg: #f5f5f5;
//     --pf-surface: #ffffff;
//     --pf-surface-secondary: #f4f4f4;
//     --pf-border: #e4e4e4;
//     --pf-border-strong: #cccccc;
//     --pf-accent: #fd5000;
//     --pf-accent-hover: #e04700;
//     --pf-accent-light: #fff3ee;
//     --pf-accent-subtle: #ffe8de;
//     --pf-text-primary: #11181c;
//     --pf-text-secondary: #3c4248;
//     --pf-text-muted: #7e8a92;
//     --pf-success: #30a46c;
//     --pf-success-light: #e9f9ef;
//     --pf-success-border: rgba(48,164,108,0.25);
//     --pf-err-bg: #fff5f5;
//     --pf-err-border: #fecaca;
//     --pf-err-text: #dc2626;
//     --pf-tb-bg: rgba(245,245,245,0.92);
//     --pf-btn-next-hover: #2a2a2a;
//     --pf-cover-gradient: linear-gradient(135deg, #f4f4f4 0%, #eeeceb 100%);

//     font-family: 'DM Sans', system-ui, sans-serif;
//     background: var(--pf-bg);
//     min-height: 100vh;
//     color: var(--pf-text-primary);
//     -webkit-font-smoothing: antialiased;
//     letter-spacing: -0.01em;
//   }

//   /* ── DARK THEME — system preference ── */
//   @media (prefers-color-scheme: dark) {
//     .pf-root {
//       --pf-bg: #0f0f0f;
//       --pf-surface: #1a1a1a;
//       --pf-surface-secondary: #222222;
//       --pf-border: #2e2e2e;
//       --pf-border-strong: #3d3d3d;
//       --pf-accent: #fd5000;
//       --pf-accent-hover: #ff6820;
//       --pf-accent-light: #2a1500;
//       --pf-accent-subtle: #3a1c00;
//       --pf-text-primary: #ededed;
//       --pf-text-secondary: #b0b8be;
//       --pf-text-muted: #6b7580;
//       --pf-success: #3dba7f;
//       --pf-success-light: #0d2a1a;
//       --pf-success-border: rgba(61,186,127,0.25);
//       --pf-err-bg: #2a0a0a;
//       --pf-err-border: #7f1d1d;
//       --pf-err-text: #f87171;
//       --pf-tb-bg: rgba(15,15,15,0.92);
//       --pf-btn-next-hover: #dedede;
//       --pf-cover-gradient: linear-gradient(135deg, #222 0%, #1a1a1a 100%);
//     }
//   }

//   /* ── DARK THEME — explicit data attribute (for manual toggle) ── */
//   .pf-root[data-theme="dark"] {
//     --pf-bg: #0f0f0f;
//     --pf-surface: #1a1a1a;
//     --pf-surface-secondary: #222222;
//     --pf-border: #2e2e2e;
//     --pf-border-strong: #3d3d3d;
//     --pf-accent: #fd5000;
//     --pf-accent-hover: #ff6820;
//     --pf-accent-light: #2a1500;
//     --pf-accent-subtle: #3a1c00;
//     --pf-text-primary: #ededed;
//     --pf-text-secondary: #b0b8be;
//     --pf-text-muted: #6b7580;
//     --pf-success: #3dba7f;
//     --pf-success-light: #0d2a1a;
//     --pf-success-border: rgba(61,186,127,0.25);
//     --pf-err-bg: #2a0a0a;
//     --pf-err-border: #7f1d1d;
//     --pf-err-text: #f87171;
//     --pf-tb-bg: rgba(15,15,15,0.92);
//     --pf-btn-next-hover: #dedede;
//     --pf-cover-gradient: linear-gradient(135deg, #222 0%, #1a1a1a 100%);
//   }

//   .pf-root *, .pf-root *::before, .pf-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

//   /* TOP BAR */
//   .pf-tb {
//     position: sticky; top: 0; z-index: 50;
//     height: 60px;
//     display: flex; align-items: center; gap: 16px;
//     padding: 0 20px;
//     background: var(--pf-tb-bg);
//     backdrop-filter: blur(12px);
//     border-bottom: 1px solid var(--pf-border);
//   }
//   .pf-tb-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
//   .pf-tb-back {
//     width: 34px; height: 34px; border-radius: 10px;
//     border: 1px solid var(--pf-border);
//     background: var(--pf-surface);
//     display: flex; align-items: center; justify-content: center;
//     cursor: pointer; color: var(--pf-text-muted);
//     flex-shrink: 0;
//     transition: border-color 0.15s, color 0.15s;
//   }
//   .pf-tb-back:hover { border-color: var(--pf-border-strong); color: var(--pf-text-primary); }
//   .pf-tb-title { font-size: 14px; font-weight: 600; color: var(--pf-text-primary); }
//   .pf-tb-badge {
//     font-size: 10px; font-weight: 600;
//     padding: 2px 8px; border-radius: 999px;
//     background: var(--pf-surface); border: 1px solid var(--pf-border);
//     color: var(--pf-text-muted); letter-spacing: 0.02em;
//   }
//   .pf-tb-steps { display: flex; align-items: center; gap: 2px; }
//   .pf-tb-step-btn {
//     display: flex; align-items: center; gap: 7px;
//     padding: 0 11px; height: 34px; border-radius: 9px;
//     border: 1px solid transparent; background: transparent;
//     font-size: 12px; font-weight: 500; cursor: pointer;
//     color: var(--pf-text-muted);
//     font-family: inherit;
//     transition: all 0.15s; white-space: nowrap;
//   }
//   .pf-tb-step-btn.is-active {
//     background: var(--pf-surface);
//     border-color: var(--pf-border);
//     color: var(--pf-text-primary);
//   }
//   .pf-tb-step-btn.is-done { color: var(--pf-text-secondary); }
//   .pf-tb-step-num {
//     width: 18px; height: 18px; border-radius: 50%;
//     display: flex; align-items: center; justify-content: center;
//     font-size: 9px; font-weight: 700;
//     background: var(--pf-surface-secondary); border: 1px solid var(--pf-border);
//     color: var(--pf-text-muted); flex-shrink: 0;
//     transition: all 0.15s;
//   }
//   .pf-tb-step-num.is-active { background: var(--pf-accent); border-color: var(--pf-accent); color: #fff; }
//   .pf-tb-step-num.is-done { background: var(--pf-success-light); border-color: var(--pf-success-border); color: var(--pf-success); }
//   .pf-tb-sep { color: var(--pf-border-strong); font-size: 11px; padding: 0 2px; }

//   .pf-btn-publish {
//     display: flex; align-items: center; gap: 6px;
//     height: 36px; padding: 0 18px; border-radius: 999px;
//     background: var(--pf-accent); color: #fff; border: none;
//     font-size: 13px; font-weight: 600; cursor: pointer;
//     font-family: inherit;
//     transition: background 0.15s, transform 0.1s;
//     white-space: nowrap; flex-shrink: 0;
//   }
//   .pf-btn-publish:hover { background: var(--pf-accent-hover); }
//   .pf-btn-publish:active { transform: scale(0.97); }
//   .pf-btn-publish:disabled { background: var(--pf-border-strong); cursor: not-allowed; }

//   .pf-btn-next {
//     display: flex; align-items: center; gap: 6px;
//     height: 36px; padding: 0 18px; border-radius: 999px;
//     background: var(--pf-text-primary); color: var(--pf-bg); border: none;
//     font-size: 13px; font-weight: 600; cursor: pointer;
//     font-family: inherit;
//     transition: all 0.15s;
//     white-space: nowrap; flex-shrink: 0;
//   }
//   .pf-btn-next:hover { background: var(--pf-btn-next-hover); }
//   .pf-btn-next:active { transform: scale(0.97); }

//   /* ERROR BAR */
//   .pf-err {
//     display: flex; align-items: center; gap: 10px;
//     margin: 14px 20px 0;
//     padding: 11px 14px; border-radius: 12px;
//     background: var(--pf-err-bg); border: 1px solid var(--pf-err-border);
//     color: var(--pf-err-text); font-size: 13px;
//   }
//   .pf-err-close { margin-left: auto; border: none; background: none; color: var(--pf-err-text); cursor: pointer; display: flex; align-items: center; }

//   /* LAYOUT */
//   .pf-layout {
//     display: grid;
//     grid-template-columns: 1fr 288px 232px;
//     gap: 18px;
//     padding: 20px;
//     max-width: 1340px;
//     margin: 0 auto;
//     align-items: start;
//   }

//   /* FORM CARD */
//   .pf-fc {
//     background: var(--pf-surface);
//     border: 1px solid var(--pf-border);
//     border-radius: 16px;
//     overflow: hidden;
//   }
//   .pf-fc-body { padding: 28px 32px; }
//   .pf-fc-footer {
//     display: flex; align-items: center; justify-content: space-between;
//     padding: 14px 28px;
//     border-top: 1px solid var(--pf-border);
//   }
//   .pf-back-btn {
//     display: flex; align-items: center; gap: 6px;
//     height: 36px; padding: 0 14px; border-radius: 999px;
//     border: 1px solid var(--pf-border); background: transparent;
//     font-size: 12px; font-weight: 500; color: var(--pf-text-muted);
//     cursor: pointer; font-family: inherit;
//     transition: all 0.15s;
//   }
//   .pf-back-btn:hover:not(:disabled) { border-color: var(--pf-border-strong); color: var(--pf-text-secondary); }
//   .pf-back-btn:disabled { opacity: 0.35; cursor: not-allowed; }

//   /* DOTS */
//   .pf-dots { display: flex; align-items: center; gap: 5px; }
//   .pf-dot {
//     height: 5px; border-radius: 3px; cursor: pointer;
//     transition: all 0.3s cubic-bezier(.16,1,.3,1);
//   }
//   .pf-dot.is-active { width: 22px; background: var(--pf-accent); }
//   .pf-dot.is-done { width: 5px; background: var(--pf-success); opacity: 0.5; }
//   .pf-dot.is-future { width: 5px; background: var(--pf-border-strong); }

//   /* SECTION */
//   .pf-sec-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
//   .pf-sec-title { font-size: 13px; font-weight: 600; color: var(--pf-text-primary); }
//   .pf-sec-desc { font-size: 11.5px; color: var(--pf-text-muted); margin-top: 2px; }
//   .pf-divider { border: none; border-top: 1px solid var(--pf-border); margin: 26px 0; }

//   /* FORM CONTROLS */
//   .pf-field { margin-bottom: 14px; }
//   .pf-field:last-child { margin-bottom: 0; }
//   .pf-lbl {
//     display: flex; align-items: center; justify-content: space-between;
//     margin-bottom: 6px;
//     font-size: 11.5px; font-weight: 500; color: var(--pf-text-muted);
//   }
//   .pf-req { color: var(--pf-accent); margin-left: 2px; }
//   .pf-cc { font-size: 10px; font-family: monospace; }
//   .pf-cc-ok { color: var(--pf-text-muted); }
//   .pf-cc-warn { color: #f59e0b; }
//   .pf-cc-over { color: #ef4444; }

//   .pf-inp, .pf-sel, .pf-ta {
//     width: 100%; border: 1px solid var(--pf-border);
//     border-radius: 10px; padding: 0 12px; height: 40px;
//     font-size: 13px; color: var(--pf-text-primary);
//     background: var(--pf-surface); outline: none;
//     font-family: inherit;
//     transition: border-color 0.15s, outline-color 0.15s;
//     -moz-appearance: textfield;
//     appearance: none;
//   }
//   .pf-inp:focus, .pf-sel:focus, .pf-ta:focus {
//     border-color: var(--pf-accent);
//     outline: 3px solid color-mix(in srgb, var(--pf-accent) 20%, transparent);
//     outline-offset: 0px;
//   }
//   .pf-inp::placeholder, .pf-ta::placeholder { color: var(--pf-text-muted); opacity: 1; }
//   .pf-inp:disabled { opacity: 0.4; cursor: not-allowed; background: var(--pf-surface-secondary); }
//   .pf-ta { height: auto; padding: 10px 12px; resize: vertical; line-height: 1.6; }

//   .pf-sel-wrap { position: relative; }
//   .pf-sel-wrap .pf-sel { padding-right: 32px; }
//   .pf-sel-arrow { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--pf-text-muted); }

//   /* INPUT GROUP */
//   .pf-ig { display: flex; }
//   .pf-ig-pre {
//     display: flex; align-items: center; padding: 0 12px;
//     border: 1px solid var(--pf-border); border-right: none;
//     border-radius: 10px 0 0 10px;
//     background: var(--pf-surface-secondary);
//     font-size: 11px; font-family: monospace; color: var(--pf-text-muted);
//     white-space: nowrap; flex-shrink: 0;
//   }
//   .pf-ig .pf-inp { border-radius: 0 10px 10px 0; }

//   /* TOGGLE */
//   .pf-tog {
//     position: relative; width: 34px; height: 18px;
//     border-radius: 9px; border: none; cursor: pointer;
//     transition: background 0.2s; flex-shrink: 0;
//   }
//   .pf-tog-k {
//     position: absolute; top: 2px; width: 14px; height: 14px;
//     border-radius: 50%; background: #fff;
//     transition: transform 0.2s cubic-bezier(.16,1,.3,1);
//   }

//   /* TAG INPUT */
//   .pf-tag-wrap {
//     display: flex; flex-wrap: wrap; gap: 5px; min-height: 40px;
//     padding: 5px 8px; border-radius: 10px;
//     border: 1px solid var(--pf-border); background: var(--pf-surface);
//     transition: border-color 0.15s;
//     cursor: text;
//   }
//   .pf-tag-wrap:focus-within { border-color: var(--pf-accent); outline: 3px solid color-mix(in srgb, var(--pf-accent) 20%, transparent); }
//   .pf-tag {
//     display: inline-flex; align-items: center; gap: 4px;
//     padding: 2px 8px; border-radius: 999px;
//     font-size: 11px; font-weight: 500;
//     background: var(--pf-accent-light); border: 1px solid rgba(253,80,0,0.18);
//     color: var(--pf-accent);
//   }
//   .pf-tag-x { cursor: pointer; background: none; border: none; color: rgba(253,80,0,0.5); display: flex; align-items: center; padding: 0; }
//   .pf-tag-x:hover { color: var(--pf-accent); }
//   .pf-tag-inp { flex: 1; min-width: 60px; border: none; outline: none; font-size: 12px; color: var(--pf-text-primary); background: transparent; height: 26px; font-family: inherit; }
//   .pf-tag-inp::placeholder { color: var(--pf-text-muted); }

//   /* OPTION CARDS */
//   .pf-opt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
//   .pf-opt-card {
//     display: flex; flex-direction: column; gap: 3px;
//     padding: 13px; border-radius: 12px;
//     border: 1.5px solid var(--pf-border);
//     background: var(--pf-surface-secondary);
//     cursor: pointer; text-align: left;
//     transition: all 0.15s;
//   }
//   .pf-opt-card:hover:not(.is-sel) { border-color: var(--pf-border-strong); background: var(--pf-surface); }
//   .pf-opt-card.is-sel { border-color: var(--pf-accent); background: var(--pf-accent-light); }
//   .pf-opt-top { display: flex; align-items: center; justify-content: space-between; }
//   .pf-opt-label { font-size: 13px; font-weight: 600; color: var(--pf-text-primary); }
//   .pf-opt-hint { font-size: 11px; color: var(--pf-text-muted); }
//   .pf-opt-check { color: var(--pf-accent); }

//   /* PILLS */
//   .pf-pills { display: flex; flex-wrap: wrap; gap: 6px; }
//   .pf-pill {
//     padding: 0 13px; height: 31px; border-radius: 999px;
//     font-size: 12px; font-weight: 500; cursor: pointer;
//     border: 1px solid var(--pf-border);
//     background: var(--pf-surface-secondary); color: var(--pf-text-secondary);
//     font-family: inherit; transition: all 0.15s;
//   }
//   .pf-pill:hover:not(.is-active) { border-color: var(--pf-border-strong); }
//   .pf-pill.is-active { background: var(--pf-accent); color: #fff; border-color: var(--pf-accent); }

//   /* BILLING TYPE */
//   .pf-bill-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
//   .pf-bill-btn {
//     height: 38px; border-radius: 10px;
//     font-size: 12px; font-weight: 500; cursor: pointer;
//     border: 1.5px solid var(--pf-border);
//     background: var(--pf-surface-secondary); color: var(--pf-text-secondary);
//     font-family: inherit; transition: all 0.15s;
//   }
//   .pf-bill-btn.is-active { border-color: var(--pf-accent); background: var(--pf-accent-light); color: var(--pf-accent); }

//   /* AI ASSIST BTN */
//   .pf-ai-btn {
//     display: flex; align-items: center; gap: 5px;
//     padding: 0 11px; height: 30px; border-radius: 999px;
//     border: 1px solid var(--pf-border);
//     background: var(--pf-surface); color: var(--pf-text-secondary);
//     font-size: 11.5px; font-weight: 500; cursor: pointer;
//     font-family: inherit; transition: all 0.15s;
//     white-space: nowrap; flex-shrink: 0;
//   }
//   .pf-ai-btn:hover { border-color: var(--pf-accent); color: var(--pf-accent); background: var(--pf-accent-light); }

//   /* MEDIA UPLOAD */
//   .pf-media-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-start; }
//   .pf-upload-cover {
//     display: flex; flex-direction: column; align-items: center; justify-content: center;
//     gap: 7px; width: 148px; height: 106px;
//     border-radius: 12px; border: 2px dashed var(--pf-border);
//     background: var(--pf-surface-secondary); cursor: pointer;
//     transition: all 0.15s;
//   }
//   .pf-upload-cover:hover { border-color: var(--pf-accent); background: var(--pf-accent-light); }
//   .pf-upload-cover-label { font-size: 11px; font-weight: 500; color: var(--pf-text-muted); text-align: center; }
//   .pf-upload-cover-hint { font-size: 10px; color: var(--pf-text-muted); opacity: 0.6; text-align: center; line-height: 1.4; }
//   .pf-upload-sm {
//     display: flex; flex-direction: column; align-items: center; justify-content: center;
//     gap: 3px; width: 72px; height: 54px;
//     border-radius: 10px; border: 1.5px dashed var(--pf-border);
//     background: var(--pf-surface-secondary); cursor: pointer; font-size: 11px;
//     color: var(--pf-text-muted); transition: all 0.15s;
//   }
//   .pf-upload-sm:hover { border-color: var(--pf-accent); color: var(--pf-accent); }

//   /* GRID HELPERS */
//   .pf-g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
//   .pf-span2 { grid-column: span 2; }

//   /* PREVIEW CARD */
//   .pf-prev {
//     background: var(--pf-surface); border: 1px solid var(--pf-border);
//     border-radius: 16px; overflow: hidden;
//     position: sticky; top: 76px;
//   }
//   .pf-prev-hd {
//     display: flex; align-items: center; justify-content: space-between;
//     padding: 11px 15px; border-bottom: 1px solid var(--pf-border);
//   }
//   .pf-prev-lbl { font-size: 11px; font-weight: 600; color: var(--pf-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
//   .pf-prev-badge {
//     font-size: 10px; font-weight: 500; padding: 2px 8px;
//     border-radius: 999px; background: var(--pf-surface-secondary);
//     border: 1px solid var(--pf-border); color: var(--pf-text-muted);
//   }
//   .pf-prev-bd { padding: 14px; }
//   .pf-prev-cover {
//     width: 100%; aspect-ratio: 16/9; border-radius: 10px;
//     border: 1px solid var(--pf-border);
//     background: var(--pf-cover-gradient);
//     display: flex; align-items: center; justify-content: center;
//     margin-bottom: 12px;
//     position: relative; overflow: hidden;
//   }
//   .pf-prev-cover-inner { text-align: center; color: var(--pf-text-muted); opacity: 0.4; display: flex; flex-direction: column; align-items: center; gap: 6px; }
//   .pf-prev-stats { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
//   .pf-av-stack { display: flex; }
//   .pf-av { width: 17px; height: 17px; border-radius: 50%; border: 2px solid var(--pf-surface); margin-right: -4px; }
//   .pf-prev-stat-txt { font-size: 11px; color: var(--pf-text-muted); }
//   .pf-prev-rating { font-size: 11px; color: var(--pf-text-muted); margin-left: auto; }
//   .pf-prev-name { font-size: 14px; font-weight: 700; color: var(--pf-text-primary); line-height: 1.3; margin-bottom: 4px; letter-spacing: -0.02em; }
//   .pf-prev-name.empty { color: var(--pf-border-strong); font-weight: 400; font-style: italic; }
//   .pf-prev-headline { font-size: 11.5px; color: var(--pf-text-muted); margin-bottom: 10px; line-height: 1.5; }
//   .pf-prev-price { font-size: 22px; font-weight: 700; color: var(--pf-text-primary); margin-bottom: 10px; letter-spacing: -0.03em; }
//   .pf-prev-period { font-size: 12px; color: var(--pf-text-muted); font-weight: 400; }
//   .pf-prev-cta {
//     width: 100%; padding: 9px; border-radius: 10px;
//     background: var(--pf-accent); color: #fff; border: none;
//     font-size: 13px; font-weight: 600; cursor: default;
//     font-family: inherit;
//   }
//   .pf-prev-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px; }
//   .pf-prev-tag {
//     font-size: 10px; padding: 2px 8px; border-radius: 999px;
//     background: var(--pf-accent-light); border: 1px solid rgba(253,80,0,0.15);
//     color: var(--pf-accent);
//   }
//   .pf-prev-divider { border: none; border-top: 1px solid var(--pf-border); margin: 12px 0; }
//   .pf-prev-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; }
//   .pf-prev-row-k { color: var(--pf-text-muted); }
//   .pf-prev-row-v { font-weight: 500; color: var(--pf-text-secondary); }

//   /* RIGHT SIDEBAR */
//   .pf-sb { position: sticky; top: 76px; display: flex; flex-direction: column; gap: 12px; }
//   .pf-panel {
//     background: var(--pf-surface); border: 1px solid var(--pf-border);
//     border-radius: 14px; overflow: hidden;
//   }
//   .pf-panel-hd { padding: 11px 15px; border-bottom: 1px solid var(--pf-border); }
//   .pf-panel-title { font-size: 12px; font-weight: 600; color: var(--pf-text-primary); }
//   .pf-panel-bd { padding: 12px 14px; }

//   .pf-save-hint {
//     display: flex; align-items: center; gap: 7px;
//     padding: 8px 10px; border-radius: 8px;
//     background: var(--pf-surface-secondary); border: 1px solid var(--pf-border);
//     font-size: 11px; color: var(--pf-text-muted); margin-top: 8px;
//   }
//   .pf-dot-amber { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; flex-shrink: 0; }

//   .pf-tog-row {
//     display: flex; align-items: center; justify-content: space-between;
//     padding: 8px 0; font-size: 12px; color: var(--pf-text-primary);
//   }
//   .pf-tog-row + .pf-tog-row { border-top: 1px solid var(--pf-border); }

//   .pf-sub-list { padding: 5px; }
//   .pf-sub-item {
//     display: flex; align-items: center; gap: 9px;
//     padding: 7px 9px; border-radius: 9px; cursor: pointer;
//     border: 1px solid transparent; transition: all 0.12s;
//     width: 100%; text-align: left; background: transparent;
//     font-family: inherit;
//   }
//   .pf-sub-item:hover:not(.is-sel) { background: var(--pf-surface-secondary); }
//   .pf-sub-item.is-sel { background: var(--pf-accent-light); border-color: rgba(253,80,0,0.18); }
//   .pf-sub-icon {
//     width: 26px; height: 26px; border-radius: 7px;
//     display: flex; align-items: center; justify-content: center;
//     background: var(--pf-surface-secondary);
//     border: 1px solid var(--pf-border); flex-shrink: 0;
//     transition: all 0.12s; color: var(--pf-text-muted);
//   }
//   .pf-sub-item.is-sel .pf-sub-icon { background: var(--pf-accent-light); border-color: rgba(253,80,0,0.25); color: var(--pf-accent); }
//   .pf-sub-name { font-size: 12px; font-weight: 500; color: var(--pf-text-muted); flex: 1; transition: color 0.12s; }
//   .pf-sub-item.is-sel .pf-sub-name { color: var(--pf-accent); }
//   .pf-sub-check { color: var(--pf-accent); }

//   .pf-adv-item {
//     display: flex; align-items: center; gap: 10px;
//     padding: 10px 15px; font-size: 12px; color: var(--pf-text-primary);
//     cursor: pointer; border: none; background: transparent;
//     width: 100%; text-align: left; transition: background 0.1s;
//     font-family: inherit;
//   }
//   .pf-adv-item:hover { background: var(--pf-surface-secondary); }
//   .pf-adv-item + .pf-adv-item { border-top: 1px solid var(--pf-border); }
//   .pf-adv-icon { color: var(--pf-text-muted); flex-shrink: 0; }
//   .pf-adv-arr { margin-left: auto; color: var(--pf-border-strong); }

//   /* CHECKLIST */
//   .pf-chk-list { display: flex; flex-direction: column; gap: 7px; }
//   .pf-chk-item {
//     display: flex; align-items: center; gap: 10px;
//     padding: 11px 13px; border-radius: 10px; font-size: 12.5px;
//   }
//   .pf-chk-item.done { background: var(--pf-success-light); border: 1px solid var(--pf-success-border); color: var(--pf-success); }
//   .pf-chk-item.todo { background: var(--pf-surface-secondary); border: 1px solid var(--pf-border); color: var(--pf-text-muted); }
//   .pf-chk-icon { flex-shrink: 0; }
//   .pf-chk-req {
//     margin-left: auto; font-size: 10px; font-weight: 600;
//     padding: 2px 8px; border-radius: 999px;
//     background: var(--pf-accent-light); color: var(--pf-accent);
//     border: 1px solid rgba(253,80,0,0.2);
//   }

//   /* SUMMARY TABLE */
//   .pf-sum-tbl { border: 1px solid var(--pf-border); border-radius: 12px; overflow: hidden; }
//   .pf-sum-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 15px; font-size: 12.5px; }
//   .pf-sum-row + .pf-sum-row { border-top: 1px solid var(--pf-border); }
//   .pf-sum-k { color: var(--pf-text-muted); }
//   .pf-sum-v { font-weight: 600; color: var(--pf-text-primary); }

//   /* BIG PUBLISH BTN */
//   .pf-pub-big {
//     width: 100%; height: 44px; border-radius: 12px;
//     background: var(--pf-accent); color: #fff; border: none;
//     font-size: 14px; font-weight: 700; cursor: pointer;
//     display: flex; align-items: center; justify-content: center; gap: 8px;
//     font-family: inherit; margin-top: 10px;
//     transition: background 0.15s, transform 0.1s;
//     letter-spacing: -0.01em;
//   }
//   .pf-pub-big:hover:not(:disabled) { background: var(--pf-accent-hover); }
//   .pf-pub-big:active:not(:disabled) { transform: scale(0.98); }
//   .pf-pub-big:disabled { background: var(--pf-border-strong); cursor: not-allowed; }
//   .pf-pub-note { font-size: 11px; color: var(--pf-text-muted); text-align: center; margin-top: 8px; }

//   /* INFO BOX */
//   .pf-info-box {
//     font-size: 12px; padding: 10px 12px; border-radius: 10px;
//     background: var(--pf-accent-light); border: 1px solid rgba(253,80,0,0.2);
//     color: var(--pf-accent); line-height: 1.5;
//   }

//   /* SUCCESS */
//   .pf-success {
//     min-height: 100vh; display: flex; flex-direction: column;
//     align-items: center; justify-content: center; gap: 16px;
//     background: var(--pf-bg);
//   }
//   .pf-success-icon {
//     width: 60px; height: 60px; border-radius: 18px;
//     background: var(--pf-success-light); border: 1px solid var(--pf-success-border);
//     display: flex; align-items: center; justify-content: center;
//     color: var(--pf-success);
//   }
//   .pf-success-title { font-size: 17px; font-weight: 700; color: var(--pf-text-primary); letter-spacing: -0.02em; }
//   .pf-success-sub { font-size: 13px; color: var(--pf-text-muted); }

//   /* FULFILLMENT CARDS */
//   .pf-ful-card {
//     display: flex; align-items: center; gap: 12px;
//     padding: 12px; border-radius: 12px; cursor: pointer;
//     border: 1.5px solid var(--pf-border);
//     background: var(--pf-surface-secondary);
//     transition: all 0.15s;
//   }
//   .pf-ful-card:hover:not(.is-sel) { border-color: var(--pf-border-strong); }
//   .pf-ful-card.is-sel { border-color: var(--pf-accent); background: var(--pf-accent-light); }
//   .pf-ful-icon {
//     width: 36px; height: 36px; border-radius: 10px;
//     display: flex; align-items: center; justify-content: center;
//     background: var(--pf-surface);
//     border: 1px solid var(--pf-border); flex-shrink: 0;
//     color: var(--pf-text-muted);
//     transition: all 0.15s;
//   }
//   .pf-ful-card.is-sel .pf-ful-icon { background: var(--pf-accent); border-color: var(--pf-accent); color: #fff; }
//   .pf-ful-label { font-size: 13px; font-weight: 600; color: var(--pf-text-primary); }
//   .pf-ful-hint { font-size: 11px; color: var(--pf-text-muted); margin-top: 2px; }

//   /* INVENTORY CARD */
//   .pf-inv-card {
//     display: flex; align-items: center; justify-content: space-between;
//     padding: 12px; border-radius: 10px;
//     background: var(--pf-surface-secondary); border: 1px solid var(--pf-border);
//   }
//   .pf-inv-label { font-size: 12.5px; font-weight: 500; color: var(--pf-text-primary); }
//   .pf-inv-hint { font-size: 11px; color: var(--pf-text-muted); margin-top: 2px; }

//   /* VISIBILITY CARD */
//   .pf-vis-card {
//     display: flex; align-items: center; justify-content: space-between;
//     padding: 14px; border-radius: 12px;
//     border: 1px solid var(--pf-border);
//     background: var(--pf-surface-secondary);
//   }

//   /* FILE ATTACHED */
//   .pf-file-attached {
//     display: flex; align-items: center; gap: 10px;
//     padding: 11px 12px; border-radius: 10px;
//     background: var(--pf-success-light); border: 1px solid var(--pf-success-border);
//     margin-bottom: 8px;
//   }
//   .pf-file-name { font-size: 12px; font-family: monospace; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--pf-text-primary); }
//   .pf-file-rm { border: none; background: none; color: var(--pf-err-text); cursor: pointer; display: flex; align-items: center; padding: 0; }
// `;

// /* ─── SUB-COMPONENTS ────────────────────────────── */

// function Toggle({
//     checked,
//     onChange,
// }: {
//     checked: boolean;
//     onChange: (v: boolean) => void;
// }) {
//     return (
//         <button
//             type="button"
//             className="pf-tog"
//             onClick={() => onChange(!checked)}
//             style={{
//                 background: checked
//                     ? "var(--pf-accent)"
//                     : "var(--pf-border-strong)",
//             }}
//         >
//             <span
//                 className="pf-tog-k"
//                 style={{ transform: checked ? "translateX(17px)" : "translateX(2px)" }}
//             />
//         </button>
//     );
// }

// function CharCount({ val, max }: { val: string; max: number }) {
//     const n = (val || "").length;
//     const cls =
//         n >= max
//             ? "pf-cc pf-cc-over"
//             : n >= max * 0.85
//                 ? "pf-cc pf-cc-warn"
//                 : "pf-cc pf-cc-ok";
//     return (
//         <span className={cls}>
//             {n}/{max}
//         </span>
//     );
// }

// function TagInput({
//     value,
//     onChange,
// }: {
//     value: string;
//     onChange: (v: string) => void;
// }) {
//     const [inp, setInp] = useState("");
//     const tags = value
//         ? value
//             .split(",")
//             .map((t) => t.trim())
//             .filter(Boolean)
//         : [];

//     const add = (t: string) => {
//         const tr = t.trim();
//         if (!tr || tags.includes(tr)) return;
//         onChange([...tags, tr].join(", "));
//         setInp("");
//     };
//     const rm = (i: number) =>
//         onChange(tags.filter((_, idx) => idx !== i).join(", "));

//     return (
//         <div className="pf-tag-wrap">
//             {tags.map((t, i) => (
//                 <span key={t} className="pf-tag">
//                     {t}
//                     <button className="pf-tag-x" onClick={() => rm(i)}>
//                         <X size={10} />
//                     </button>
//                 </span>
//             ))}
//             <input
//                 className="pf-tag-inp"
//                 value={inp}
//                 placeholder={tags.length === 0 ? "Add a tag…" : ""}
//                 onChange={(e) => setInp(e.target.value)}
//                 onKeyDown={(e) => {
//                     if (e.key === "Enter" || e.key === ",") {
//                         e.preventDefault();
//                         add(inp);
//                     }
//                     if (e.key === "Backspace" && !inp && tags.length) rm(tags.length - 1);
//                 }}
//                 onBlur={() => {
//                     if (inp) add(inp);
//                 }}
//             />
//         </div>
//     );
// }

// function LivePreview({ form }: { form: FormState }) {
//     const price = parseFloat(form.price) || 0;
//     const isFree = price === 0;
//     const tags = form.tags
//         ? form.tags
//             .split(",")
//             .slice(0, 4)
//             .map((t) => t.trim())
//             .filter(Boolean)
//         : [];

//     return (
//         <div className="pf-prev">
//             <div className="pf-prev-hd">
//                 <span className="pf-prev-lbl">Preview</span>
//                 <span className="pf-prev-badge">Buyer view</span>
//             </div>
//             <div className="pf-prev-bd">
//                 <div className="pf-prev-cover">
//                     <div className="pf-prev-cover-inner">
//                         <ImageIcon size={28} />
//                         <div style={{ fontSize: 11 }}>Cover image</div>
//                     </div>
//                 </div>
//                 <div className="pf-prev-stats">
//                     <div className="pf-av-stack">
//                         {["#ffb3a7", "#ffd6b8", "#c4c4ff"].map((c, i) => (
//                             <div key={i} className="pf-av" style={{ background: c }} />
//                         ))}
//                     </div>
//                     <span className="pf-prev-stat-txt">2.8k+ students</span>
//                     <span className="pf-prev-rating">★ 4.9</span>
//                 </div>
//                 <p className={`pf-prev-name${form.name ? "" : " empty"}`}>
//                     {form.name || "Your product name"}
//                 </p>
//                 {form.short_description && (
//                     <p className="pf-prev-headline">{form.short_description}</p>
//                 )}
//                 <p className="pf-prev-price">
//                     {isFree ? "Free" : `$${price.toFixed(2)}`}
//                     {!isFree && form.pricing_type === "recurring" && (
//                         <span className="pf-prev-period"> / {form.billing_period}</span>
//                     )}
//                 </p>
//                 <button className="pf-prev-cta">{form.button_text || "Join now"}</button>
//                 {tags.length > 0 && (
//                     <div className="pf-prev-tags">
//                         {tags.map((t, i) => (
//                             <span key={i} className="pf-prev-tag">
//                                 {t}
//                             </span>
//                         ))}
//                     </div>
//                 )}
//                 {form.name && (
//                     <>
//                         <div className="pf-prev-divider" />
//                         <div className="pf-prev-row">
//                             <span className="pf-prev-row-k">Type</span>
//                             <span className="pf-prev-row-v">{form.product_type}</span>
//                         </div>
//                         <div className="pf-prev-row">
//                             <span className="pf-prev-row-k">Status</span>
//                             <span className="pf-prev-row-v">{form.status}</span>
//                         </div>
//                     </>
//                 )}
//             </div>
//         </div>
//     );
// }

// function RightSidebar({
//     form,
//     handleChange,
// }: {
//     form: FormState;
//     handleChange: (field: string, value: unknown) => void;
// }) {
//     const advItems = [
//         { label: "Drip content", Icon: Clock },
//         { label: "Access rules", Icon: Lock },
//         { label: "Localization", Icon: Globe },
//         { label: "SEO settings", Icon: Search },
//     ];

//     return (
//         <div className="pf-sb">
//             <div className="pf-panel">
//                 <div className="pf-panel-hd">
//                     <p className="pf-panel-title">Status</p>
//                 </div>
//                 <div className="pf-panel-bd">
//                     <div className="pf-sel-wrap">
//                         <select
//                             className="pf-sel"
//                             value={form.status}
//                             onChange={(e) => handleChange("status", e.target.value)}
//                             style={{ marginBottom: 0 }}
//                         >
//                             {STATUS_OPTIONS.map((s) => (
//                                 <option key={s.id} value={s.id}>
//                                     {s.label}
//                                 </option>
//                             ))}
//                         </select>
//                         <span className="pf-sel-arrow">
//                             <ChevronDown size={14} />
//                         </span>
//                     </div>
//                     <div className="pf-save-hint">
//                         <div className="pf-dot-amber" />
//                         Unsaved changes
//                     </div>
//                 </div>
//             </div>

//             <div className="pf-panel">
//                 <div className="pf-panel-hd">
//                     <p className="pf-panel-title">Sales page</p>
//                 </div>
//                 <div className="pf-panel-bd" style={{ paddingTop: 4, paddingBottom: 4 }}>
//                     {[
//                         { key: "custom_domain", label: "Custom domain" },
//                         { key: "show_author", label: "Show author bio" },
//                         { key: "show_reviews", label: "Show reviews" },
//                         { key: "enable_discussions", label: "Discussions" },
//                     ].map((item) => (
//                         <div key={item.key} className="pf-tog-row">
//                             <span>{item.label}</span>
//                             <Toggle
//                                 checked={!!form[item.key as keyof FormState]}
//                                 onChange={(v) => handleChange(item.key, v)}
//                             />
//                         </div>
//                     ))}
//                 </div>
//             </div>

//             <div className="pf-panel">
//                 <div className="pf-panel-hd">
//                     <p className="pf-panel-title">Product type</p>
//                 </div>
//                 <div className="pf-sub-list">
//                     {PRODUCT_SUBTYPES.map((type) => {
//                         const sel = form.product_subtype === type.id;
//                         return (
//                             <button
//                                 key={type.id}
//                                 className={`pf-sub-item${sel ? " is-sel" : ""}`}
//                                 onClick={() => handleChange("product_subtype", type.id)}
//                             >
//                                 <div className="pf-sub-icon">
//                                     <type.Icon size={13} />
//                                 </div>
//                                 <span className="pf-sub-name">{type.label}</span>
//                                 {sel && (
//                                     <span className="pf-sub-check">
//                                         <Check size={12} />
//                                     </span>
//                                 )}
//                             </button>
//                         );
//                     })}
//                 </div>
//             </div>

//             <div className="pf-panel">
//                 <div className="pf-panel-hd">
//                     <p className="pf-panel-title">Advanced</p>
//                 </div>
//                 {advItems.map((item) => (
//                     <button key={item.label} className="pf-adv-item">
//                         <span className="pf-adv-icon">
//                             <item.Icon size={13} />
//                         </span>
//                         <span>{item.label}</span>
//                         <span className="pf-adv-arr">
//                             <ChevronRight size={16} />
//                         </span>
//                     </button>
//                 ))}
//             </div>
//         </div>
//     );
// }

// /* ─── STEP 1 ─────────────────────────────────── */
// function StepDetails({
//     form,
//     handleChange,
// }: {
//     form: FormState;
//     handleChange: (field: string, value: unknown) => void;
// }) {
//     const cats = CATEGORIES.filter((c) =>
//         form.product_type === "digital"
//             ? c.type !== "physical"
//             : c.type !== "digital"
//     );

//     return (
//         <div>
//             <div className="pf-sec-header">
//                 <div>
//                     <p className="pf-sec-title">Basic information</p>
//                     <p className="pf-sec-desc">Tell buyers what your product is about</p>
//                 </div>
//                 <button className="pf-ai-btn">
//                     <Sparkles size={12} />
//                     AI Assist
//                 </button>
//             </div>

//             <div className="pf-field">
//                 <div className="pf-lbl">
//                     <span>
//                         Product name<span className="pf-req">*</span>
//                     </span>
//                     <CharCount val={form.name} max={80} />
//                 </div>
//                 <input
//                     className="pf-inp"
//                     type="text"
//                     value={form.name}
//                     maxLength={80}
//                     onChange={(e) => handleChange("name", e.target.value)}
//                     placeholder="e.g. How to Build a Viral App: 0 to $100k/mo"
//                 />
//             </div>

//             <div className="pf-field">
//                 <div className="pf-lbl">
//                     <span>
//                         Headline<span className="pf-req">*</span>
//                     </span>
//                     <CharCount val={form.short_description} max={80} />
//                 </div>
//                 <input
//                     className="pf-inp"
//                     type="text"
//                     value={form.short_description}
//                     maxLength={80}
//                     onChange={(e) => handleChange("short_description", e.target.value)}
//                     placeholder="e.g. Step-by-step blueprint to build, launch & monetize your app"
//                 />
//             </div>

//             <div className="pf-field">
//                 <div className="pf-lbl">
//                     <span>
//                         Short description<span className="pf-req">*</span>
//                     </span>
//                     <CharCount val={form.description || ""} max={200} />
//                 </div>
//                 <textarea
//                     className="pf-ta"
//                     rows={4}
//                     value={form.description || ""}
//                     maxLength={200}
//                     onChange={(e) => handleChange("description", e.target.value)}
//                     placeholder="A complete guide to validate, build and launch your app…"
//                 />
//             </div>

//             <div className="pf-field">
//                 <div className="pf-lbl">
//                     <span>
//                         Category<span className="pf-req">*</span>
//                     </span>
//                 </div>
//                 <div className="pf-sel-wrap">
//                     <select
//                         className="pf-sel"
//                         value={form.category_id}
//                         onChange={(e) => handleChange("category_id", e.target.value)}
//                     >
//                         <option value="">Select a category…</option>
//                         {cats.map((c) => (
//                             <option key={c.id} value={c.id}>
//                                 {c.name}
//                             </option>
//                         ))}
//                     </select>
//                     <span className="pf-sel-arrow">
//                         <ChevronDown size={14} />
//                     </span>
//                 </div>
//             </div>

//             <div className="pf-field">
//                 <div className="pf-lbl">
//                     <span>Tags</span>
//                 </div>
//                 <TagInput value={form.tags} onChange={(v) => handleChange("tags", v)} />
//                 <p
//                     style={{
//                         fontSize: 10.5,
//                         color: "var(--pf-text-muted)",
//                         marginTop: 5,
//                     }}
//                 >
//                     Press Enter or comma to add a tag
//                 </p>
//             </div>

//             <hr className="pf-divider" />

//             <div className="pf-sec-header">
//                 <div>
//                     <p className="pf-sec-title">Media</p>
//                     <p className="pf-sec-desc">Upload images and a preview video</p>
//                 </div>
//             </div>
//             <div className="pf-media-row">
//                 <div className="pf-upload-cover">
//                     <Upload size={22} color="var(--pf-text-muted)" />
//                     <span className="pf-upload-cover-label">Upload cover</span>
//                     <span className="pf-upload-cover-hint">
//                         PNG, JPG or WEBP
//                         <br />
//                         Recommended 1280×720
//                     </span>
//                 </div>
//                 <div
//                     style={{
//                         display: "flex",
//                         flexWrap: "wrap",
//                         gap: 7,
//                         alignItems: "flex-start",
//                     }}
//                 >
//                     <div className="pf-upload-sm">
//                         <ImageIcon size={18} />
//                         <span>Gallery</span>
//                     </div>
//                     <div className="pf-upload-sm">
//                         <Play size={18} />
//                         <span>Teaser</span>
//                     </div>
//                 </div>
//             </div>

//             <hr className="pf-divider" />

//             <div className="pf-sec-header">
//                 <div>
//                     <p className="pf-sec-title">Product URL</p>
//                     <p className="pf-sec-desc">Customize your product's permalink</p>
//                 </div>
//             </div>
//             <div className="pf-ig">
//                 <span className="pf-ig-pre">/product/</span>
//                 <input
//                     className="pf-inp"
//                     type="text"
//                     value={form.slug}
//                     onChange={(e) => handleChange("slug", e.target.value)}
//                     placeholder="my-product-name"
//                     style={{ fontFamily: "monospace", fontSize: 12 }}
//                 />
//             </div>
//         </div>
//     );
// }

// /* ─── STEP 2 ─────────────────────────────────── */
// function StepPricing({
//     form,
//     handleChange,
// }: {
//     form: FormState;
//     handleChange: (field: string, value: unknown) => void;
// }) {
//     const isFree = parseFloat(form.price) === 0;

//     return (
//         <div>
//             <div className="pf-sec-header">
//                 <div>
//                     <p className="pf-sec-title">Pricing model</p>
//                     <p className="pf-sec-desc">Set how customers will pay for your product</p>
//                 </div>
//             </div>

//             <div className="pf-opt-grid" style={{ marginBottom: 20 }}>
//                 {[
//                     { id: "free", label: "Free", hint: "No charge to access" },
//                     { id: "paid", label: "Paid", hint: "Charge customers" },
//                 ].map((opt) => {
//                     const sel = opt.id === "free" ? isFree : !isFree;
//                     return (
//                         <div
//                             key={opt.id}
//                             className={`pf-opt-card${sel ? " is-sel" : ""}`}
//                             onClick={() =>
//                                 handleChange("price", opt.id === "free" ? "0" : "9.99")
//                             }
//                         >
//                             <div className="pf-opt-top">
//                                 <span className="pf-opt-label">{opt.label}</span>
//                                 {sel && (
//                                     <span className="pf-opt-check">
//                                         <Check size={15} />
//                                     </span>
//                                 )}
//                             </div>
//                             <span className="pf-opt-hint">{opt.hint}</span>
//                         </div>
//                     );
//                 })}
//             </div>

//             {!isFree && (
//                 <div>
//                     <div className="pf-g3" style={{ marginBottom: 20 }}>
//                         <div>
//                             <div className="pf-lbl">
//                                 <span>Currency</span>
//                             </div>
//                             <div className="pf-sel-wrap">
//                                 <select
//                                     className="pf-sel"
//                                     value={form.currency}
//                                     onChange={(e) => handleChange("currency", e.target.value)}
//                                 >
//                                     <option value="USD">USD – $</option>
//                                     <option value="EUR">EUR – €</option>
//                                     <option value="GBP">GBP – £</option>
//                                 </select>
//                                 <span className="pf-sel-arrow">
//                                     <ChevronDown size={14} />
//                                 </span>
//                             </div>
//                         </div>
//                         <div className="pf-span2">
//                             <div className="pf-lbl">
//                                 <span>Price</span>
//                             </div>
//                             <input
//                                 className="pf-inp"
//                                 type="number"
//                                 value={form.price}
//                                 min={0}
//                                 step="0.01"
//                                 onChange={(e) => handleChange("price", e.target.value)}
//                                 style={{
//                                     fontWeight: 700,
//                                     fontSize: 18,
//                                     letterSpacing: "-0.02em",
//                                 }}
//                             />
//                         </div>
//                     </div>

//                     <hr className="pf-divider" style={{ margin: "18px 0" }} />

//                     <div className="pf-field">
//                         <p
//                             style={{
//                                 fontSize: 10.5,
//                                 fontWeight: 700,
//                                 color: "var(--pf-text-muted)",
//                                 letterSpacing: "0.08em",
//                                 marginBottom: 10,
//                                 textTransform: "uppercase",
//                             }}
//                         >
//                             Billing type
//                         </p>
//                         <div className="pf-bill-grid">
//                             {[
//                                 { id: "one_time", label: "One-time payment" },
//                                 { id: "recurring", label: "Recurring subscription" },
//                             ].map((opt) => (
//                                 <button
//                                     key={opt.id}
//                                     className={`pf-bill-btn${form.pricing_type === opt.id ? " is-active" : ""
//                                         }`}
//                                     onClick={() => handleChange("pricing_type", opt.id)}
//                                 >
//                                     {opt.label}
//                                 </button>
//                             ))}
//                         </div>
//                     </div>

//                     {form.pricing_type === "recurring" && (
//                         <div className="pf-field">
//                             <p
//                                 style={{
//                                     fontSize: 10.5,
//                                     fontWeight: 700,
//                                     color: "var(--pf-text-muted)",
//                                     letterSpacing: "0.08em",
//                                     marginBottom: 10,
//                                     textTransform: "uppercase",
//                                 }}
//                             >
//                                 Billing period
//                             </p>
//                             <div className="pf-pills">
//                                 {BILLING_PERIODS.map((p) => (
//                                     <button
//                                         key={p.id}
//                                         className={`pf-pill${form.billing_period === p.id ? " is-active" : ""
//                                             }`}
//                                         onClick={() => handleChange("billing_period", p.id)}
//                                     >
//                                         {p.label}
//                                     </button>
//                                 ))}
//                             </div>
//                         </div>
//                     )}
//                 </div>
//             )}

//             <hr className="pf-divider" />

//             <div className="pf-sec-header">
//                 <div>
//                     <p className="pf-sec-title">Affiliate program</p>
//                     <p className="pf-sec-desc">Let others earn by promoting your product</p>
//                 </div>
//             </div>
//             <div
//                 style={{
//                     display: "flex",
//                     alignItems: "center",
//                     justifyContent: "space-between",
//                     marginBottom: form.affiliate_enabled ? 16 : 0,
//                 }}
//             >
//                 <span
//                     style={{
//                         fontSize: 13,
//                         fontWeight: 500,
//                         color: "var(--pf-text-primary)",
//                     }}
//                 >
//                     Enable affiliate program
//                 </span>
//                 <Toggle
//                     checked={form.affiliate_enabled}
//                     onChange={(v) => handleChange("affiliate_enabled", v)}
//                 />
//             </div>
//             {form.affiliate_enabled && (
//                 <div
//                     style={{
//                         paddingTop: 14,
//                         borderTop: "1px solid var(--pf-border)",
//                     }}
//                 >
//                     <div className="pf-field">
//                         <div className="pf-lbl">
//                             <span>Commission rate</span>
//                         </div>
//                         <div style={{ position: "relative" }}>
//                             <input
//                                 className="pf-inp"
//                                 type="number"
//                                 value={form.affiliate_commission_rate}
//                                 min="1"
//                                 max="100"
//                                 onChange={(e) =>
//                                     handleChange("affiliate_commission_rate", e.target.value)
//                                 }
//                                 style={{ paddingRight: 36 }}
//                             />
//                             <span
//                                 style={{
//                                     position: "absolute",
//                                     right: 12,
//                                     top: "50%",
//                                     transform: "translateY(-50%)",
//                                     fontSize: 14,
//                                     fontWeight: 600,
//                                     color: "var(--pf-text-muted)",
//                                 }}
//                             >
//                                 %
//                             </span>
//                         </div>
//                     </div>
//                     <div className="pf-info-box">
//                         Affiliates earn{" "}
//                         <strong>{form.affiliate_commission_rate || 10}%</strong> per sale —
//                         approx.{" "}
//                         <strong>
//                             $
//                             {(
//                                 ((parseFloat(form.price) || 0) *
//                                     (parseFloat(form.affiliate_commission_rate) || 10)) /
//                                 100
//                             ).toFixed(2)}
//                         </strong>{" "}
//                         per conversion
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }

// /* ─── STEP 3 ─────────────────────────────────── */
// function StepSettings({
//     form,
//     handleChange,
// }: {
//     form: FormState;
//     handleChange: (field: string, value: unknown) => void;
// }) {
//     return (
//         <div>
//             <div className="pf-sec-header">
//                 <div>
//                     <p className="pf-sec-title">Call-to-action</p>
//                     <p className="pf-sec-desc">The text shown on your buy button</p>
//                 </div>
//             </div>
//             <div className="pf-field">
//                 <div className="pf-lbl">
//                     <span>Button label</span>
//                 </div>
//                 <input
//                     className="pf-inp"
//                     type="text"
//                     value={form.button_text}
//                     onChange={(e) => handleChange("button_text", e.target.value)}
//                     placeholder="e.g. Join now"
//                 />
//             </div>
//             <div className="pf-pills">
//                 {BUTTON_TEXTS.map((txt) => (
//                     <button
//                         key={txt}
//                         className={`pf-pill${form.button_text === txt ? " is-active" : ""}`}
//                         onClick={() => handleChange("button_text", txt)}
//                     >
//                         {txt}
//                     </button>
//                 ))}
//             </div>

//             <hr className="pf-divider" />

//             <div className="pf-sec-header">
//                 <div>
//                     <p className="pf-sec-title">Fulfillment</p>
//                     <p className="pf-sec-desc">How is this product delivered to customers</p>
//                 </div>
//             </div>
//             <div className="pf-opt-grid" style={{ marginBottom: 16 }}>
//                 {[
//                     {
//                         id: "physical",
//                         label: "Physical",
//                         Icon: Package,
//                         hint: "Ships to customer",
//                     },
//                     {
//                         id: "digital",
//                         label: "Digital",
//                         Icon: Globe,
//                         hint: "Instant access / download",
//                     },
//                 ].map((type) => {
//                     const sel = form.product_type === type.id;
//                     return (
//                         <div
//                             key={type.id}
//                             className={`pf-ful-card${sel ? " is-sel" : ""}`}
//                             onClick={() => handleChange("product_type", type.id)}
//                         >
//                             <div className="pf-ful-icon">
//                                 <type.Icon size={17} />
//                             </div>
//                             <div>
//                                 <p className="pf-ful-label">{type.label}</p>
//                                 <p className="pf-ful-hint">{type.hint}</p>
//                             </div>
//                         </div>
//                     );
//                 })}
//             </div>

//             {form.product_type === "physical" && (
//                 <div>
//                     <div className="pf-inv-card" style={{ marginBottom: 12 }}>
//                         <div>
//                             <p className="pf-inv-label">Track inventory</p>
//                             <p className="pf-inv-hint">Auto-reduce stock on purchase</p>
//                         </div>
//                         <Toggle
//                             checked={form.track_inventory}
//                             onChange={(v) => handleChange("track_inventory", v)}
//                         />
//                     </div>
//                     <div className="pf-g3">
//                         <div>
//                             <div className="pf-lbl">
//                                 <span>Stock qty</span>
//                             </div>
//                             <input
//                                 className="pf-inp"
//                                 type="number"
//                                 value={form.inventory_quantity}
//                                 disabled={!form.track_inventory}
//                                 onChange={(e) =>
//                                     handleChange("inventory_quantity", e.target.value)
//                                 }
//                                 placeholder="0"
//                             />
//                         </div>
//                         <div>
//                             <div className="pf-lbl">
//                                 <span>Weight (kg)</span>
//                             </div>
//                             <input
//                                 className="pf-inp"
//                                 type="number"
//                                 step="0.01"
//                                 value={form.weight}
//                                 onChange={(e) => handleChange("weight", e.target.value)}
//                                 placeholder="0.00"
//                             />
//                         </div>
//                         <div>
//                             <div className="pf-lbl">
//                                 <span>Dimensions</span>
//                             </div>
//                             <input
//                                 className="pf-inp"
//                                 type="text"
//                                 value={form.dimensions}
//                                 onChange={(e) => handleChange("dimensions", e.target.value)}
//                                 placeholder="L×W×H"
//                             />
//                         </div>
//                     </div>
//                 </div>
//             )}

//             {form.product_type === "digital" && (
//                 <div>
//                     {form.digital_file_url ? (
//                         <div className="pf-file-attached">
//                             <Check size={16} color="var(--pf-success)" />
//                             <span className="pf-file-name">{form.digital_file_url}</span>
//                             <button
//                                 className="pf-file-rm"
//                                 onClick={() => handleChange("digital_file_url", "")}
//                             >
//                                 <X size={16} />
//                             </button>
//                         </div>
//                     ) : null}
//                     <div className="pf-lbl">
//                         <span>File URL or hosted link</span>
//                     </div>
//                     <div style={{ position: "relative" }}>
//                         <input
//                             className="pf-inp"
//                             type="text"
//                             placeholder="https://your-cdn.com/file.zip"
//                             value={form.digital_file_url}
//                             onChange={(e) => handleChange("digital_file_url", e.target.value)}
//                             style={{ fontFamily: "monospace", fontSize: 12, paddingLeft: 36 }}
//                         />
//                         <span
//                             style={{
//                                 position: "absolute",
//                                 left: 12,
//                                 top: "50%",
//                                 transform: "translateY(-50%)",
//                                 color: "var(--pf-text-muted)",
//                             }}
//                         >
//                             <Link size={13} />
//                         </span>
//                     </div>
//                 </div>
//             )}

//             <hr className="pf-divider" />

//             <div className="pf-sec-header">
//                 <div>
//                     <p className="pf-sec-title">Visibility</p>
//                     <p className="pf-sec-desc">
//                         Control how this product appears in your store
//                     </p>
//                 </div>
//             </div>
//             <div className="pf-vis-card">
//                 <div>
//                     <p
//                         style={{
//                             fontSize: 13,
//                             fontWeight: 500,
//                             color: "var(--pf-text-primary)",
//                         }}
//                     >
//                         Feature in store showcase
//                     </p>
//                     <p
//                         style={{
//                             fontSize: 11.5,
//                             color: "var(--pf-text-muted)",
//                             marginTop: 3,
//                         }}
//                     >
//                         Pin this product to the top of your store
//                     </p>
//                 </div>
//                 <Toggle
//                     checked={form.is_featured}
//                     onChange={(v) => handleChange("is_featured", v)}
//                 />
//             </div>
//         </div>
//     );
// }

// /* ─── STEP 4 ─────────────────────────────────── */
// function StepPublish({
//     form,
//     isPending,
//     handleSubmit,
// }: {
//     form: FormState;
//     isPending: boolean;
//     handleSubmit: () => void;
// }) {
//     const price = parseFloat(form.price) || 0;
//     const checks = [
//         { label: "Product name added", done: !!form.name.trim() },
//         { label: "Headline written", done: !!form.short_description.trim() },
//         { label: "Category selected", done: !!form.category_id },
//         { label: "Pricing configured", done: true },
//         {
//             label: "Fulfillment set up",
//             done: form.product_type === "physical" || !!form.digital_file_url,
//         },
//     ];
//     const allDone = checks.every((c) => c.done);

//     return (
//         <div>
//             <div className="pf-sec-header">
//                 <div>
//                     <p className="pf-sec-title">Pre-launch checklist</p>
//                     <p className="pf-sec-desc">
//                         Everything needs to be green before publishing
//                     </p>
//                 </div>
//             </div>
//             <div className="pf-chk-list">
//                 {checks.map((item) => (
//                     <div
//                         key={item.label}
//                         className={`pf-chk-item${item.done ? " done" : " todo"}`}
//                     >
//                         <span className="pf-chk-icon">
//                             {item.done ? (
//                                 <Check size={15} />
//                             ) : (
//                                 <Circle size={15} />
//                             )}
//                         </span>
//                         <span style={{ flex: 1 }}>{item.label}</span>
//                         {!item.done && <span className="pf-chk-req">Required</span>}
//                     </div>
//                 ))}
//             </div>

//             <hr className="pf-divider" />

//             <div className="pf-sec-header">
//                 <div>
//                     <p className="pf-sec-title">Summary</p>
//                     <p className="pf-sec-desc">Review before going live</p>
//                 </div>
//             </div>
//             <div className="pf-sum-tbl">
//                 {[
//                     { k: "Name", v: form.name || "—" },
//                     {
//                         k: "Price",
//                         v:
//                             price === 0 ? "Free" : `$${price.toFixed(2)} ${form.currency}`,
//                     },
//                     {
//                         k: "Billing",
//                         v:
//                             price === 0
//                                 ? "—"
//                                 : form.pricing_type === "recurring"
//                                     ? `Recurring · ${form.billing_period}`
//                                     : "One-time",
//                     },
//                     {
//                         k: "Fulfillment",
//                         v: form.product_type === "digital" ? "Digital" : "Physical",
//                     },
//                     { k: "Status on publish", v: "Active" },
//                 ].map((row) => (
//                     <div key={row.k} className="pf-sum-row">
//                         <span className="pf-sum-k">{row.k}</span>
//                         <span className="pf-sum-v">{row.v}</span>
//                     </div>
//                 ))}
//             </div>

//             <button
//                 className="pf-pub-big"
//                 onClick={handleSubmit}
//                 disabled={isPending || !allDone}
//             >
//                 <Zap size={16} />
//                 {isPending
//                     ? "Publishing…"
//                     : allDone
//                         ? "Publish product"
//                         : "Complete checklist to publish"}
//             </button>
//             <p className="pf-pub-note">
//                 {allDone
//                     ? "Your product will go live immediately after publishing"
//                     : "Complete all required fields above"}
//             </p>
//         </div>
//     );
// }

// /* ─── MAIN COMPONENT ─────────────────────────── */
// export default function ProductForm() {
//     const [step, setStep] = useState(1);
//     const [isPending, setIsPending] = useState(false);
//     const [error, setError] = useState<string | null>(null);
//     const [success, setSuccess] = useState(false);

//     const [form, setForm] = useState<FormState>({
//         name: "",
//         slug: "",
//         short_description: "",
//         description: "",
//         product_type: "digital",
//         product_subtype: "course",
//         price: "29.99",
//         currency: "USD",
//         category_id: "",
//         pricing_type: "recurring",
//         billing_period: "monthly",
//         digital_file_url: "",
//         track_inventory: true,
//         inventory_quantity: "0",
//         affiliate_enabled: false,
//         affiliate_commission_rate: "10",
//         is_featured: false,
//         status: "draft",
//         button_text: "Join now",
//         tags: "",
//         weight: "",
//         dimensions: "",
//         images: [],
//         custom_domain: false,
//         show_author: true,
//         show_reviews: true,
//         enable_discussions: false,
//     });

//     function handleChange(field: string, value: unknown) {
//         setForm((prev) => {
//             const u = { ...prev, [field]: value };
//             if (field === "name") u.slug = slugify(value as string);
//             if (field === "product_type" && value !== "digital")
//                 u.pricing_type = "one_time";
//             return u;
//         });
//     }

//     async function handleSubmit() {
//         setError(null);
//         if (!form.name.trim()) {
//             setError("Product name is required.");
//             return;
//         }
//         setIsPending(true);
//         await new Promise((r) => setTimeout(r, 1400));
//         setIsPending(false);
//         setSuccess(true);
//     }

//     if (success)
//         return (
//             <>
//                 <style>{css}</style>
//                 <div className="pf-root">
//                     <div className="pf-success">
//                         <div className="pf-success-icon">
//                             <Check size={26} />
//                         </div>
//                         <div style={{ textAlign: "center" }}>
//                             <p className="pf-success-title">Product published!</p>
//                             <p className="pf-success-sub">
//                                 Your product is now live in your store
//                             </p>
//                         </div>
//                     </div>
//                 </div>
//             </>
//         );

//     const nextStep = STEPS.find((s) => s.id === step + 1);

//     return (
//         <>
//             <style>{css}</style>
//             <div className="pf-root">
//                 {/* Top bar */}
//                 <div className="pf-tb">
//                     <div className="pf-tb-left">
//                         <button
//                             className="pf-tb-back"
//                             onClick={() => step > 1 && setStep(step - 1)}
//                         >
//                             <ArrowLeft size={15} />
//                         </button>
//                         <div>
//                             <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                                 <span className="pf-tb-title">Create product</span>
//                                 <span className="pf-tb-badge">Draft</span>
//                             </div>
//                         </div>
//                     </div>

//                     <div className="pf-tb-steps">
//                         {STEPS.map((s, i) => (
//                             <span
//                                 key={s.id}
//                                 style={{ display: "flex", alignItems: "center", gap: 0 }}
//                             >
//                                 <button
//                                     className={`pf-tb-step-btn${step === s.id
//                                         ? " is-active"
//                                         : s.id < step
//                                             ? " is-done"
//                                             : ""
//                                         }`}
//                                     onClick={() => setStep(s.id)}
//                                 >
//                                     <span
//                                         className={`pf-tb-step-num${step === s.id
//                                             ? " is-active"
//                                             : s.id < step
//                                                 ? " is-done"
//                                                 : ""
//                                             }`}
//                                     >
//                                         {s.id < step ? <Check size={8} /> : s.id}
//                                     </span>
//                                     {s.label}
//                                 </button>
//                                 {i < STEPS.length - 1 && (
//                                     <span className="pf-tb-sep">
//                                         <ChevronRight size={12} />
//                                     </span>
//                                 )}
//                             </span>
//                         ))}
//                     </div>

//                     <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
//                         {nextStep ? (
//                             <button
//                                 className="pf-btn-next"
//                                 onClick={() => setStep(step + 1)}
//                             >
//                                 Next: {nextStep.label}
//                                 <ChevronRight size={14} />
//                             </button>
//                         ) : (
//                             <button
//                                 className="pf-btn-publish"
//                                 onClick={handleSubmit}
//                                 disabled={isPending}
//                             >
//                                 <Zap size={14} />
//                                 {isPending ? "Publishing…" : "Publish"}
//                             </button>
//                         )}
//                     </div>
//                 </div>

//                 {/* Error */}
//                 {error && (
//                     <div className="pf-err">
//                         <AlertTriangle size={15} />
//                         {error}
//                         <button className="pf-err-close" onClick={() => setError(null)}>
//                             <X size={16} />
//                         </button>
//                     </div>
//                 )}

//                 {/* Layout */}
//                 <div className="pf-layout">
//                     {/* Form */}
//                     <div className="pf-fc">
//                         <div className="pf-fc-body">
//                             {step === 1 && (
//                                 <StepDetails form={form} handleChange={handleChange} />
//                             )}
//                             {step === 2 && (
//                                 <StepPricing form={form} handleChange={handleChange} />
//                             )}
//                             {step === 3 && (
//                                 <StepSettings form={form} handleChange={handleChange} />
//                             )}
//                             {step === 4 && (
//                                 <StepPublish
//                                     form={form}
//                                     isPending={isPending}
//                                     handleSubmit={handleSubmit}
//                                 />
//                             )}
//                         </div>

//                         <div className="pf-fc-footer">
//                             <button
//                                 className="pf-back-btn"
//                                 disabled={step === 1}
//                                 onClick={() => setStep((s) => Math.max(1, s - 1))}
//                             >
//                                 <ArrowLeft size={12} />
//                                 Back
//                             </button>
//                             <div className="pf-dots">
//                                 {STEPS.map((s) => (
//                                     <div
//                                         key={s.id}
//                                         className={`pf-dot${step === s.id
//                                             ? " is-active"
//                                             : s.id < step
//                                                 ? " is-done"
//                                                 : " is-future"
//                                             }`}
//                                         onClick={() => setStep(s.id)}
//                                     />
//                                 ))}
//                             </div>
//                             {nextStep ? (
//                                 <button
//                                     className="pf-btn-next"
//                                     style={{ borderRadius: 999 }}
//                                     onClick={() => setStep((s) => Math.min(4, s + 1))}
//                                 >
//                                     Next <ChevronRight size={14} />
//                                 </button>
//                             ) : (
//                                 <button
//                                     className="pf-btn-publish"
//                                     onClick={handleSubmit}
//                                     disabled={isPending}
//                                 >
//                                     <Zap size={14} />
//                                     {isPending ? "…" : "Publish"}
//                                 </button>
//                             )}
//                         </div>
//                     </div>

//                     {/* Preview */}
//                     <LivePreview form={form} />

//                     {/* Sidebar */}
//                     <RightSidebar form={form} handleChange={handleChange} />
//                 </div>
//             </div>
//         </>
//     );
// }

// "use client";
// export const dynamic = "force-dynamic";

// import React, { useState, useEffect, useTransition } from "react";
// import { useRouter } from "next/navigation";
// import {
//     ArrowLeft, DollarSign, Loader2, CheckCircle2,
//     ShoppingBag, Globe, Upload, AlertTriangle,
//     X, Image as ImageIcon, Zap, ChevronRight,
//     Sparkles, BookOpen, Target, FileText,
//     Monitor, LayoutTemplate, Users, Package,
//     Lock, Search, Clock, Check, Circle, Link as LinkIcon,
//     ChevronDown,
// } from "lucide-react";
// import { createClient } from "@/lib/supabase/client";
// import NextLink from "next/link";
// import { CloudinaryUploadButton, CloudinaryDropzone } from "@/components/ui/cloudinary-upload";
// import { CloudinaryImage } from "@/components/ui/cloudinary-image";
// import { cn } from "@/lib/utils";

// /* ── helpers ── */
// function slugify(text: string) {
//     return text.toLowerCase()
//         .replace(/[^\w\s-]/g, "")
//         .replace(/[\s_-]+/g, "-")
//         .replace(/^-+|-+$/g, "");
// }

// /* ── constants ── */
// const STEPS = [
//     { id: 1, label: "Details" },
//     { id: 2, label: "Pricing" },
//     { id: 3, label: "Settings" },
//     { id: 4, label: "Publish" },
// ];

// const BILLING_PERIODS = [
//     { id: "weekly", label: "Weekly" },
//     { id: "monthly", label: "Monthly" },
//     { id: "quarterly", label: "Quarterly" },
//     { id: "yearly", label: "Yearly" },
// ];

// const BUTTON_TEXTS = ["Buy Now", "Get Access", "Order Now", "Purchase", "Download", "Subscribe", "Join now"];

// const PRODUCT_SUBTYPES = [
//     { id: "course", label: "Course", Icon: BookOpen },
//     { id: "coaching", label: "Coaching", Icon: Target },
//     { id: "ebook", label: "E-book", Icon: FileText },
//     { id: "software", label: "Software", Icon: Monitor },
//     { id: "templates", label: "Templates", Icon: LayoutTemplate },
//     { id: "community", label: "Community", Icon: Users },
//     { id: "bundle", label: "Bundle", Icon: Package },
// ];

// /* ── form state ── */
// interface FormState {
//     name: string;
//     slug: string;
//     short_description: string;
//     description: string;
//     product_type: "physical" | "digital";
//     product_subtype: string;
//     price: string;
//     currency: string;
//     category_id: string;
//     is_digital: boolean;
//     pricing_type: "one_time" | "recurring";
//     billing_period: string;
//     digital_file_url: string;
//     track_inventory: boolean;
//     inventory_quantity: string;
//     affiliate_enabled: boolean;
//     affiliate_commission_rate: string;
//     is_featured: boolean;
//     button_text: string;
//     tags: string;
//     weight: string;
//     dimensions: string;
//     images: string[];
//     show_author: boolean;
//     show_reviews: boolean;
//     enable_discussions: boolean;
// }

// /* ── reusable primitives — all using CSS variables from globals.css ── */

// function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
//     return (
//         <div className="flex items-center justify-between mb-1.5">
//             <span className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>{children}</span>
//             {hint && <span className="text-[10px]" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>{hint}</span>}
//         </div>
//     );
// }

// function Input({ className, style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
//     return (
//         <input
//             className={cn(
//                 "w-full h-10 px-3 text-sm transition-all outline-none",
//                 "disabled:opacity-40 disabled:cursor-not-allowed",
//                 "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none",
//                 className,
//             )}
//             style={{
//                 borderRadius: "var(--radius-sm)",
//                 border: "1px solid var(--color-border)",
//                 background: "var(--color-surface)",
//                 color: "var(--color-text-primary)",
//                 ...style,
//             }}
//             onFocus={e => {
//                 e.currentTarget.style.borderColor = "var(--color-accent)";
//                 e.currentTarget.style.boxShadow = "var(--shadow-glow)";
//             }}
//             onBlur={e => {
//                 e.currentTarget.style.borderColor = "var(--color-border)";
//                 e.currentTarget.style.boxShadow = "none";
//             }}
//             {...props}
//         />
//     );
// }

// function Textarea({ className, style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
//     return (
//         <textarea
//             className={cn("w-full px-3 py-2.5 text-sm transition-all outline-none resize-vertical leading-relaxed", className)}
//             style={{
//                 borderRadius: "var(--radius-sm)",
//                 border: "1px solid var(--color-border)",
//                 background: "var(--color-surface)",
//                 color: "var(--color-text-primary)",
//                 ...style,
//             }}
//             onFocus={e => {
//                 e.currentTarget.style.borderColor = "var(--color-accent)";
//                 e.currentTarget.style.boxShadow = "var(--shadow-glow)";
//             }}
//             onBlur={e => {
//                 e.currentTarget.style.borderColor = "var(--color-border)";
//                 e.currentTarget.style.boxShadow = "none";
//             }}
//             {...props}
//         />
//     );
// }

// function Select({ className, children, style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
//     return (
//         <div className="relative">
//             <select
//                 className={cn("w-full h-10 pl-3 pr-8 text-sm appearance-none transition-all outline-none", className)}
//                 style={{
//                     borderRadius: "var(--radius-sm)",
//                     border: "1px solid var(--color-border)",
//                     background: "var(--color-surface)",
//                     color: "var(--color-text-primary)",
//                     ...style,
//                 }}
//                 {...props}
//             >
//                 {children}
//             </select>
//             <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--color-text-muted)" }} />
//         </div>
//     );
// }

// function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
//     return (
//         <button
//             type="button"
//             role="switch"
//             aria-checked={checked}
//             onClick={() => onChange(!checked)}
//             className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 outline-none"
//             style={{ background: checked ? "var(--color-accent)" : "var(--color-border-strong)" }}
//         >
//             <span
//                 className="inline-block h-3.5 w-3.5 mt-[3px] rounded-full bg-white shadow-sm transition-transform duration-200"
//                 style={{ transform: checked ? "translateX(18px)" : "translateX(3px)" }}
//             />
//         </button>
//     );
// }

// function ToggleRow({ title, description, checked, onChange }: {
//     title: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
// }) {
//     return (
//         <div className="flex items-center justify-between gap-4 py-3 border-b last:border-b-0" style={{ borderColor: "var(--color-border)" }}>
//             <div>
//                 <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{title}</p>
//                 {description && <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{description}</p>}
//             </div>
//             <Toggle checked={checked} onChange={onChange} />
//         </div>
//     );
// }

// function Card({ children, className }: { children: React.ReactNode; className?: string }) {
//     return (
//         <div
//             className={cn("overflow-hidden", className)}
//             style={{
//                 borderRadius: "var(--radius-lg)",
//                 border: "1px solid var(--color-border)",
//                 background: "var(--color-surface)",
//                 boxShadow: "var(--shadow-sm)",
//             }}
//         >
//             {children}
//         </div>
//     );
// }

// function CardHeader({ children }: { children: React.ReactNode }) {
//     return (
//         <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
//             {children}
//         </div>
//     );
// }

// function Divider() {
//     return <div className="my-6" style={{ borderTop: "1px solid var(--color-border)" }} />;
// }

// function SectionTitle({ label }: { label: string }) {
//     return <h3 className="text-sm font-semibold mb-5" style={{ color: "var(--color-text-primary)" }}>{label}</h3>;
// }

// function TagInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
//     const [inp, setInp] = useState("");
//     const tags = value ? value.split(",").map(t => t.trim()).filter(Boolean) : [];
//     const add = (t: string) => {
//         const tr = t.trim();
//         if (!tr || tags.includes(tr)) return;
//         onChange([...tags, tr].join(", "));
//         setInp("");
//     };
//     const rm = (i: number) => onChange(tags.filter((_, idx) => idx !== i).join(", "));
//     return (
//         <div
//             className="flex flex-wrap gap-1.5 min-h-[40px] p-2 transition-all"
//             style={{
//                 borderRadius: "var(--radius-sm)",
//                 border: "1px solid var(--color-border)",
//                 background: "var(--color-surface)",
//             }}
//             onFocusCapture={e => (e.currentTarget.style.borderColor = "var(--color-accent)")}
//             onBlurCapture={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
//         >
//             {tags.map((t, i) => (
//                 <span
//                     key={t}
//                     className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
//                     style={{
//                         borderRadius: "var(--radius-full)",
//                         background: "var(--color-accent-light)",
//                         border: "1px solid var(--color-accent-subtle)",
//                         color: "var(--color-accent)",
//                     }}
//                 >
//                     {t}
//                     <button onClick={() => rm(i)} style={{ color: "var(--color-accent)", opacity: 0.6 }} className="hover:opacity-100 transition-opacity"><X size={9} /></button>
//                 </span>
//             ))}
//             <input
//                 className="flex-1 min-w-[80px] text-xs bg-transparent outline-none h-6"
//                 style={{ color: "var(--color-text-primary)" }}
//                 placeholder={tags.length === 0 ? "Add a tag…" : ""}
//                 value={inp}
//                 onChange={e => setInp(e.target.value)}
//                 onKeyDown={e => {
//                     if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(inp); }
//                     if (e.key === "Backspace" && !inp && tags.length) rm(tags.length - 1);
//                 }}
//                 onBlur={() => { if (inp) add(inp); }}
//             />
//         </div>
//     );
// }

// /* ── live preview ── */
// function LivePreview({ form }: { form: FormState }) {
//     const price = parseFloat(form.price) || 0;
//     const isFree = price === 0;
//     const tags = form.tags ? form.tags.split(",").slice(0, 4).map(t => t.trim()).filter(Boolean) : [];
//     return (
//         <Card className="sticky top-[72px]">
//             <CardHeader>
//                 <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>Preview</span>
//                 <span
//                     className="text-[10px] font-medium px-2 py-0.5"
//                     style={{
//                         borderRadius: "var(--radius-full)",
//                         background: "var(--color-surface-secondary)",
//                         border: "1px solid var(--color-border)",
//                         color: "var(--color-text-muted)",
//                     }}
//                 >
//                     Buyer view
//                 </span>
//             </CardHeader>
//             <div className="p-4">
//                 {/* cover placeholder */}
//                 <div
//                     className="w-full aspect-video flex items-center justify-center mb-3"
//                     style={{
//                         borderRadius: "var(--radius-md)",
//                         border: "1px solid var(--color-border)",
//                         background: "var(--color-surface-secondary)",
//                     }}
//                 >
//                     <div className="flex flex-col items-center gap-1" style={{ color: "var(--color-border-strong)" }}>
//                         <ImageIcon size={24} />
//                         <span className="text-[10px]">Cover image</span>
//                     </div>
//                 </div>

//                 {/* social proof */}
//                 <div className="flex items-center gap-1.5 mb-2">
//                     <div className="flex">
//                         {["#fecaca", "#fed7aa", "#e9d5ff"].map((c, i) => (
//                             <div key={i} className="w-4 h-4 rounded-full border-2 -mr-1" style={{ background: c, borderColor: "var(--color-surface)" }} />
//                         ))}
//                     </div>
//                     <span className="text-[11px]" style={{ color: "var(--color-text-muted)" }}>2.8k+ students</span>
//                     <span className="text-[11px] ml-auto" style={{ color: "var(--color-text-muted)" }}>★ 4.9</span>
//                 </div>

//                 {/* name */}
//                 <p
//                     className="text-sm font-bold leading-snug mb-1"
//                     style={{ color: form.name ? "var(--color-text-primary)" : "var(--color-border-strong)", fontStyle: form.name ? "normal" : "italic", fontWeight: form.name ? 700 : 400 }}
//                 >
//                     {form.name || "Your product name"}
//                 </p>

//                 {form.short_description && (
//                     <p className="text-[11px] mb-2 leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{form.short_description}</p>
//                 )}

//                 {/* price */}
//                 <p className="text-xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
//                     {isFree ? "Free" : `$${price.toFixed(2)}`}
//                     {!isFree && form.pricing_type === "recurring" && (
//                         <span className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}> / {form.billing_period}</span>
//                     )}
//                 </p>

//                 {/* CTA */}
//                 <button
//                     className="w-full py-2 text-xs font-semibold text-white cursor-default"
//                     style={{ borderRadius: "var(--radius-sm)", background: "var(--color-accent)" }}
//                 >
//                     {form.button_text || "Buy Now"}
//                 </button>

//                 {/* tags */}
//                 {tags.length > 0 && (
//                     <div className="flex flex-wrap gap-1 mt-3">
//                         {tags.map((t, i) => (
//                             <span
//                                 key={i}
//                                 className="text-[10px] px-2 py-0.5"
//                                 style={{
//                                     borderRadius: "var(--radius-full)",
//                                     background: "var(--color-accent-light)",
//                                     border: "1px solid var(--color-accent-subtle)",
//                                     color: "var(--color-accent)",
//                                 }}
//                             >
//                                 {t}
//                             </span>
//                         ))}
//                     </div>
//                 )}

//                 {form.name && (
//                     <>
//                         <div className="my-3" style={{ borderTop: "1px solid var(--color-border)" }} />
//                         <div className="flex justify-between text-xs">
//                             <span style={{ color: "var(--color-text-muted)" }}>Type</span>
//                             <span className="font-medium capitalize" style={{ color: "var(--color-text-secondary)" }}>{form.product_type}</span>
//                         </div>
//                     </>
//                 )}
//             </div>
//         </Card>
//     );
// }

// /* ── right sidebar ── */
// function RightSidebar({ form, handleChange }: { form: FormState; handleChange: (f: string, v: unknown) => void }) {
//     const advItems = [
//         { label: "Drip content", Icon: Clock },
//         { label: "Access rules", Icon: Lock },
//         { label: "Localisation", Icon: Globe },
//         { label: "SEO settings", Icon: Search },
//     ];
//     return (
//         <div className="space-y-3 sticky top-[72px]">
//             {/* product subtype */}
//             <Card>
//                 <CardHeader>
//                     <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Product subtype</p>
//                 </CardHeader>
//                 <div className="p-1.5">
//                     {PRODUCT_SUBTYPES.map(type => {
//                         const sel = form.product_subtype === type.id;
//                         return (
//                             <button
//                                 key={type.id}
//                                 onClick={() => handleChange("product_subtype", type.id)}
//                                 className="w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors"
//                                 style={{
//                                     borderRadius: "var(--radius-sm)",
//                                     background: sel ? "var(--color-accent-light)" : "transparent",
//                                     color: sel ? "var(--color-accent)" : "var(--color-text-muted)",
//                                 }}
//                                 onMouseEnter={e => { if (!sel) e.currentTarget.style.background = "var(--color-surface-secondary)"; }}
//                                 onMouseLeave={e => { if (!sel) e.currentTarget.style.background = "transparent"; }}
//                             >
//                                 <div
//                                     className="w-6 h-6 flex items-center justify-center flex-shrink-0"
//                                     style={{
//                                         borderRadius: "var(--radius-sm)",
//                                         border: "1px solid",
//                                         borderColor: sel ? "var(--color-accent-subtle)" : "var(--color-border)",
//                                         background: sel ? "var(--color-accent-subtle)" : "var(--color-surface-secondary)",
//                                         color: sel ? "var(--color-accent)" : "var(--color-text-muted)",
//                                     }}
//                                 >
//                                     <type.Icon size={12} />
//                                 </div>
//                                 <span className="text-xs font-medium flex-1">{type.label}</span>
//                                 {sel && <Check size={12} />}
//                             </button>
//                         );
//                     })}
//                 </div>
//             </Card>

//             {/* sales page toggles */}
//             <Card>
//                 <CardHeader>
//                     <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Sales page</p>
//                 </CardHeader>
//                 <div className="px-4 py-1">
//                     <ToggleRow title="Show author bio" checked={form.show_author} onChange={v => handleChange("show_author", v)} />
//                     <ToggleRow title="Show reviews" checked={form.show_reviews} onChange={v => handleChange("show_reviews", v)} />
//                     <ToggleRow title="Discussions" checked={form.enable_discussions} onChange={v => handleChange("enable_discussions", v)} />
//                 </div>
//             </Card>

//             {/* advanced */}
//             <Card>
//                 <CardHeader>
//                     <p className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>Advanced</p>
//                 </CardHeader>
//                 {advItems.map(item => (
//                     <button
//                         key={item.label}
//                         className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs transition-colors border-b last:border-b-0"
//                         style={{ color: "var(--color-text-secondary)", borderColor: "var(--color-border)" }}
//                         onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-secondary)")}
//                         onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
//                     >
//                         <item.Icon size={13} style={{ color: "var(--color-text-muted)" }} />
//                         <span>{item.label}</span>
//                         <ChevronRight size={14} className="ml-auto" style={{ color: "var(--color-border-strong)" }} />
//                     </button>
//                 ))}
//             </Card>
//         </div>
//     );
// }

// /* ── STEP 1: Details ── */
// function StepDetails({
//     form, handleChange, categories, handleImageUpload, removeImage,
// }: {
//     form: FormState;
//     handleChange: (f: string, v: unknown) => void;
//     categories: any[];
//     handleImageUpload: (url: string) => void;
//     removeImage: (i: number) => void;
// }) {
//     const filteredCategories = categories.filter(c => {
//         const ct = c.category_type;
//         if (form.product_type === "digital") return ct === "digital";
//         return ct === "physical" || ct === "both" || !ct;
//     });

//     return (
//         <div className="space-y-6">
//             {/* basic info */}
//             <div>
//                 <div className="flex items-start justify-between mb-5">
//                     <SectionTitle label="Basic information" />
//                     <button
//                         className="flex items-center gap-1.5 px-3 h-7 text-xs transition-all"
//                         style={{
//                             borderRadius: "var(--radius-full)",
//                             border: "1px solid var(--color-border)",
//                             color: "var(--color-text-muted)",
//                         }}
//                         onMouseEnter={e => {
//                             e.currentTarget.style.borderColor = "var(--color-accent)";
//                             e.currentTarget.style.color = "var(--color-accent)";
//                         }}
//                         onMouseLeave={e => {
//                             e.currentTarget.style.borderColor = "var(--color-border)";
//                             e.currentTarget.style.color = "var(--color-text-muted)";
//                         }}
//                     >
//                         <Sparkles size={11} /> AI assist
//                     </button>
//                 </div>

//                 <div className="space-y-4">
//                     <div>
//                         <Label hint={`${form.name.length}/80`}>Product name <span style={{ color: "var(--color-accent)" }}>*</span></Label>
//                         <Input value={form.name} maxLength={80} onChange={e => handleChange("name", e.target.value)} placeholder="e.g. How to Build a Viral App: 0 to $100k/mo" />
//                     </div>
//                     <div>
//                         <Label hint="Auto-generated from name">URL slug</Label>
//                         <div className="flex">
//                             <span
//                                 className="flex items-center px-3 h-10 text-[11px] font-mono whitespace-nowrap flex-shrink-0"
//                                 style={{
//                                     borderRadius: "var(--radius-sm) 0 0 var(--radius-sm)",
//                                     border: "1px solid var(--color-border)",
//                                     borderRight: "none",
//                                     background: "var(--color-surface-secondary)",
//                                     color: "var(--color-text-muted)",
//                                 }}
//                             >
//                                 /product/
//                             </span>
//                             <Input
//                                 value={form.slug}
//                                 onChange={e => handleChange("slug", e.target.value)}
//                                 className="font-mono text-xs"
//                                 style={{ borderRadius: "0 var(--radius-sm) var(--radius-sm) 0" }}
//                                 placeholder="my-product-name"
//                             />
//                         </div>
//                     </div>
//                     <div>
//                         <Label hint={`${form.short_description.length}/80`}>Headline <span style={{ color: "var(--color-accent)" }}>*</span></Label>
//                         <Input value={form.short_description} maxLength={80} onChange={e => handleChange("short_description", e.target.value)} placeholder="Step-by-step blueprint to build, launch & monetize" />
//                     </div>
//                     <div>
//                         <Label hint={`${(form.description || "").length}/500`}>Full description</Label>
//                         <Textarea value={form.description || ""} maxLength={500} rows={5} onChange={e => handleChange("description", e.target.value)} placeholder="Describe your product in detail — features, what's included…" />
//                     </div>
//                     <div>
//                         <Label>Category <span style={{ color: "var(--color-accent)" }}>*</span></Label>
//                         <Select value={form.category_id} onChange={e => handleChange("category_id", e.target.value)}>
//                             <option value="">Select a category…</option>
//                             {filteredCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
//                             <option value="">Uncategorized</option>
//                         </Select>
//                     </div>
//                     <div>
//                         <Label>Tags</Label>
//                         <TagInput value={form.tags} onChange={v => handleChange("tags", v)} />
//                         <p className="text-[10px] mt-1" style={{ color: "var(--color-text-muted)" }}>Press Enter or comma to add</p>
//                     </div>
//                 </div>
//             </div>

//             <Divider />

//             {/* product type & fulfillment — first so clients know what they're creating */}
//             <div>
//                 <SectionTitle label="Product type" />
//                 <div className="grid grid-cols-2 gap-3 mb-5">
//                     {[
//                         { id: "physical", label: "Physical", Icon: ShoppingBag, hint: "Ships to customer" },
//                         { id: "digital", label: "Digital", Icon: Globe, hint: "Instant download / access" },
//                     ].map(type => {
//                         const sel = form.product_type === type.id;
//                         return (
//                             <button
//                                 key={type.id}
//                                 onClick={() => handleChange("product_type", type.id)}
//                                 className="flex items-center gap-3 p-3.5 text-left transition-all"
//                                 style={{
//                                     borderRadius: "var(--radius-md)",
//                                     border: `1px solid ${sel ? "var(--color-accent)" : "var(--color-border)"}`,
//                                     background: sel ? "var(--color-accent-light)" : "var(--color-surface-secondary)",
//                                 }}
//                             >
//                                 <div
//                                     className="w-9 h-9 flex items-center justify-center flex-shrink-0"
//                                     style={{
//                                         borderRadius: "var(--radius-sm)",
//                                         background: sel ? "var(--color-accent)" : "var(--color-surface)",
//                                         color: sel ? "#fff" : "var(--color-text-muted)",
//                                     }}
//                                 >
//                                     <type.Icon size={16} />
//                                 </div>
//                                 <div>
//                                     <p className="text-sm font-semibold" style={{ color: sel ? "var(--color-accent)" : "var(--color-text-primary)" }}>{type.label}</p>
//                                     <p className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{type.hint}</p>
//                                 </div>
//                             </button>
//                         );
//                     })}
//                 </div>
//             </div>

//             <Divider />

//             {/* media */}
//             <div>
//                 <SectionTitle label="Media" />
//                 <div
//                     className="p-8 text-center transition-colors cursor-pointer"
//                     style={{
//                         borderRadius: "var(--radius-md)",
//                         border: "2px dashed var(--color-border)",
//                     }}
//                     onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--color-border-strong)")}
//                     onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--color-border)")}
//                 >
//                     <CloudinaryDropzone
//                         folder="jimvio/products"
//                         onUploadSuccess={handleImageUpload}
//                         label={
//                             <div className="flex flex-col items-center gap-2">
//                                 <div
//                                     className="w-10 h-10 flex items-center justify-center"
//                                     style={{ borderRadius: "var(--radius-sm)", background: "var(--color-surface-secondary)" }}
//                                 >
//                                     <ImageIcon size={16} style={{ color: "var(--color-text-muted)" }} />
//                                 </div>
//                                 <div>
//                                     <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Drop images here or click to upload</p>
//                                     <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)", opacity: 0.6 }}>JPG, PNG, WEBP — max 10MB</p>
//                                 </div>
//                             </div>
//                         }
//                     />
//                 </div>
//                 {form.images.length > 0 && (
//                     <div className="grid grid-cols-4 gap-3 mt-4">
//                         {form.images.map((url, i) => (
//                             <div
//                                 key={url}
//                                 className="relative aspect-square overflow-hidden group"
//                                 style={{
//                                     borderRadius: "var(--radius-md)",
//                                     border: "1px solid var(--color-border)",
//                                     background: "var(--color-surface-secondary)",
//                                 }}
//                             >
//                                 <CloudinaryImage src={url} alt={`Image ${i + 1}`} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
//                                 {i === 0 && (
//                                     <div className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 text-[9px] font-semibold text-white uppercase" style={{ borderRadius: "4px" }}>Main</div>
//                                 )}
//                                 <button
//                                     onClick={() => removeImage(i)}
//                                     className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/80"
//                                     style={{ borderRadius: "var(--radius-sm)" }}
//                                 >
//                                     <X size={11} />
//                                 </button>
//                             </div>
//                         ))}
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }

// /* ── STEP 2: Pricing ── */
// function StepPricing({ form, handleChange }: { form: FormState; handleChange: (f: string, v: unknown) => void }) {
//     const isFree = parseFloat(form.price) === 0;
//     return (
//         <div className="space-y-6">
//             <div>
//                 <SectionTitle label="Pricing model" />
//                 <div className="grid grid-cols-2 gap-3 mb-5">
//                     {[
//                         { id: "free", label: "Free", hint: "No charge to access" },
//                         { id: "paid", label: "Paid", hint: "Charge customers" },
//                     ].map(opt => {
//                         const sel = opt.id === "free" ? isFree : !isFree;
//                         return (
//                             <button
//                                 key={opt.id}
//                                 onClick={() => handleChange("price", opt.id === "free" ? "0" : "9.99")}
//                                 className="flex flex-col gap-1 p-4 text-left transition-all"
//                                 style={{
//                                     borderRadius: "var(--radius-md)",
//                                     border: `1px solid ${sel ? "var(--color-accent)" : "var(--color-border)"}`,
//                                     background: sel ? "var(--color-accent-light)" : "var(--color-surface-secondary)",
//                                 }}
//                             >
//                                 <div className="flex items-center justify-between">
//                                     <span className="text-sm font-semibold" style={{ color: sel ? "var(--color-accent)" : "var(--color-text-primary)" }}>{opt.label}</span>
//                                     {sel && <Check size={14} style={{ color: "var(--color-accent)" }} />}
//                                 </div>
//                                 <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{opt.hint}</span>
//                             </button>
//                         );
//                     })}
//                 </div>

//                 {!isFree && (
//                     <div className="space-y-4">
//                         <div className="grid grid-cols-3 gap-3">
//                             <div>
//                                 <Label>Currency</Label>
//                                 <Select value={form.currency} onChange={e => handleChange("currency", e.target.value)}>
//                                     <option value="USD">USD – $</option>
//                                     <option value="EUR">EUR – €</option>
//                                     <option value="GBP">GBP – £</option>
//                                 </Select>
//                             </div>
//                             <div className="col-span-2">
//                                 <Label>Price</Label>
//                                 <div className="relative">
//                                     <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
//                                     <Input type="number" value={form.price} onChange={e => handleChange("price", e.target.value)} className="pl-8 font-semibold text-base" min={0} step="0.01" />
//                                 </div>
//                             </div>
//                         </div>

//                         {form.product_type === "digital" && (
//                             <div className="space-y-3">
//                                 <Label>Billing type</Label>
//                                 <div className="grid grid-cols-2 gap-2">
//                                     {[
//                                         { id: "one_time", label: "One-time payment" },
//                                         { id: "recurring", label: "Recurring subscription" },
//                                     ].map(opt => (
//                                         <button
//                                             key={opt.id}
//                                             onClick={() => handleChange("pricing_type", opt.id)}
//                                             className="h-10 text-xs font-medium transition-all"
//                                             style={{
//                                                 borderRadius: "var(--radius-sm)",
//                                                 border: `1px solid ${form.pricing_type === opt.id ? "var(--color-accent)" : "var(--color-border)"}`,
//                                                 background: form.pricing_type === opt.id ? "var(--color-accent-light)" : "var(--color-surface-secondary)",
//                                                 color: form.pricing_type === opt.id ? "var(--color-accent)" : "var(--color-text-secondary)",
//                                             }}
//                                         >
//                                             {opt.label}
//                                         </button>
//                                     ))}
//                                 </div>
//                                 {form.pricing_type === "recurring" && (
//                                     <div>
//                                         <Label>Billing period</Label>
//                                         <div className="flex flex-wrap gap-2">
//                                             {BILLING_PERIODS.map(p => (
//                                                 <button
//                                                     key={p.id}
//                                                     onClick={() => handleChange("billing_period", p.id)}
//                                                     className="px-4 h-8 text-[11px] font-semibold uppercase tracking-wide transition-all"
//                                                     style={{
//                                                         borderRadius: "var(--radius-full)",
//                                                         border: "1px solid",
//                                                         borderColor: form.billing_period === p.id ? "var(--color-accent)" : "var(--color-border)",
//                                                         background: form.billing_period === p.id ? "var(--color-accent)" : "transparent",
//                                                         color: form.billing_period === p.id ? "#fff" : "var(--color-text-muted)",
//                                                     }}
//                                                 >
//                                                     {p.label}
//                                                 </button>
//                                             ))}
//                                         </div>
//                                     </div>
//                                 )}
//                             </div>
//                         )}
//                     </div>
//                 )}
//             </div>

//             <Divider />

//             {/* affiliate */}
//             <div>
//                 <div className="flex items-start justify-between mb-1">
//                     <div>
//                         <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>Affiliate program</p>
//                         <p className="text-xs mt-0.5 mb-4" style={{ color: "var(--color-text-muted)" }}>Let others earn by promoting your product</p>
//                     </div>
//                     <Toggle checked={form.affiliate_enabled} onChange={v => handleChange("affiliate_enabled", v)} />
//                 </div>
//                 {form.affiliate_enabled && (
//                     <div className="space-y-3 pt-4" style={{ borderTop: "1px solid var(--color-border)" }}>
//                         <div>
//                             <Label hint="% of sale price">Commission rate</Label>
//                             <div className="relative">
//                                 <Input type="number" value={form.affiliate_commission_rate} onChange={e => handleChange("affiliate_commission_rate", e.target.value)} className="pr-8 font-mono" min="1" max="100" />
//                                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-mono" style={{ color: "var(--color-text-muted)" }}>%</span>
//                             </div>
//                         </div>
//                         <div
//                             className="p-3.5 text-xs leading-relaxed"
//                             style={{
//                                 borderRadius: "var(--radius-md)",
//                                 border: "1px solid var(--color-accent-subtle)",
//                                 background: "var(--color-accent-light)",
//                                 color: "var(--color-accent)",
//                             }}
//                         >
//                             Affiliates earn <strong>{form.affiliate_commission_rate || 10}%</strong> per sale — approx. <strong>${((parseFloat(form.price) || 0) * (parseFloat(form.affiliate_commission_rate) || 10) / 100).toFixed(2)}</strong> per conversion
//                         </div>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }

// /* ── STEP 3: Settings ── */
// function StepSettings({ form, handleChange }: { form: FormState; handleChange: (f: string, v: unknown) => void }) {
//     return (
//         <div className="space-y-6">
//             <div>
//                 <SectionTitle label="Call-to-action button" />
//                 <div className="space-y-3">
//                     <div>
//                         <Label>Button label</Label>
//                         <Input value={form.button_text} onChange={e => handleChange("button_text", e.target.value)} placeholder="e.g. Buy Now" />
//                     </div>
//                     <div className="flex flex-wrap gap-1.5">
//                         {BUTTON_TEXTS.map(txt => {
//                             const sel = form.button_text === txt;
//                             return (
//                                 <button
//                                     key={txt}
//                                     onClick={() => handleChange("button_text", txt)}
//                                     className="px-3 py-1 text-[11px] font-medium transition-all"
//                                     style={{
//                                         borderRadius: "var(--radius-sm)",
//                                         border: "1px solid",
//                                         borderColor: sel ? "var(--color-accent)" : "var(--color-border)",
//                                         background: sel ? "var(--color-accent-light)" : "transparent",
//                                         color: sel ? "var(--color-accent)" : "var(--color-text-muted)",
//                                     }}
//                                 >
//                                     {txt}
//                                 </button>
//                             );
//                         })}
//                     </div>
//                 </div>
//             </div>
//             <Divider />
//             <div>
//                 <SectionTitle label="fulfilment" />
//                 {/* physical fields */}
//                 {form.product_type === "physical" && (
//                     <div className="space-y-4">
//                         <div
//                             className="flex items-center justify-between p-3.5"
//                             style={{
//                                 borderRadius: "var(--radius-md)",
//                                 border: "1px solid var(--color-border)",
//                                 background: "var(--color-surface-secondary)",
//                             }}
//                         >
//                             <div>
//                                 <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Track inventory</p>
//                                 <p className="text-[11px] mt-0.5" style={{ color: "var(--color-text-muted)" }}>Auto-reduce stock on purchase</p>
//                             </div>
//                             <Toggle checked={form.track_inventory} onChange={v => handleChange("track_inventory", v)} />
//                         </div>
//                         <div className="grid grid-cols-3 gap-3">
//                             <div>
//                                 <Label>Stock quantity</Label>
//                                 <Input type="number" value={form.inventory_quantity} onChange={e => handleChange("inventory_quantity", e.target.value)} disabled={!form.track_inventory} placeholder="0" />
//                             </div>
//                             <div>
//                                 <Label hint="kg">Weight</Label>
//                                 <Input type="number" step="0.01" value={form.weight} onChange={e => handleChange("weight", e.target.value)} placeholder="0.00" />
//                             </div>
//                             <div>
//                                 <Label hint="L×W×H">Dimensions</Label>
//                                 <Input value={form.dimensions} onChange={e => handleChange("dimensions", e.target.value)} placeholder="10×10×5 cm" />
//                             </div>
//                         </div>
//                     </div>
//                 )}

//                 {/* digital fields */}
//                 {form.product_type === "digital" && (
//                     <div className="space-y-3">
//                         <div
//                             className="p-4"
//                             style={{
//                                 borderRadius: "var(--radius-md)",
//                                 border: "1px solid var(--color-border)",
//                                 background: "var(--color-surface-secondary)",
//                             }}
//                         >
//                             <div className="flex items-center gap-2 mb-3">
//                                 <Upload size={14} style={{ color: "var(--color-text-muted)" }} />
//                                 <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Digital file</p>
//                             </div>
//                             {form.digital_file_url ? (
//                                 <div
//                                     className="flex items-center gap-2 p-2.5"
//                                     style={{
//                                         borderRadius: "var(--radius-sm)",
//                                         border: "1px solid var(--color-success)",
//                                         background: "var(--color-success-light)",
//                                     }}
//                                 >
//                                     <CheckCircle2 size={14} style={{ color: "var(--color-success)", flexShrink: 0 }} />
//                                     <p className="text-xs font-mono flex-1 truncate" style={{ color: "var(--color-text-secondary)" }}>{form.digital_file_url}</p>
//                                     <button onClick={() => handleChange("digital_file_url", "")} style={{ color: "var(--color-danger)" }}>
//                                         <X size={13} />
//                                     </button>
//                                 </div>
//                             ) : (
//                                 <CloudinaryUploadButton
//                                     folder="jimvio/digital-files"
//                                     resourceType="raw"
//                                     onUploadSuccess={url => handleChange("digital_file_url", url)}
//                                     className="px-4 h-8 text-xs font-medium transition-all"
//                                 // style={{
//                                 //     borderRadius: "var(--radius-sm)",
//                                 //     border: "1px solid var(--color-border)",
//                                 //     background: "var(--color-surface)",
//                                 //     color: "var(--color-text-secondary)",
//                                 // } as React.CSSProperties}
//                                 />
//                             )}
//                         </div>
//                         <div>
//                             <Label hint="Or paste a direct URL">Manual file URL</Label>
//                             <div className="relative">
//                                 <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
//                                 <Input placeholder="https://your-cdn.com/file.zip" value={form.digital_file_url} onChange={e => handleChange("digital_file_url", e.target.value)} className="pl-8 font-mono text-xs" />
//                             </div>
//                         </div>
//                     </div>
//                 )}
//             </div>

//             <Divider />

//             <div>
//                 <SectionTitle label="Visibility" />
//                 <div
//                     className="flex items-center justify-between p-4"
//                     style={{
//                         borderRadius: "var(--radius-md)",
//                         border: "1px solid var(--color-border)",
//                         background: "var(--color-surface-secondary)",
//                     }}
//                 >
//                     <div>
//                         <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>Feature in store showcase</p>
//                         <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>Pin this product to the top of your store</p>
//                     </div>
//                     <Toggle checked={form.is_featured} onChange={v => handleChange("is_featured", v)} />
//                 </div>
//             </div>
//         </div>
//     );
// }

// /* ── STEP 4: Publish ── */
// function StepPublish({ form, isPending, handleSubmit }: { form: FormState; isPending: boolean; handleSubmit: () => void }) {
//     const price = parseFloat(form.price) || 0;
//     const checks = [
//         { label: "Product name added", done: !!form.name.trim() },
//         { label: "Headline written", done: !!form.short_description.trim() },
//         { label: "Category selected", done: !!form.category_id },
//         { label: "Pricing configured", done: true },
//         { label: "Fulfilment set up", done: form.product_type === "physical" || !!form.digital_file_url },
//     ];
//     const allDone = checks.every(c => c.done);
//     return (
//         <div className="space-y-6">
//             <div>
//                 <SectionTitle label="Pre-launch checklist" />
//                 <div className="space-y-2">
//                     {checks.map(item => (
//                         <div
//                             key={item.label}
//                             className="flex items-center gap-3 px-4 py-3 text-sm"
//                             style={{
//                                 borderRadius: "var(--radius-md)",
//                                 border: `1px solid ${item.done ? "var(--color-success)" : "var(--color-border)"}`,
//                                 background: item.done ? "var(--color-success-light)" : "var(--color-surface-secondary)",
//                                 color: item.done ? "var(--color-success)" : "var(--color-text-muted)",
//                             }}
//                         >
//                             {item.done ? <Check size={15} /> : <Circle size={15} />}
//                             <span className="flex-1">{item.label}</span>
//                             {!item.done && (
//                                 <span
//                                     className="text-[10px] font-semibold px-2 py-0.5"
//                                     style={{
//                                         borderRadius: "var(--radius-full)",
//                                         background: "var(--color-accent-light)",
//                                         border: "1px solid var(--color-accent-subtle)",
//                                         color: "var(--color-accent)",
//                                     }}
//                                 >
//                                     Required
//                                 </span>
//                             )}
//                         </div>
//                     ))}
//                 </div>
//             </div>

//             <Divider />

//             <div>
//                 <SectionTitle label="Summary" />
//                 <div
//                     className="overflow-hidden"
//                     style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}
//                 >
//                     {[
//                         { k: "Name", v: form.name || "—" },
//                         { k: "Price", v: price === 0 ? "Free" : `$${price.toFixed(2)} ${form.currency}` },
//                         { k: "Billing", v: price === 0 ? "—" : form.pricing_type === "recurring" ? `Recurring · ${form.billing_period}` : "One-time" },
//                         { k: "Fulfilment", v: form.product_type === "digital" ? "Digital" : "Physical" },
//                         { k: "Status on publish", v: "Active" },
//                     ].map(row => (
//                         <div key={row.k} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0" style={{ borderColor: "var(--color-border)" }}>
//                             <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{row.k}</span>
//                             <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{row.v}</span>
//                         </div>
//                     ))}
//                 </div>
//             </div>

//             <button
//                 onClick={handleSubmit}
//                 disabled={isPending || !allDone}
//                 className="w-full sr-only h-12 text-sm font-semibold flex items-center justify-center gap-2 text-white transition-all active:scale-[0.98]"
//                 style={{
//                     borderRadius: "var(--radius-lg)",
//                     background: isPending || !allDone ? "var(--color-border-strong)" : "var(--color-accent)",
//                     cursor: isPending || !allDone ? "not-allowed" : "pointer",
//                     boxShadow: !isPending && allDone ? "var(--shadow-glow)" : "none",
//                 }}
//             >
//                 {isPending ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
//                 {isPending ? "Publishing…" : allDone ? "Publish product" : "Complete checklist to publish"}
//             </button>
//             <p className="text-[11px] text-center" style={{ color: "var(--color-text-muted)" }}>
//                 {allDone ? "Your product will go live immediately after publishing" : "Complete all required fields above"}
//             </p>
//         </div>
//     );
// }

// /* ── main ── */
// export default function NewProductPage() {
//     const router = useRouter();
//     const [isPending, startTransition] = useTransition();
//     const [step, setStep] = useState(1);
//     const [vendor, setVendor] = useState<any>(null);
//     const [categories, setCategories] = useState<any[]>([]);
//     const [error, setError] = useState<string | null>(null);
//     const [success, setSuccess] = useState(false);

//     const [form, setForm] = useState<FormState>({
//         name: "", slug: "", short_description: "", description: "",
//         product_type: "digital", product_subtype: "course",
//         price: "29.99", currency: "USD", category_id: "",
//         is_digital: true,
//         pricing_type: "recurring", billing_period: "monthly",
//         digital_file_url: "", track_inventory: true, inventory_quantity: "0",
//         affiliate_enabled: false, affiliate_commission_rate: "10",
//         is_featured: false,
//         button_text: "Join now", tags: "",
//         weight: "", dimensions: "", images: [],
//         show_author: true, show_reviews: true, enable_discussions: false,
//     });

//     useEffect(() => {
//         async function load() {
//             const supabase = createClient();
//             const { data: { user } } = await supabase.auth.getUser();
//             if (!user) { router.push("/login"); return; }
//             const { data: vends } = await supabase.from("vendors").select("*").eq("user_id", user.id);
//             if (!vends || vends.length === 0) { router.push("/dashboard/activate/vendor"); return; }
//             setVendor(vends[0]);
//             const { data: cats } = await supabase
//                 .from("product_categories")
//                 .select("id, name, slug, category_type")
//                 .eq("is_active", true)
//                 .order("sort_order");
//             setCategories(cats ?? []);
//         }
//         load();
//     }, [router]);

//     function handleChange(field: string, value: unknown) {
//         setForm(prev => {
//             const updated = { ...prev, [field]: value };
//             if (field === "name") updated.slug = slugify(value as string);
//             if (field === "product_type") {
//                 const isDigital = value === "digital";
//                 updated.is_digital = isDigital;
//                 if (!isDigital) updated.pricing_type = "one_time";
//                 const currentCat = categories.find(c => c.id === updated.category_id);
//                 if (currentCat) {
//                     const ct = currentCat.category_type;
//                     if (isDigital && ct === "physical") updated.category_id = "";
//                     if (!isDigital && ct === "digital") updated.category_id = "";
//                 }
//             }
//             return updated;
//         });
//     }

//     function handleImageUpload(url: string) {
//         setForm(prev => ({ ...prev, images: [...prev.images, url] }));
//     }
//     function removeImage(index: number) {
//         setForm(prev => { const next = [...prev.images]; next.splice(index, 1); return { ...prev, images: next }; });
//     }

//     async function handleSubmit() {
//         setError(null);
//         if (!vendor || !form.name.trim()) { setError("Product name is required."); return; }
//         const price = parseFloat(form.price) || 0;
//         if (price < 0) { setError("Price cannot be negative."); return; }

//         startTransition(async () => {
//             const supabase = createClient();
//             let slug = form.slug || slugify(form.name);
//             const { data: existing } = await supabase.from("products").select("id").eq("slug", slug).single();
//             if (existing) slug = `${slug}-${Date.now()}`;

//             const payload = {
//                 vendor_id: vendor.id,
//                 name: form.name,
//                 slug,
//                 short_description: form.short_description || null,
//                 description: form.description || null,
//                 product_type: form.product_type,
//                 status: "active",
//                 price,
//                 currency: form.currency,
//                 pricing_type: form.pricing_type,
//                 billing_period: form.pricing_type === "recurring" ? form.billing_period : null,
//                 category_id: form.category_id || null,
//                 is_digital: form.is_digital,
//                 digital_file_url: form.is_digital ? (form.digital_file_url || null) : null,
//                 track_inventory: !form.is_digital && form.track_inventory,
//                 inventory_quantity: form.is_digital ? 0 : parseInt(form.inventory_quantity || "0"),
//                 weight: !form.is_digital ? (parseFloat(form.weight) || null) : null,
//                 dimensions: !form.is_digital ? (form.dimensions || null) : null,
//                 affiliate_enabled: form.affiliate_enabled,
//                 affiliate_commission_rate: form.affiliate_enabled ? parseFloat(form.affiliate_commission_rate || "10") : null,
//                 is_featured: form.is_featured,
//                 button_text: form.button_text || null,
//                 tags: form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : null,
//                 images: form.images,
//             };

//             const { error: insertErr } = await supabase.from("products").insert(payload);
//             if (insertErr) { setError(insertErr.message); }
//             else { setSuccess(true); setTimeout(() => router.push("/dashboard/products"), 1800); }
//         });
//     }

//     /* success */
//     if (success) return (
//         <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ background: "var(--color-bg)" }}>
//             <div
//                 className="w-16 h-16 flex items-center justify-center"
//                 style={{
//                     borderRadius: "var(--radius-lg)",
//                     border: "1px solid var(--color-success)",
//                     background: "var(--color-success-light)",
//                 }}
//             >
//                 <CheckCircle2 className="w-7 h-7" style={{ color: "var(--color-success)" }} />
//             </div>
//             <div className="text-center">
//                 <p className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>Product published!</p>
//                 <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>Redirecting to your products…</p>
//             </div>
//         </div>
//     );

//     const nextStep = STEPS.find(s => s.id === step + 1);

//     return (
//         <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>

//             {/* sticky top bar */}
//             <div
//                 className="sticky top-0 z-40 backdrop-blur"
//                 style={{
//                     background: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
//                     borderBottom: "1px solid var(--color-border)",
//                 }}
//             >
//                 <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[60px] flex items-center gap-4">

//                     {/* left */}
//                     <div className="flex items-center gap-3 flex-1 min-w-0">
//                         <NextLink
//                             href="/dashboard/products"
//                             className="w-8 h-8 flex items-center justify-center transition-all"
//                             style={{
//                                 borderRadius: "var(--radius-sm)",
//                                 border: "1px solid var(--color-border)",
//                                 background: "var(--color-surface)",
//                                 color: "var(--color-text-muted)",
//                             }}
//                             onMouseEnter={e => {
//                                 e.currentTarget.style.borderColor = "var(--color-border-strong)";
//                                 e.currentTarget.style.color = "var(--color-text-primary)";
//                             }}
//                             onMouseLeave={e => {
//                                 e.currentTarget.style.borderColor = "var(--color-border)";
//                                 e.currentTarget.style.color = "var(--color-text-muted)";
//                             }}
//                         >
//                             <ArrowLeft size={14} />
//                         </NextLink>
//                         <div className="flex items-center gap-1.5 text-xs min-w-0" style={{ color: "var(--color-text-muted)" }}>
//                             <span>Products</span>
//                             <span>/</span>
//                             <span className="font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{form.name || "New product"}</span>
//                         </div>
//                     </div>

//                     {/* center: steps */}
//                     <div className="hidden md:flex items-center gap-0.5">
//                         {STEPS.map((s, i) => (
//                             <React.Fragment key={s.id}>
//                                 <button
//                                     onClick={() => setStep(s.id)}
//                                     className="flex items-center gap-2 px-3 h-8 text-xs font-medium transition-all"
//                                     style={{
//                                         borderRadius: "var(--radius-sm)",
//                                         border: step === s.id ? "1px solid var(--color-border)" : "1px solid transparent",
//                                         background: step === s.id ? "var(--color-surface-secondary)" : "transparent",
//                                         color: step === s.id ? "var(--color-text-primary)" : s.id < step ? "var(--color-text-secondary)" : "var(--color-border-strong)",
//                                     }}
//                                 >
//                                     <span
//                                         className="w-[18px] h-[18px] rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
//                                         style={{
//                                             background: step === s.id ? "var(--color-accent)" : s.id < step ? "var(--color-success-light)" : "var(--color-surface-secondary)",
//                                             border: `1px solid ${step === s.id ? "var(--color-accent)" : s.id < step ? "var(--color-success)" : "var(--color-border)"}`,
//                                             color: step === s.id ? "#fff" : s.id < step ? "var(--color-success)" : "var(--color-text-muted)",
//                                         }}
//                                     >
//                                         {s.id < step ? <Check size={8} /> : s.id}
//                                     </span>
//                                     {s.label}
//                                 </button>
//                                 {i < STEPS.length - 1 && <ChevronRight size={12} className="mx-0.5" style={{ color: "var(--color-border-strong)" }} />}
//                             </React.Fragment>
//                         ))}
//                     </div>

//                     {/* right */}
//                     <div className="flex items-center gap-2 flex-shrink-0">
//                         <button
//                             onClick={() => router.push("/dashboard/products")}
//                             className="hidden sm:flex h-8 px-4 text-xs items-center font-medium transition-all"
//                             style={{
//                                 borderRadius: "var(--radius-sm)",
//                                 border: "1px solid var(--color-border)",
//                                 color: "var(--color-text-muted)",
//                                 background: "transparent",
//                             }}
//                             onMouseEnter={e => (e.currentTarget.style.color = "var(--color-text-primary)")}
//                             onMouseLeave={e => (e.currentTarget.style.color = "var(--color-text-muted)")}
//                         >
//                             Discard
//                         </button>
//                         {nextStep ? (
//                             <button
//                                 onClick={() => setStep(step + 1)}
//                                 className="flex items-center gap-1.5 h-8 px-4 text-xs font-semibold text-white transition-all"
//                                 style={{
//                                     borderRadius: "var(--radius-sm)",
//                                     background: "var(--color-text-primary)",
//                                 }}
//                                 onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
//                                 onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
//                             >
//                                 Next: {nextStep.label} <ChevronRight size={13} />
//                             </button>
//                         ) : (
//                             <button
//                                 onClick={handleSubmit}
//                                 disabled={isPending}
//                                 className="flex items-center gap-1.5 h-8 px-4 text-xs font-semibold text-white transition-all disabled:opacity-60"
//                                 style={{
//                                     borderRadius: "var(--radius-sm)",
//                                     background: "var(--color-accent)",
//                                     boxShadow: "var(--shadow-glow)",
//                                 }}
//                             >
//                                 {isPending ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
//                                 {isPending ? "Publishing…" : "Publish"}
//                             </button>
//                         )}
//                     </div>
//                 </div>
//             </div>

//             {/* error banner */}
//             {error && (
//                 <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-4">
//                     <div
//                         className="flex items-start gap-3 p-4"
//                         style={{
//                             borderRadius: "var(--radius-lg)",
//                             border: "1px solid var(--color-danger)",
//                             background: "var(--color-danger-light)",
//                         }}
//                     >
//                         <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" style={{ color: "var(--color-danger)" }} />
//                         <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>
//                         <button onClick={() => setError(null)} className="ml-auto" style={{ color: "var(--color-danger)" }}>
//                             <X size={15} />
//                         </button>
//                     </div>
//                 </div>
//             )}

//             {/* main layout */}
//             <div className="max-w-7xl mx-auto px-4 py-6">
//                 <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px_220px] gap-5">

//                     {/* form card */}
//                     <Card className="overflow-hidden">
//                         <div className="p-6 sm:p-8">
//                             {step === 1 && <StepDetails form={form} handleChange={handleChange} categories={categories} handleImageUpload={handleImageUpload} removeImage={removeImage} />}
//                             {step === 2 && <StepPricing form={form} handleChange={handleChange} />}
//                             {step === 3 && <StepSettings form={form} handleChange={handleChange} />}
//                             {step === 4 && <StepPublish form={form} isPending={isPending} handleSubmit={handleSubmit} />}
//                         </div>

//                         {/* footer */}
//                         <div
//                             className="flex items-center justify-between px-6 sm:px-8 py-4"
//                             style={{ borderTop: "1px solid var(--color-border)" }}
//                         >
//                             <button
//                                 disabled={step === 1}
//                                 onClick={() => setStep(s => Math.max(1, s - 1))}
//                                 className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed"
//                                 style={{
//                                     borderRadius: "var(--radius-full)",
//                                     border: "1px solid var(--color-border)",
//                                     color: "var(--color-text-muted)",
//                                     background: "transparent",
//                                 }}
//                             >
//                                 <ArrowLeft size={12} /> Back
//                             </button>

//                             {/* progress dots */}
//                             <div className="flex items-center gap-1.5">
//                                 {STEPS.map(s => (
//                                     <button
//                                         key={s.id}
//                                         onClick={() => setStep(s.id)}
//                                         className="h-[5px] rounded-full transition-all duration-300"
//                                         style={{
//                                             width: step === s.id ? "20px" : "5px",
//                                             background: step === s.id ? "var(--color-accent)" : s.id < step ? "var(--color-success)" : "var(--color-border-strong)",
//                                             opacity: s.id < step ? 0.5 : 1,
//                                         }}
//                                     />
//                                 ))}
//                             </div>

//                             {nextStep ? (
//                                 <button
//                                     onClick={() => setStep(s => Math.min(4, s + 1))}
//                                     className="flex items-center gap-1 h-8 px-3 text-xs font-semibold text-white transition-all"
//                                     style={{
//                                         borderRadius: "var(--radius-full)",
//                                         background: "var(--color-text-primary)",
//                                     }}
//                                 >
//                                     Next <ChevronRight size={12} />
//                                 </button>
//                             ) : (
//                                 <button
//                                     onClick={handleSubmit}
//                                     disabled={isPending}
//                                     className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white transition-all disabled:opacity-60"
//                                     style={{
//                                         borderRadius: "var(--radius-full)",
//                                         background: "var(--color-accent)",
//                                     }}
//                                 >
//                                     {isPending ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
//                                     {isPending ? "…" : "Publish"}
//                                 </button>
//                             )}
//                         </div>
//                     </Card>

//                     {/* live preview */}
//                     <LivePreview form={form} />

//                     {/* right sidebar */}
//                     <RightSidebar form={form} handleChange={handleChange} />
//                 </div>
//             </div>
//         </div>
//     );
// }

import {ProductFormShell} from '@/components/product/ProductFormShell'

export default function NewProductPage() {
    return <ProductFormShell title="New product" isEdit={false} />;
}