"use client";
import { useState, useRef } from "react";

const slugify = (t) =>
    t.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");

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
    { id: "course", label: "Course", emoji: "📚" },
    { id: "coaching", label: "Coaching", emoji: "🎯" },
    { id: "ebook", label: "E-book", emoji: "📄" },
    { id: "software", label: "Software", emoji: "💻" },
    { id: "templates", label: "Templates", emoji: "🗂️" },
    { id: "community", label: "Community", emoji: "👥" },
    { id: "bundle", label: "Bundle", emoji: "📦" },
];

const BUTTON_TEXTS = ["Buy Now", "Get Access", "Order Now", "Purchase", "Download", "Subscribe", "Join now"];

const CATEGORIES = [
    { id: "1", name: "Online Education", type: "digital" },
    { id: "2", name: "Business & Finance", type: "digital" },
    { id: "3", name: "Design & Creative", type: "digital" },
    { id: "4", name: "Health & Fitness", type: "both" },
    { id: "5", name: "Technology", type: "digital" },
    { id: "6", name: "Physical Books", type: "physical" },
    { id: "7", name: "Merchandise", type: "physical" },
];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

  :root {
    --color-bg: #f5f5f5;
    --color-surface: #ffffff;
    --color-surface-secondary: #f9f9f9;
    --color-border: #e8e8e8;
    --color-border-strong: #d0d0d0;
    --color-accent: #fd5000;
    --color-accent-hover: #e04700;
    --color-accent-light: #fff3ee;
    --color-accent-subtle: #ffe8de;
    --color-text-primary: #11181c;
    --color-text-secondary: #3c4248;
    --color-text-muted: #889096;
    --color-success: #30a46c;
    --color-success-light: #e9f9ef;
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
    --shadow-md: 0 4px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04);
    --shadow-lg: 0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .pf-root {
    font-family: 'DM Sans', system-ui, sans-serif;
    background: var(--color-bg);
    min-height: 100vh;
    color: var(--color-text-primary);
    -webkit-font-smoothing: antialiased;
    letter-spacing: -0.01em;
  }

  /* ── TOP BAR ─────────────────────────────── */
  .tb {
    position: sticky; top: 0; z-index: 50;
    height: 60px;
    display: flex; align-items: center; gap: 16px;
    padding: 0 20px;
    background: rgba(245,245,245,0.88);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--color-border);
  }
  .tb-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
  .tb-back {
    width: 34px; height: 34px; border-radius: 10px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--color-text-muted);
    font-size: 15px; flex-shrink: 0;
    transition: all 0.15s; box-shadow: var(--shadow-sm);
  }
  .tb-back:hover { border-color: var(--color-border-strong); color: var(--color-text-primary); }
  .tb-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); }
  .tb-badge {
    font-size: 10px; font-weight: 600;
    padding: 2px 8px; border-radius: 999px;
    background: var(--color-surface); border: 1px solid var(--color-border);
    color: var(--color-text-muted); letter-spacing: 0.02em;
  }

  /* Steps nav */
  .tb-steps { display: flex; align-items: center; gap: 2px; }
  .tb-step-btn {
    display: flex; align-items: center; gap: 7px;
    padding: 0 11px; height: 34px; border-radius: 9px;
    border: 1px solid transparent; background: transparent;
    font-size: 12px; font-weight: 500; cursor: pointer;
    color: var(--color-text-muted);
    font-family: inherit;
    transition: all 0.15s; white-space: nowrap;
  }
  .tb-step-btn.is-active {
    background: var(--color-surface);
    border-color: var(--color-border);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-sm);
  }
  .tb-step-btn.is-done { color: var(--color-text-secondary); }
  .tb-step-num {
    width: 18px; height: 18px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 9px; font-weight: 700;
    background: var(--color-surface-secondary); border: 1px solid var(--color-border);
    color: var(--color-text-muted); flex-shrink: 0;
    transition: all 0.15s;
  }
  .tb-step-num.is-active { background: var(--color-accent); border-color: var(--color-accent); color: #fff; }
  .tb-step-num.is-done { background: var(--color-success-light); border-color: rgba(48,164,108,0.25); color: var(--color-success); }
  .tb-sep { color: var(--color-border-strong); font-size: 11px; padding: 0 2px; }

  .tb-publish {
    display: flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 18px; border-radius: 999px;
    background: var(--color-accent); color: #fff; border: none;
    font-size: 13px; font-weight: 600; cursor: pointer;
    font-family: inherit;
    transition: background 0.15s, transform 0.1s;
    white-space: nowrap; flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(253,80,0,0.25);
  }
  .tb-publish:hover { background: var(--color-accent-hover); }
  .tb-publish:active { transform: scale(0.97); }
  .tb-publish:disabled { background: var(--color-border-strong); box-shadow: none; cursor: not-allowed; }
  .tb-next {
    display: flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 18px; border-radius: 999px;
    background: var(--color-text-primary); color: #fff; border: none;
    font-size: 13px; font-weight: 600; cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    white-space: nowrap; flex-shrink: 0;
  }
  .tb-next:hover { background: #2a2a2a; }
  .tb-next:active { transform: scale(0.97); }

  /* ── ERROR BAR ───────────────────────────── */
  .err {
    display: flex; align-items: center; gap: 10px;
    margin: 14px 20px 0;
    padding: 11px 14px; border-radius: 12px;
    background: #fff5f5; border: 1px solid #fecaca;
    color: #dc2626; font-size: 13px;
  }
  .err-close { margin-left: auto; border: none; background: none; color: #dc2626; cursor: pointer; font-size: 18px; line-height: 1; }

  /* ── LAYOUT ──────────────────────────────── */
  .layout {
    display: grid;
    grid-template-columns: 1fr 288px 232px;
    gap: 18px;
    padding: 20px;
    max-width: 1340px;
    margin: 0 auto;
    align-items: start;
  }

  /* ── FORM CARD ───────────────────────────── */
  .fc {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }
  .fc-body { padding: 28px 32px; }
  .fc-footer {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 28px;
    border-top: 1px solid var(--color-border);
  }
  .back-btn {
    display: flex; align-items: center; gap: 6px;
    height: 36px; padding: 0 14px; border-radius: 999px;
    border: 1px solid var(--color-border); background: transparent;
    font-size: 12px; font-weight: 500; color: var(--color-text-muted);
    cursor: pointer; font-family: inherit;
    transition: all 0.15s;
  }
  .back-btn:hover:not(:disabled) { border-color: var(--color-border-strong); color: var(--color-text-secondary); }
  .back-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  /* Step dots */
  .dots { display: flex; align-items: center; gap: 5px; }
  .dot {
    height: 5px; border-radius: 3px; cursor: pointer;
    transition: all 0.3s cubic-bezier(.16,1,.3,1);
  }
  .dot.is-active { width: 22px; background: var(--color-accent); }
  .dot.is-done { width: 5px; background: rgba(48,164,108,0.45); }
  .dot.is-future { width: 5px; background: var(--color-border-strong); }

  /* ── SECTION ─────────────────────────────── */
  .sec-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 18px; }
  .sec-title { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
  .sec-desc { font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px; }
  .divider { border: none; border-top: 1px solid var(--color-border); margin: 26px 0; }

  /* ── FORM CONTROLS ───────────────────────── */
  .field { margin-bottom: 14px; }
  .field:last-child { margin-bottom: 0; }
  .lbl {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 6px;
    font-size: 11.5px; font-weight: 500; color: var(--color-text-muted);
  }
  .req { color: var(--color-accent); margin-left: 2px; }
  .cc { font-size: 10px; font-family: monospace; }
  .cc-ok { color: var(--color-text-muted); }
  .cc-warn { color: #f59e0b; }
  .cc-over { color: #ef4444; }

  .inp, .sel, .ta {
    width: 100%; border: 1px solid var(--color-border);
    border-radius: 10px; padding: 0 12px; height: 40px;
    font-size: 13px; color: var(--color-text-primary);
    background: var(--color-surface); outline: none;
    font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
    -moz-appearance: textfield;
  }
  .inp:focus, .sel:focus, .ta:focus {
    border-color: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(253,80,0,0.1);
  }
  .inp::placeholder, .ta::placeholder { color: var(--color-text-muted); opacity: 1; }
  .inp:disabled { opacity: 0.4; cursor: not-allowed; background: var(--color-surface-secondary); }
  .ta { height: auto; padding: 10px 12px; resize: vertical; line-height: 1.6; }

  /* Input group (prefix) */
  .ig { display: flex; }
  .ig-pre {
    display: flex; align-items: center; padding: 0 12px;
    border: 1px solid var(--color-border); border-right: none;
    border-radius: 10px 0 0 10px;
    background: var(--color-surface-secondary);
    font-size: 11px; font-family: monospace; color: var(--color-text-muted);
    white-space: nowrap; flex-shrink: 0;
  }
  .ig .inp { border-radius: 0 10px 10px 0; }

  /* ── TOGGLE ──────────────────────────────── */
  .tog {
    position: relative; width: 34px; height: 18px;
    border-radius: 9px; border: none; cursor: pointer;
    transition: background 0.2s; flex-shrink: 0;
  }
  .tog-k {
    position: absolute; top: 2px; width: 14px; height: 14px;
    border-radius: 50%; background: #fff;
    transition: transform 0.2s cubic-bezier(.16,1,.3,1);
    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
  }

  /* ── TAG INPUT ───────────────────────────── */
  .tag-wrap {
    display: flex; flex-wrap: wrap; gap: 5px; min-height: 40px;
    padding: 5px 8px; border-radius: 10px;
    border: 1px solid var(--color-border); background: var(--color-surface);
    transition: border-color 0.15s, box-shadow 0.15s;
    cursor: text;
  }
  .tag-wrap:focus-within { border-color: var(--color-accent); box-shadow: 0 0 0 3px rgba(253,80,0,0.1); }
  .tag {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 999px;
    font-size: 11px; font-weight: 500;
    background: var(--color-accent-light); border: 1px solid rgba(253,80,0,0.18);
    color: var(--color-accent);
  }
  .tag-x { cursor: pointer; background: none; border: none; color: rgba(253,80,0,0.5); font-size: 14px; line-height: 1; padding: 0; }
  .tag-x:hover { color: var(--color-accent); }
  .tag-inp { flex: 1; min-width: 60px; border: none; outline: none; font-size: 12px; color: var(--color-text-primary); background: transparent; height: 26px; font-family: inherit; }
  .tag-inp::placeholder { color: var(--color-text-muted); }

  /* ── OPTION CARDS ────────────────────────── */
  .opt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .opt-card {
    display: flex; flex-direction: column; gap: 3px;
    padding: 13px; border-radius: 12px;
    border: 1.5px solid var(--color-border);
    background: var(--color-surface-secondary);
    cursor: pointer; text-align: left;
    transition: all 0.15s;
  }
  .opt-card:hover:not(.is-sel) { border-color: var(--color-border-strong); background: var(--color-surface); }
  .opt-card.is-sel { border-color: var(--color-accent); background: var(--color-accent-light); }
  .opt-top { display: flex; align-items: center; justify-content: space-between; }
  .opt-label { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
  .opt-hint { font-size: 11px; color: var(--color-text-muted); }
  .opt-check { color: var(--color-accent); font-size: 15px; }

  /* ── PILLS ───────────────────────────────── */
  .pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .pill {
    padding: 0 13px; height: 31px; border-radius: 999px;
    font-size: 12px; font-weight: 500; cursor: pointer;
    border: 1px solid var(--color-border);
    background: var(--color-surface-secondary); color: var(--color-text-secondary);
    font-family: inherit; transition: all 0.15s;
  }
  .pill:hover:not(.is-active) { border-color: var(--color-border-strong); }
  .pill.is-active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }

  /* ── BILLING TYPE ─────────────────────────── */
  .bill-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
  .bill-btn {
    height: 38px; border-radius: 10px;
    font-size: 12px; font-weight: 500; cursor: pointer;
    border: 1.5px solid var(--color-border);
    background: var(--color-surface-secondary); color: var(--color-text-secondary);
    font-family: inherit; transition: all 0.15s;
  }
  .bill-btn.is-active { border-color: var(--color-accent); background: var(--color-accent-light); color: var(--color-accent); }

  /* ── AI ASSIST BTN ───────────────────────── */
  .ai-btn {
    display: flex; align-items: center; gap: 5px;
    padding: 0 11px; height: 30px; border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-surface); color: var(--color-text-secondary);
    font-size: 11.5px; font-weight: 500; cursor: pointer;
    font-family: inherit; transition: all 0.15s;
    white-space: nowrap; flex-shrink: 0;
  }
  .ai-btn:hover { border-color: var(--color-accent); color: var(--color-accent); background: var(--color-accent-light); }

  /* ── MEDIA UPLOAD ─────────────────────────── */
  .media-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-start; }
  .upload-cover {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 7px; width: 148px; height: 106px;
    border-radius: 12px; border: 2px dashed var(--color-border);
    background: var(--color-surface-secondary); cursor: pointer;
    transition: all 0.15s;
  }
  .upload-cover:hover { border-color: var(--color-accent); background: var(--color-accent-light); }
  .upload-cover-icon { font-size: 22px; }
  .upload-cover-label { font-size: 11px; font-weight: 500; color: var(--color-text-muted); text-align: center; }
  .upload-cover-hint { font-size: 10px; color: var(--color-text-muted); opacity: 0.6; text-align: center; line-height: 1.4; }
  .upload-sm {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 3px; width: 72px; height: 54px;
    border-radius: 10px; border: 1.5px dashed var(--color-border);
    background: var(--color-surface-secondary); cursor: pointer; font-size: 11px;
    color: var(--color-text-muted); transition: all 0.15s;
  }
  .upload-sm:hover { border-color: var(--color-accent); color: var(--color-accent); }

  /* ── GRID HELPERS ─────────────────────────── */
  .g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .span2 { grid-column: span 2; }

  /* ── PREVIEW CARD ─────────────────────────── */
  .prev {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 16px; overflow: hidden;
    box-shadow: var(--shadow-sm);
    position: sticky; top: 76px;
  }
  .prev-hd {
    display: flex; align-items: center; justify-content: space-between;
    padding: 11px 15px; border-bottom: 1px solid var(--color-border);
  }
  .prev-lbl { font-size: 11px; font-weight: 600; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .prev-badge {
    font-size: 10px; font-weight: 500; padding: 2px 8px;
    border-radius: 999px; background: var(--color-surface-secondary);
    border: 1px solid var(--color-border); color: var(--color-text-muted);
  }
  .prev-bd { padding: 14px; }
  .prev-cover {
    width: 100%; aspect-ratio: 16/9; border-radius: 10px;
    border: 1px solid var(--color-border);
    background: linear-gradient(135deg, var(--color-surface-secondary) 0%, #f0eeec 100%);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 12px; font-size: 11px; color: var(--color-border-strong);
    position: relative; overflow: hidden;
  }
  .prev-cover-inner { text-align: center; color: var(--color-text-muted); opacity: 0.4; }
  .prev-stats { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
  .av-stack { display: flex; }
  .av { width: 17px; height: 17px; border-radius: 50%; border: 2px solid var(--color-surface); margin-right: -4px; }
  .prev-stat-txt { font-size: 11px; color: var(--color-text-muted); }
  .prev-rating { font-size: 11px; color: var(--color-text-muted); margin-left: auto; }
  .prev-name { font-size: 14px; font-weight: 700; color: var(--color-text-primary); line-height: 1.3; margin-bottom: 4px; letter-spacing: -0.02em; }
  .prev-name.empty { color: var(--color-border-strong); font-weight: 400; font-style: italic; }
  .prev-headline { font-size: 11.5px; color: var(--color-text-muted); margin-bottom: 10px; line-height: 1.5; }
  .prev-price { font-size: 22px; font-weight: 700; color: var(--color-text-primary); margin-bottom: 10px; letter-spacing: -0.03em; }
  .prev-period { font-size: 12px; color: var(--color-text-muted); font-weight: 400; }
  .prev-cta {
    width: 100%; padding: 9px; border-radius: 10px;
    background: var(--color-accent); color: #fff; border: none;
    font-size: 13px; font-weight: 600; cursor: default;
    font-family: inherit;
    box-shadow: 0 2px 8px rgba(253,80,0,0.25);
  }
  .prev-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 10px; }
  .prev-tag {
    font-size: 10px; padding: 2px 8px; border-radius: 999px;
    background: var(--color-accent-light); border: 1px solid rgba(253,80,0,0.15);
    color: var(--color-accent);
  }
  .prev-divider { border: none; border-top: 1px solid var(--color-border); margin: 12px 0; }
  .prev-row { display: flex; justify-content: space-between; font-size: 11px; padding: 3px 0; }
  .prev-row-k { color: var(--color-text-muted); }
  .prev-row-v { font-weight: 500; color: var(--color-text-secondary); }

  /* ── RIGHT SIDEBAR ────────────────────────── */
  .sb { position: sticky; top: 76px; display: flex; flex-direction: column; gap: 12px; }
  .panel {
    background: var(--color-surface); border: 1px solid var(--color-border);
    border-radius: 14px; overflow: hidden; box-shadow: var(--shadow-sm);
  }
  .panel-hd { padding: 11px 15px; border-bottom: 1px solid var(--color-border); }
  .panel-title { font-size: 12px; font-weight: 600; color: var(--color-text-primary); }
  .panel-bd { padding: 12px 14px; }

  /* Status */
  .save-hint {
    display: flex; align-items: center; gap: 7px;
    padding: 8px 10px; border-radius: 8px;
    background: var(--color-surface-secondary); border: 1px solid var(--color-border);
    font-size: 11px; color: var(--color-text-muted); margin-top: 8px;
  }
  .dot-amber { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; flex-shrink: 0; }

  /* Sales page toggle rows */
  .tog-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 0; font-size: 12px; color: var(--color-text-primary);
  }
  .tog-row + .tog-row { border-top: 1px solid var(--color-border); }

  /* Product subtype */
  .sub-list { padding: 5px; }
  .sub-item {
    display: flex; align-items: center; gap: 9px;
    padding: 7px 9px; border-radius: 9px; cursor: pointer;
    border: 1px solid transparent; transition: all 0.12s;
    width: 100%; text-align: left; background: transparent;
    font-family: inherit;
  }
  .sub-item:hover:not(.is-sel) { background: var(--color-surface-secondary); }
  .sub-item.is-sel { background: var(--color-accent-light); border-color: rgba(253,80,0,0.18); }
  .sub-icon {
    width: 26px; height: 26px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; background: var(--color-surface-secondary);
    border: 1px solid var(--color-border); flex-shrink: 0;
    transition: all 0.12s;
  }
  .sub-item.is-sel .sub-icon { background: var(--color-accent-light); border-color: rgba(253,80,0,0.25); }
  .sub-name { font-size: 12px; font-weight: 500; color: var(--color-text-muted); flex: 1; transition: color 0.12s; }
  .sub-item.is-sel .sub-name { color: var(--color-accent); }
  .sub-check { font-size: 12px; color: var(--color-accent); }

  /* Advanced */
  .adv-item {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 15px; font-size: 12px; color: var(--color-text-primary);
    cursor: pointer; border: none; background: transparent;
    width: 100%; text-align: left; transition: background 0.1s;
    font-family: inherit;
  }
  .adv-item:hover { background: var(--color-surface-secondary); }
  .adv-item + .adv-item { border-top: 1px solid var(--color-border); }
  .adv-icon { font-size: 13px; color: var(--color-text-muted); flex-shrink: 0; }
  .adv-arr { margin-left: auto; color: var(--color-border-strong); font-size: 16px; }

  /* ── CHECKLIST (step 4) ───────────────────── */
  .chk-list { display: flex; flex-direction: column; gap: 7px; }
  .chk-item {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 13px; border-radius: 10px; font-size: 12.5px;
  }
  .chk-item.done { background: var(--color-success-light); border: 1px solid rgba(48,164,108,0.2); color: #1a5c36; }
  .chk-item.todo { background: var(--color-surface-secondary); border: 1px solid var(--color-border); color: var(--color-text-muted); }
  .chk-icon { font-size: 15px; flex-shrink: 0; }
  .chk-req {
    margin-left: auto; font-size: 10px; font-weight: 600;
    padding: 2px 8px; border-radius: 999px;
    background: var(--color-accent-light); color: var(--color-accent);
    border: 1px solid rgba(253,80,0,0.2);
  }

  /* ── SUMMARY TABLE ───────────────────────── */
  .sum-tbl { border: 1px solid var(--color-border); border-radius: 12px; overflow: hidden; }
  .sum-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 15px; font-size: 12.5px; }
  .sum-row + .sum-row { border-top: 1px solid var(--color-border); }
  .sum-k { color: var(--color-text-muted); }
  .sum-v { font-weight: 600; color: var(--color-text-primary); }

  /* ── BIG PUBLISH BTN ─────────────────────── */
  .pub-big {
    width: 100%; height: 44px; border-radius: 12px;
    background: var(--color-accent); color: #fff; border: none;
    font-size: 14px; font-weight: 700; cursor: pointer;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    font-family: inherit; margin-top: 10px;
    transition: background 0.15s, transform 0.1s;
    box-shadow: 0 4px 16px rgba(253,80,0,0.28);
    letter-spacing: -0.01em;
  }
  .pub-big:hover:not(:disabled) { background: var(--color-accent-hover); }
  .pub-big:active:not(:disabled) { transform: scale(0.98); }
  .pub-big:disabled { background: var(--color-border-strong); box-shadow: none; cursor: not-allowed; }
  .pub-note { font-size: 11px; color: var(--color-text-muted); text-align: center; margin-top: 8px; }

  /* ── INFO BOX ─────────────────────────────── */
  .info-box {
    font-size: 12px; padding: 10px 12px; border-radius: 10px;
    background: var(--color-accent-light); border: 1px solid rgba(253,80,0,0.2);
    color: var(--color-accent); line-height: 1.5;
  }

  /* ── SUCCESS ──────────────────────────────── */
  .success {
    min-height: 100vh; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 16px;
    background: var(--color-bg);
  }
  .success-icon {
    width: 60px; height: 60px; border-radius: 18px;
    background: var(--color-success-light); border: 1px solid rgba(48,164,108,0.25);
    display: flex; align-items: center; justify-content: center; font-size: 26px;
    box-shadow: var(--shadow-md);
  }
  .success-title { font-size: 17px; font-weight: 700; color: var(--color-text-primary); letter-spacing: -0.02em; }
  .success-sub { font-size: 13px; color: var(--color-text-muted); }

  /* ── FULFILLMENT CARDS ───────────────────── */
  .ful-card {
    display: flex; align-items: center; gap: 12px;
    padding: 12px; border-radius: 12px; cursor: pointer;
    border: 1.5px solid var(--color-border);
    background: var(--color-surface-secondary);
    transition: all 0.15s;
  }
  .ful-card:hover:not(.is-sel) { border-color: var(--color-border-strong); }
  .ful-card.is-sel { border-color: var(--color-accent); background: var(--color-accent-light); }
  .ful-icon {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px; background: var(--color-surface);
    border: 1px solid var(--color-border); flex-shrink: 0;
    transition: all 0.15s;
  }
  .ful-card.is-sel .ful-icon { background: var(--color-accent); border-color: var(--color-accent); filter: none; }
  .ful-label { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
  .ful-hint { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }

  /* ── INVENTORY CARD ──────────────────────── */
  .inv-card {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px; border-radius: 10px;
    background: var(--color-surface-secondary); border: 1px solid var(--color-border);
  }
  .inv-label { font-size: 12.5px; font-weight: 500; color: var(--color-text-primary); }
  .inv-hint { font-size: 11px; color: var(--color-text-muted); margin-top: 2px; }

  /* ── VISIBILITY CARD ─────────────────────── */
  .vis-card {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px; border-radius: 12px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-secondary);
  }

  /* ── FILE ATTACHED ───────────────────────── */
  .file-attached {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 12px; border-radius: 10px;
    background: var(--color-success-light); border: 1px solid rgba(48,164,108,0.2);
    margin-bottom: 8px;
  }
  .file-name { font-size: 12px; font-family: monospace; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .file-rm { border: none; background: none; color: #dc2626; cursor: pointer; font-size: 18px; line-height: 1; padding: 0; }

  /* ── MOBILE STEPS ────────────────────────── */
  .mob-steps {
    display: none; padding: 10px 12px; gap: 5px;
    border-bottom: 1px solid var(--color-border); overflow-x: auto;
  }
  .mob-step {
    flex-shrink: 0; padding: 0 13px; height: 28px; border-radius: 999px;
    font-size: 11px; font-weight: 600; cursor: pointer;
    border: 1px solid var(--color-border);
    background: var(--color-surface-secondary); color: var(--color-text-muted);
    font-family: inherit; transition: all 0.15s;
  }
  .mob-step.is-active { background: var(--color-accent); color: #fff; border-color: var(--color-accent); }
`;

function Toggle({ checked, onChange }) {
    return (
        <button type="button" className="tog" onClick={() => onChange(!checked)}
            style={{ background: checked ? "var(--color-accent)" : "var(--color-border-strong)" }}>
            <span className="tog-k" style={{ transform: checked ? "translateX(17px)" : "translateX(2px)" }} />
        </button>
    );
}

function CharCount({ val, max }) {
    const n = (val || "").length;
    const cls = n >= max ? "cc cc-over" : n >= max * 0.85 ? "cc cc-warn" : "cc cc-ok";
    return <span className={cls}>{n}/{max}</span>;
}

function TagInput({ value, onChange }) {
    const [inp, setInp] = useState("");
    const tags = value ? value.split(",").map(t => t.trim()).filter(Boolean) : [];
    const add = (t) => {
        const tr = t.trim();
        if (!tr || tags.includes(tr)) return;
        onChange([...tags, tr].join(", ")); setInp("");
    };
    const rm = (i) => onChange(tags.filter((_, idx) => idx !== i).join(", "));
    return (
        <div className="tag-wrap">
            {tags.map((t, i) => (
                <span key={t} className="tag">
                    {t}
                    <button className="tag-x" onClick={() => rm(i)}>×</button>
                </span>
            ))}
            <input className="tag-inp" value={inp} placeholder={tags.length === 0 ? "Add a tag…" : ""}
                onChange={e => setInp(e.target.value)}
                onKeyDown={e => {
                    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(inp); }
                    if (e.key === "Backspace" && !inp && tags.length) rm(tags.length - 1);
                }}
                onBlur={() => { if (inp) add(inp); }} />
        </div>
    );
}

function LivePreview({ form }) {
    const price = parseFloat(form.price) || 0;
    const isFree = price === 0;
    const tags = form.tags ? form.tags.split(",").slice(0, 4).map(t => t.trim()).filter(Boolean) : [];
    return (
        <div className="prev">
            <div className="prev-hd">
                <span className="prev-lbl">Preview</span>
                <span className="prev-badge">Buyer view</span>
            </div>
            <div className="prev-bd">
                <div className="prev-cover">
                    <div className="prev-cover-inner">
                        <div style={{ fontSize: 28, marginBottom: 4 }}>🖼️</div>
                        <div>Cover image</div>
                    </div>
                </div>
                <div className="prev-stats">
                    <div className="av-stack">
                        {["#ffb3a7", "#ffd6b8", "#c4c4ff"].map((c, i) => (
                            <div key={i} className="av" style={{ background: c }} />
                        ))}
                    </div>
                    <span className="prev-stat-txt">2.8k+ students</span>
                    <span className="prev-rating">⭐ 4.9</span>
                </div>
                <p className={`prev-name${form.name ? "" : " empty"}`}>
                    {form.name || "Your product name"}
                </p>
                {form.short_description && (
                    <p className="prev-headline">{form.short_description}</p>
                )}
                <p className="prev-price">
                    {isFree ? "Free" : `$${price.toFixed(2)}`}
                    {!isFree && form.pricing_type === "recurring" && (
                        <span className="prev-period"> / {form.billing_period}</span>
                    )}
                </p>
                <button className="prev-cta">{form.button_text || "Join now"}</button>
                {tags.length > 0 && (
                    <div className="prev-tags">{tags.map((t, i) => <span key={i} className="prev-tag">{t}</span>)}</div>
                )}
                {form.name && (
                    <>
                        <div className="prev-divider" />
                        <div className="prev-row"><span className="prev-row-k">Type</span><span className="prev-row-v">{form.product_type}</span></div>
                        <div className="prev-row"><span className="prev-row-k">Status</span><span className="prev-row-v">{form.status}</span></div>
                    </>
                )}
            </div>
        </div>
    );
}

function RightSidebar({ form, handleChange }) {
    return (
        <div className="sb">
            <div className="panel">
                <div className="panel-hd"><p className="panel-title">Status</p></div>
                <div className="panel-bd">
                    <select className="sel" value={form.status} onChange={e => handleChange("status", e.target.value)}
                        style={{ marginBottom: 0 }}>
                        {STATUS_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                    <div className="save-hint"><div className="dot-amber" />Unsaved changes</div>
                </div>
            </div>

            <div className="panel">
                <div className="panel-hd"><p className="panel-title">Sales page</p></div>
                <div className="panel-bd" style={{ paddingTop: 4, paddingBottom: 4 }}>
                    {[
                        { key: "custom_domain", label: "Custom domain" },
                        { key: "show_author", label: "Show author bio" },
                        { key: "show_reviews", label: "Show reviews" },
                        { key: "enable_discussions", label: "Discussions" },
                    ].map(item => (
                        <div key={item.key} className="tog-row">
                            <span>{item.label}</span>
                            <Toggle checked={!!form[item.key]} onChange={v => handleChange(item.key, v)} />
                        </div>
                    ))}
                </div>
            </div>

            <div className="panel">
                <div className="panel-hd"><p className="panel-title">Product type</p></div>
                <div className="sub-list">
                    {PRODUCT_SUBTYPES.map(type => {
                        const sel = form.product_subtype === type.id;
                        return (
                            <button key={type.id} className={`sub-item${sel ? " is-sel" : ""}`}
                                onClick={() => handleChange("product_subtype", type.id)}>
                                <div className="sub-icon">{type.emoji}</div>
                                <span className="sub-name">{type.label}</span>
                                {sel && <span className="sub-check">✓</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="panel">
                <div className="panel-hd"><p className="panel-title">Advanced</p></div>
                {[
                    { label: "Drip content", icon: "⏱️" },
                    { label: "Access rules", icon: "🔒" },
                    { label: "Localization", icon: "🌍" },
                    { label: "SEO settings", icon: "🔍" },
                ].map(item => (
                    <button key={item.label} className="adv-item">
                        <span className="adv-icon">{item.icon}</span>
                        <span>{item.label}</span>
                        <span className="adv-arr">›</span>
                    </button>
                ))}
            </div>
        </div>
    );
}

/* ─── STEP 1 ─────────────────────────────────── */
function StepDetails({ form, handleChange }) {
    const cats = CATEGORIES.filter(c =>
        form.product_type === "digital" ? c.type !== "physical" : c.type !== "digital"
    );
    return (
        <div>
            <div className="sec-header">
                <div>
                    <p className="sec-title">Basic information</p>
                    <p className="sec-desc">Tell buyers what your product is about</p>
                </div>
                <button className="ai-btn">✦ AI Assist</button>
            </div>

            <div className="field">
                <div className="lbl">
                    <span>Product name<span className="req">*</span></span>
                    <CharCount val={form.name} max={80} />
                </div>
                <input className="inp" type="text" value={form.name} maxLength={80}
                    onChange={e => handleChange("name", e.target.value)}
                    placeholder="e.g. How to Build a Viral App: 0 to $100k/mo" />
            </div>

            <div className="field">
                <div className="lbl">
                    <span>Headline<span className="req">*</span></span>
                    <CharCount val={form.short_description} max={80} />
                </div>
                <input className="inp" type="text" value={form.short_description} maxLength={80}
                    onChange={e => handleChange("short_description", e.target.value)}
                    placeholder="e.g. Step-by-step blueprint to build, launch & monetize your app" />
            </div>

            <div className="field">
                <div className="lbl">
                    <span>Short description<span className="req">*</span></span>
                    <CharCount val={form.description || ""} max={200} />
                </div>
                <textarea className="ta" rows={4} value={form.description || ""} maxLength={200}
                    onChange={e => handleChange("description", e.target.value)}
                    placeholder="A complete guide to validate, build and launch your app…" />
            </div>

            <div className="field">
                <div className="lbl"><span>Category<span className="req">*</span></span></div>
                <select className="sel" value={form.category_id}
                    onChange={e => handleChange("category_id", e.target.value)}>
                    <option value="">Select a category…</option>
                    {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>

            <div className="field">
                <div className="lbl"><span>Tags</span></div>
                <TagInput value={form.tags} onChange={v => handleChange("tags", v)} />
                <p style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 5 }}>Press Enter or comma to add a tag</p>
            </div>

            <hr className="divider" />

            <div className="sec-header">
                <div>
                    <p className="sec-title">Media</p>
                    <p className="sec-desc">Upload images and a preview video</p>
                </div>
            </div>
            <div className="media-row">
                <div className="upload-cover">
                    <span className="upload-cover-icon">⬆️</span>
                    <span className="upload-cover-label">Upload cover</span>
                    <span className="upload-cover-hint">PNG, JPG or WEBP<br />Recommended 1280×720</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "flex-start" }}>
                    <div className="upload-sm">
                        <span style={{ fontSize: 18 }}>🖼️</span>
                        <span>Gallery</span>
                    </div>
                    <div className="upload-sm">
                        <span style={{ fontSize: 18 }}>▶️</span>
                        <span>Teaser</span>
                    </div>
                </div>
            </div>

            <hr className="divider" />

            <div className="sec-header">
                <div>
                    <p className="sec-title">Product URL</p>
                    <p className="sec-desc">Customize your product's permalink</p>
                </div>
            </div>
            <div className="ig">
                <span className="ig-pre">/product/</span>
                <input className="inp" type="text" value={form.slug}
                    onChange={e => handleChange("slug", e.target.value)}
                    placeholder="my-product-name"
                    style={{ fontFamily: "monospace", fontSize: 12 }} />
            </div>
        </div>
    );
}

/* ─── STEP 2 ─────────────────────────────────── */
function StepPricing({ form, handleChange }) {
    const isFree = parseFloat(form.price) === 0;
    return (
        <div>
            <div className="sec-header">
                <div>
                    <p className="sec-title">Pricing model</p>
                    <p className="sec-desc">Set how customers will pay for your product</p>
                </div>
            </div>

            <div className="opt-grid" style={{ marginBottom: 20 }}>
                {[{ id: "free", label: "Free", hint: "No charge to access" },
                { id: "paid", label: "Paid", hint: "Charge customers" }].map(opt => {
                    const sel = opt.id === "free" ? isFree : !isFree;
                    return (
                        <div key={opt.id} className={`opt-card${sel ? " is-sel" : ""}`}
                            onClick={() => handleChange("price", opt.id === "free" ? "0" : "9.99")}>
                            <div className="opt-top">
                                <span className="opt-label">{opt.label}</span>
                                {sel && <span className="opt-check">✓</span>}
                            </div>
                            <span className="opt-hint">{opt.hint}</span>
                        </div>
                    );
                })}
            </div>

            {!isFree && (
                <div>
                    <div className="g3" style={{ marginBottom: 20 }}>
                        <div>
                            <div className="lbl"><span>Currency</span></div>
                            <select className="sel" value={form.currency}
                                onChange={e => handleChange("currency", e.target.value)}>
                                <option value="USD">USD – $</option>
                                <option value="EUR">EUR – €</option>
                                <option value="GBP">GBP – £</option>
                            </select>
                        </div>
                        <div className="span2">
                            <div className="lbl"><span>Price</span></div>
                            <input className="inp" type="number" value={form.price} min={0} step="0.01"
                                onChange={e => handleChange("price", e.target.value)}
                                style={{ fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em" }} />
                        </div>
                    </div>

                    <hr className="divider" style={{ margin: "18px 0" }} />

                    <div className="field">
                        <p style={{ fontSize: 10.5, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" }}>Billing type</p>
                        <div className="bill-grid">
                            {[{ id: "one_time", label: "One-time payment" },
                            { id: "recurring", label: "Recurring subscription" }].map(opt => (
                                <button key={opt.id} className={`bill-btn${form.pricing_type === opt.id ? " is-active" : ""}`}
                                    onClick={() => handleChange("pricing_type", opt.id)}>
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {form.pricing_type === "recurring" && (
                        <div className="field">
                            <p style={{ fontSize: 10.5, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.08em", marginBottom: 10, textTransform: "uppercase" }}>Billing period</p>
                            <div className="pills">
                                {BILLING_PERIODS.map(p => (
                                    <button key={p.id} className={`pill${form.billing_period === p.id ? " is-active" : ""}`}
                                        onClick={() => handleChange("billing_period", p.id)}>
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <hr className="divider" />

            <div className="sec-header">
                <div>
                    <p className="sec-title">Affiliate program</p>
                    <p className="sec-desc">Let others earn by promoting your product</p>
                </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: form.affiliate_enabled ? 16 : 0 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Enable affiliate program</span>
                <Toggle checked={form.affiliate_enabled} onChange={v => handleChange("affiliate_enabled", v)} />
            </div>
            {form.affiliate_enabled && (
                <div style={{ paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
                    <div className="field">
                        <div className="lbl"><span>Commission rate</span></div>
                        <div style={{ position: "relative" }}>
                            <input className="inp" type="number" value={form.affiliate_commission_rate} min="1" max="100"
                                onChange={e => handleChange("affiliate_commission_rate", e.target.value)}
                                style={{ paddingRight: 36 }} />
                            <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 600, color: "var(--color-text-muted)" }}>%</span>
                        </div>
                    </div>
                    <div className="info-box">
                        Affiliates earn <strong>{form.affiliate_commission_rate || 10}%</strong> per sale
                        — approx. <strong>${((parseFloat(form.price) || 0) * (parseFloat(form.affiliate_commission_rate) || 10) / 100).toFixed(2)}</strong> per conversion
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── STEP 3 ─────────────────────────────────── */
function StepSettings({ form, handleChange }) {
    return (
        <div>
            <div className="sec-header">
                <div>
                    <p className="sec-title">Call-to-action</p>
                    <p className="sec-desc">The text shown on your buy button</p>
                </div>
            </div>
            <div className="field">
                <div className="lbl"><span>Button label</span></div>
                <input className="inp" type="text" value={form.button_text}
                    onChange={e => handleChange("button_text", e.target.value)}
                    placeholder="e.g. Join now" />
            </div>
            <div className="pills">
                {BUTTON_TEXTS.map(txt => (
                    <button key={txt} className={`pill${form.button_text === txt ? " is-active" : ""}`}
                        onClick={() => handleChange("button_text", txt)}>{txt}</button>
                ))}
            </div>

            <hr className="divider" />

            <div className="sec-header">
                <div>
                    <p className="sec-title">Fulfillment</p>
                    <p className="sec-desc">How is this product delivered to customers</p>
                </div>
            </div>
            <div className="opt-grid" style={{ marginBottom: 16 }}>
                {[
                    { id: "physical", label: "Physical", icon: "📦", hint: "Ships to customer" },
                    { id: "digital", label: "Digital", icon: "🌐", hint: "Instant access / download" },
                ].map(type => {
                    const sel = form.product_type === type.id;
                    return (
                        <div key={type.id} className={`ful-card${sel ? " is-sel" : ""}`}
                            onClick={() => handleChange("product_type", type.id)}>
                            <div className="ful-icon">{type.icon}</div>
                            <div>
                                <p className="ful-label">{type.label}</p>
                                <p className="ful-hint">{type.hint}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {form.product_type === "physical" && (
                <div>
                    <div className="inv-card" style={{ marginBottom: 12 }}>
                        <div>
                            <p className="inv-label">Track inventory</p>
                            <p className="inv-hint">Auto-reduce stock on purchase</p>
                        </div>
                        <Toggle checked={form.track_inventory} onChange={v => handleChange("track_inventory", v)} />
                    </div>
                    <div className="g3">
                        <div>
                            <div className="lbl"><span>Stock qty</span></div>
                            <input className="inp" type="number" value={form.inventory_quantity}
                                disabled={!form.track_inventory}
                                onChange={e => handleChange("inventory_quantity", e.target.value)} placeholder="0" />
                        </div>
                        <div>
                            <div className="lbl"><span>Weight (kg)</span></div>
                            <input className="inp" type="number" step="0.01" value={form.weight}
                                onChange={e => handleChange("weight", e.target.value)} placeholder="0.00" />
                        </div>
                        <div>
                            <div className="lbl"><span>Dimensions</span></div>
                            <input className="inp" type="text" value={form.dimensions}
                                onChange={e => handleChange("dimensions", e.target.value)} placeholder="L×W×H" />
                        </div>
                    </div>
                </div>
            )}

            {form.product_type === "digital" && (
                <div>
                    {form.digital_file_url ? (
                        <div className="file-attached">
                            <span style={{ color: "var(--color-success)", fontSize: 16 }}>✓</span>
                            <span className="file-name">{form.digital_file_url}</span>
                            <button className="file-rm" onClick={() => handleChange("digital_file_url", "")}>×</button>
                        </div>
                    ) : null}
                    <div className="lbl"><span>File URL or hosted link</span></div>
                    <input className="inp" type="text" placeholder="https://your-cdn.com/file.zip"
                        value={form.digital_file_url}
                        onChange={e => handleChange("digital_file_url", e.target.value)}
                        style={{ fontFamily: "monospace", fontSize: 12 }} />
                </div>
            )}

            <hr className="divider" />

            <div className="sec-header">
                <div>
                    <p className="sec-title">Visibility</p>
                    <p className="sec-desc">Control how this product appears in your store</p>
                </div>
            </div>
            <div className="vis-card">
                <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>Feature in store showcase</p>
                    <p style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginTop: 3 }}>Pin this product to the top of your store</p>
                </div>
                <Toggle checked={form.is_featured} onChange={v => handleChange("is_featured", v)} />
            </div>
        </div>
    );
}

/* ─── STEP 4 ─────────────────────────────────── */
function StepPublish({ form, isPending, handleSubmit }) {
    const price = parseFloat(form.price) || 0;
    const checks = [
        { label: "Product name added", done: !!form.name.trim() },
        { label: "Headline written", done: !!form.short_description.trim() },
        { label: "Category selected", done: !!form.category_id },
        { label: "Pricing configured", done: true },
        { label: "Fulfillment set up", done: form.product_type === "physical" || !!form.digital_file_url },
    ];
    const allDone = checks.every(c => c.done);
    return (
        <div>
            <div className="sec-header">
                <div>
                    <p className="sec-title">Pre-launch checklist</p>
                    <p className="sec-desc">Everything needs to be green before publishing</p>
                </div>
            </div>
            <div className="chk-list">
                {checks.map(item => (
                    <div key={item.label} className={`chk-item${item.done ? " done" : " todo"}`}>
                        <span className="chk-icon">{item.done ? "✓" : "○"}</span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {!item.done && <span className="chk-req">Required</span>}
                    </div>
                ))}
            </div>

            <hr className="divider" />

            <div className="sec-header">
                <div>
                    <p className="sec-title">Summary</p>
                    <p className="sec-desc">Review before going live</p>
                </div>
            </div>
            <div className="sum-tbl">
                {[
                    { k: "Name", v: form.name || "—" },
                    { k: "Price", v: price === 0 ? "Free" : `$${price.toFixed(2)} ${form.currency}` },
                    { k: "Billing", v: price === 0 ? "—" : form.pricing_type === "recurring" ? `Recurring · ${form.billing_period}` : "One-time" },
                    { k: "Fulfillment", v: form.product_type === "digital" ? "Digital" : "Physical" },
                    { k: "Status on publish", v: "Active" },
                ].map(row => (
                    <div key={row.k} className="sum-row">
                        <span className="sum-k">{row.k}</span>
                        <span className="sum-v">{row.v}</span>
                    </div>
                ))}
            </div>

            <button className="pub-big" onClick={handleSubmit} disabled={isPending || !allDone}>
                {isPending ? "Publishing…" : allDone ? "⚡ Publish product" : "Complete checklist to publish"}
            </button>
            <p className="pub-note">
                {allDone ? "Your product will go live immediately after publishing" : "Complete all required fields above"}
            </p>
        </div>
    );
}

/* ─── MAIN ────────────────────────────────────── */
export default function ProductForm() {
    const [step, setStep] = useState(1);
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const [form, setForm] = useState({
        name: "", slug: "", short_description: "", description: "",
        product_type: "digital", product_subtype: "course",
        price: "29.99", currency: "USD", category_id: "",
        pricing_type: "recurring", billing_period: "monthly",
        digital_file_url: "", track_inventory: true, inventory_quantity: "0",
        affiliate_enabled: false, affiliate_commission_rate: "10",
        is_featured: false, status: "draft", button_text: "Join now",
        tags: "", weight: "", dimensions: "", images: [],
        custom_domain: false, show_author: true, show_reviews: true, enable_discussions: false,
    });

    function handleChange(field, value) {
        setForm(prev => {
            const u = { ...prev, [field]: value };
            if (field === "name") u.slug = slugify(value);
            if (field === "product_type" && value !== "digital") u.pricing_type = "one_time";
            return u;
        });
    }

    async function handleSubmit() {
        setError(null);
        if (!form.name.trim()) { setError("Product name is required."); return; }
        setIsPending(true);
        await new Promise(r => setTimeout(r, 1400));
        setIsPending(false);
        setSuccess(true);
    }

    if (success) return (
        <>
            <style>{css}</style>
            <div className="pf-root">
                <div className="success">
                    <div className="success-icon">✓</div>
                    <div style={{ textAlign: "center" }}>
                        <p className="success-title">Product published!</p>
                        <p className="success-sub">Your product is now live in your store</p>
                    </div>
                </div>
            </div>
        </>
    );

    const nextStep = STEPS.find(s => s.id === step + 1);

    return (
        <>
            <style>{css}</style>
            <div className="pf-root">

                {/* Top bar */}
                <div className="tb">
                    <div className="tb-left">
                        <button className="tb-back" onClick={() => step > 1 && setStep(step - 1)}>←</button>
                        <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span className="tb-title">Create product</span>
                                <span className="tb-badge">Draft</span>
                            </div>
                        </div>
                    </div>

                    <div className="tb-steps">
                        {STEPS.map((s, i) => (
                            <span key={s.id} style={{ display: "flex", alignItems: "center", gap: 0 }}>
                                <button className={`tb-step-btn${step === s.id ? " is-active" : s.id < step ? " is-done" : ""}`}
                                    onClick={() => setStep(s.id)}>
                                    <span className={`tb-step-num${step === s.id ? " is-active" : s.id < step ? " is-done" : ""}`}>
                                        {s.id < step ? "✓" : s.id}
                                    </span>
                                    {s.label}
                                </button>
                                {i < STEPS.length - 1 && <span className="tb-sep"> › </span>}
                            </span>
                        ))}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                        {nextStep
                            ? <button className="tb-next" onClick={() => setStep(step + 1)}>Next: {nextStep.label} ›</button>
                            : <button className="tb-publish" onClick={handleSubmit} disabled={isPending}>
                                {isPending ? "Publishing…" : "⚡ Publish"}
                            </button>
                        }
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="err">
                        ⚠ {error}
                        <button className="err-close" onClick={() => setError(null)}>×</button>
                    </div>
                )}

                {/* Layout */}
                <div className="layout">
                    {/* Form */}
                    <div className="fc">
                        <div className="mob-steps">
                            {STEPS.map(s => (
                                <button key={s.id} className={`mob-step${step === s.id ? " is-active" : ""}`}
                                    onClick={() => setStep(s.id)}>{s.id}. {s.label}</button>
                            ))}
                        </div>

                        <div className="fc-body">
                            {step === 1 && <StepDetails form={form} handleChange={handleChange} />}
                            {step === 2 && <StepPricing form={form} handleChange={handleChange} />}
                            {step === 3 && <StepSettings form={form} handleChange={handleChange} />}
                            {step === 4 && <StepPublish form={form} isPending={isPending} handleSubmit={handleSubmit} />}
                        </div>

                        <div className="fc-footer">
                            <button className="back-btn" disabled={step === 1} onClick={() => setStep(s => Math.max(1, s - 1))}>
                                ← Back
                            </button>
                            <div className="dots">
                                {STEPS.map(s => (
                                    <div key={s.id} className={`dot${step === s.id ? " is-active" : s.id < step ? " is-done" : " is-future"}`}
                                        onClick={() => setStep(s.id)} />
                                ))}
                            </div>
                            {nextStep
                                ? <button className="tb-next" style={{ borderRadius: 999 }} onClick={() => setStep(s => Math.min(4, s + 1))}>Next ›</button>
                                : <button className="tb-publish" onClick={handleSubmit} disabled={isPending}>
                                    {isPending ? "…" : "⚡ Publish"}
                                </button>
                            }
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