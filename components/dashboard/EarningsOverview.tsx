
"use client";

import {
  useEffect,
  useRef,
  useState,
  useMemo,
  type KeyboardEvent,
} from "react";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  Info,
  Download,
  AlertCircle,
  ArrowLeftRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { EARNINGS_LABELS, EARNINGS_DATASETS } from "@/data/dashboard";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EarningsDataset {
  label: string;
  data: number[];
  color: string;
  amount: string;
}

export interface EarningsOverviewProps {
  labels?: string[];
  datasets?: EarningsDataset[];
  /** When provided this value is displayed as-is; computed total is used otherwise */
  totalEarnings?: number;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Chart: any;
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = ["All", "Affiliate", "UGC", "Marketplace", "Communities"] as const;
type Tab = (typeof TABS)[number];

const PERIODS = [
  "This Week",
  "This Month",
  "Last 3 Months",
  "Last 6 Months",
  "This Year",
] as const;
type Period = (typeof PERIODS)[number];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sliceForPeriod(
  labels: string[],
  datasets: EarningsDataset[],
  period: Period
) {
  const counts: Record<Period, number> = {
    "This Week": 7,
    "This Month": 30,
    "Last 3 Months": Math.floor(labels.length * 0.5),
    "Last 6 Months": Math.floor(labels.length * 0.75),
    "This Year": labels.length,
  };
  const n = Math.min(counts[period], labels.length);
  return {
    slicedLabels: labels.slice(-n),
    slicedDatasets: datasets.map((d) => ({ ...d, data: d.data.slice(-n) })),
  };
}

function computeTotal(datasets: EarningsDataset[]): number {
  return datasets.reduce(
    (sum, d) => sum + d.data.reduce((s, v) => s + v, 0),
    0
  );
}

// ─── useOutsideClick ─────────────────────────────────────────────────────────

function useOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void
) {
  useEffect(() => {
    function listener(e: MouseEvent) {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    }
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EarningsOverview({
  labels: propLabels,
  datasets: propDatasets,
  totalEarnings,
}: EarningsOverviewProps = {}) {

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("All");
  const [activePeriod, setActivePeriod] = useState<Period>("This Month");
  const [periodOpen, setPeriodOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [hiddenDatasets, setHiddenDatasets] = useState<Set<string>>(new Set());
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);

  // ── Chart lifecycle state ─────────────────────────────────────────────────
  const [chartReady, setChartReady] = useState(false);
  const [chartError, setChartError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const periodRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  const { formatMoney } = useCurrency();

  useOutsideClick(periodRef, () => setPeriodOpen(false));
  useOutsideClick(exportRef, () => setExportOpen(false));
  useOutsideClick(infoRef, () => setShowInfoTooltip(false));

  // ── Data pipeline ─────────────────────────────────────────────────────────

  const baseLabels = propLabels ?? EARNINGS_LABELS;
  const baseDatasets = propDatasets ?? EARNINGS_DATASETS;

  const { slicedLabels, slicedDatasets } = useMemo(
    () => sliceForPeriod(baseLabels, baseDatasets, activePeriod),
    [baseLabels, baseDatasets, activePeriod]
  );

  const filteredDatasets = useMemo(
    () =>
      activeTab === "All"
        ? slicedDatasets
        : slicedDatasets.filter((d) =>
          d.label.toLowerCase().includes(activeTab.toLowerCase())
        ),
    [activeTab, slicedDatasets]
  );

  // Computed total updates when tab or period changes
  const computedTotal = useMemo(
    () => computeTotal(filteredDatasets),
    [filteredDatasets]
  );
  const displayTotal =
    totalEarnings != null
      ? formatMoney(totalEarnings, "USD")
      : formatMoney(computedTotal, "USD");

  // Simulated change badge (in production, pass from props)
  const displayChange = totalEarnings != null ? null : "18.6% vs last period";
  const changePositive = true;

  const hasData = filteredDatasets.length > 0;

  // ── Chart build ───────────────────────────────────────────────────────────

  useEffect(() => {
    function isDark() {
      return document.documentElement.classList.contains("dark");
    }

    function buildChart() {
      if (!canvasRef.current || !window.Chart) return;
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      setChartReady(false);

      if (!hasData) return;

      const dark = isDark();
      const gridColor = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
      const tickColor = dark ? "#6a6a6a" : "#889096";
      const tooltipBg = dark ? "#1a1a1a" : "#ffffff";
      const tooltipBorder = dark ? "#333333" : "#e8e8e8";
      const tooltipTitle = dark ? "#ededed" : "#11181c";
      const tooltipBody = dark ? "#a8a8a8" : "#3c4248";
      const isMobile = window.innerWidth < 640;

      // Respect hidden legend toggles
      const visibleDatasets = filteredDatasets.filter(
        (d) => !hiddenDatasets.has(d.label)
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chartDatasets: any[] = visibleDatasets.map((d) => ({
        label: d.label,
        data: d.data,
        borderColor: d.color,
        backgroundColor: d.color + "18",
        fill: true,
        tension: 0.42,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: d.color,
        pointHoverBorderColor: dark ? "#111" : "#fff",
        pointHoverBorderWidth: 2,
      }));

      // Compare mode: overlay previous-period lines (dashed, semi-transparent)
      if (compareMode) {
        visibleDatasets.forEach((d) => {
          chartDatasets.push({
            label: `${d.label} (prev)`,
            data: d.data.map((v) => +(v * 0.82).toFixed(2)),
            borderColor: d.color + "77",
            backgroundColor: "transparent",
            fill: false,
            tension: 0.42,
            borderWidth: 1.5,
            borderDash: [4, 4],
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: d.color + "77",
            pointHoverBorderColor: dark ? "#111" : "#fff",
            pointHoverBorderWidth: 2,
          });
        });
      }

      chartRef.current = new window.Chart(canvasRef.current, {
        type: "line",
        data: { labels: slicedLabels, datasets: chartDatasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: tooltipBg,
              titleColor: tooltipTitle,
              bodyColor: tooltipBody,
              borderColor: tooltipBorder,
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (ctx: { dataset: { label: string }; raw: number }) =>
                  ` ${ctx.dataset.label}: ${formatMoney(ctx.raw, "USD")}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                font: { size: isMobile ? 10 : 11, family: "DM Sans, sans-serif" },
                color: tickColor,
                maxTicksLimit: isMobile ? 4 : 7,
              },
            },
            y: {
              grid: { color: gridColor, drawBorder: false },
              border: { display: false },
              ticks: {
                font: { size: isMobile ? 10 : 11, family: "DM Sans, sans-serif" },
                color: tickColor,
                maxTicksLimit: isMobile ? 4 : 6,
                // Compact labels on mobile to prevent axis overflow
                callback: (v: number) =>
                  isMobile
                    ? `$${(v / 1000).toFixed(0)}k`
                    : formatMoney(v, "USD"),
              },
            },
          },
        },
      });

      setChartReady(true);
    }

    function loadChart() {
      if (window.Chart) {
        buildChart();
        return;
      }
      // Dedup guard: reuse existing script tag if already in the DOM
      const existing = document.querySelector(
        'script[src*="chart.umd"]'
      ) as HTMLScriptElement | null;
      if (existing) {
        existing.addEventListener("load", buildChart, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
      script.onload = buildChart;
      script.onerror = () => setChartError(true);
      document.head.appendChild(script);
    }

    loadChart();

    // Rebuild on dark/light mode toggle
    const observer = new MutationObserver(() => buildChart());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [
    activeTab,
    activePeriod,
    compareMode,
    hiddenDatasets,
    hasData,
    slicedLabels,
    filteredDatasets,
    formatMoney,
    retryCount,
  ]);

  // ── Tab keyboard navigation (ARIA tablist pattern) ─────────────────────────

  function handleTabKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = (index + 1) % TABS.length;
      setActiveTab(TABS[next]);
      tabRefs.current[next]?.focus();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = (index - 1 + TABS.length) % TABS.length;
      setActiveTab(TABS[prev]);
      tabRefs.current[prev]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      setActiveTab(TABS[0]);
      tabRefs.current[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      setActiveTab(TABS[TABS.length - 1]);
      tabRefs.current[TABS.length - 1]?.focus();
    }
  }

  // ── Legend toggle ─────────────────────────────────────────────────────────

  function toggleDataset(label: string) {
    setHiddenDatasets((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  // ── Exports ───────────────────────────────────────────────────────────────

  function exportPNG() {
    if (!chartRef.current) return;
    const url = chartRef.current.toBase64Image("image/png", 1);
    const a = document.createElement("a");
    a.href = url;
    a.download = `earnings-${activePeriod.toLowerCase().replace(/\s+/g, "-")}.png`;
    a.click();
    setExportOpen(false);
  }

  function exportCSV() {
    const headers = ["Category", ...slicedLabels];
    const rows = filteredDatasets.map((d) => [d.label, ...d.data.map(String)]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `earnings-${activePeriod.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5">

      {/* ── Row 1: Title + action buttons ── */}
      <div className="flex items-start sm:items-center justify-between gap-2 mb-3 flex-wrap">

        {/* Title + info tooltip */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[15px] font-bold text-text-primary truncate">
            Earnings Overview
          </span>
          <div ref={infoRef} className="relative flex-shrink-0">
            <button
              aria-label="About this chart"
              aria-expanded={showInfoTooltip}
              onClick={() => setShowInfoTooltip((v) => !v)}
              className="text-text-muted hover:text-text-secondary transition-colors"
            >
              <Info size={14} />
            </button>
            {showInfoTooltip && (
              <div
                role="tooltip"
                className={cn(
                  "absolute left-0 top-7 z-50 w-60",
                  "rounded-xl bg-surface border border-border shadow-lg",
                  "p-3 text-[12px] text-text-secondary leading-relaxed"
                )}
              >
                Earnings broken down by channel for the selected period.
                Click legend items to toggle dataset visibility.
                Use <strong>Compare</strong> to overlay the previous period.
              </div>
            )}
          </div>
        </div>

        {/* Action cluster */}
        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">

          {/* Compare toggle */}
          <button
            onClick={() => setCompareMode((v) => !v)}
            aria-pressed={compareMode}
            title="Compare with previous period"
            className={cn(
              "flex items-center gap-1.5 h-8 px-2.5 rounded-lg border text-[12px] font-medium transition-colors",
              compareMode
                ? "border-[#fd5000] bg-[#fff3ee] dark:bg-[#200d00] text-[#fd5000]"
                : "border-border bg-surface text-text-secondary hover:bg-surface-secondary"
            )}
          >
            <ArrowLeftRight size={12} />
            <span className="hidden sm:inline">Compare</span>
          </button>

          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen((v) => !v)}
              aria-label="Export chart data"
              aria-expanded={exportOpen}
              className={cn(
                "flex items-center justify-center h-8 w-8 rounded-lg border border-border",
                "bg-surface text-text-secondary hover:bg-surface-secondary transition-colors"
              )}
            >
              <Download size={13} />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-9 z-50 w-36 rounded-xl bg-surface border border-border shadow-lg p-1">
                <button
                  onClick={exportPNG}
                  className={cn(
                    "w-full text-left flex items-center gap-2 px-3 py-2",
                    "text-[12px] font-medium text-text-secondary",
                    "hover:bg-surface-secondary rounded-lg transition-colors"
                  )}
                >
                  Export PNG
                </button>
                <button
                  onClick={exportCSV}
                  className={cn(
                    "w-full text-left flex items-center gap-2 px-3 py-2",
                    "text-[12px] font-medium text-text-secondary",
                    "hover:bg-surface-secondary rounded-lg transition-colors"
                  )}
                >
                  Export CSV
                </button>
              </div>
            )}
          </div>

          {/* Period picker */}
          <div className="relative" ref={periodRef}>
            <button
              onClick={() => setPeriodOpen((v) => !v)}
              aria-expanded={periodOpen}
              aria-haspopup="listbox"
              className={cn(
                "flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border",
                "bg-surface text-[12px] font-medium text-text-secondary",
                "hover:bg-surface-secondary transition-colors whitespace-nowrap"
              )}
            >
              {activePeriod}
              <ChevronDown
                size={12}
                className={cn(
                  "transition-transform duration-200",
                  periodOpen && "rotate-180"
                )}
              />
            </button>
            {periodOpen && (
              <div
                role="listbox"
                aria-label="Select period"
                className="absolute right-0 top-9 z-50 w-44 rounded-xl bg-surface border border-border shadow-lg p-1"
              >
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    role="option"
                    aria-selected={activePeriod === p}
                    onClick={() => {
                      setActivePeriod(p);
                      setPeriodOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-[12px] font-medium rounded-lg transition-colors",
                      activePeriod === p
                        ? "bg-[#fff3ee] dark:bg-[#200d00] text-[#fd5000]"
                        : "text-text-secondary hover:bg-surface-secondary"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Tabs (scrollable on mobile, full ARIA tablist) ── */}
      {/*
        scrollbar-hide — add to globals.css if not present:
          .scrollbar-hide::-webkit-scrollbar { display: none }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none }
      */}
      <div className="mb-4 -mx-4 sm:mx-0 px-4 sm:px-0">
        <div className="overflow-x-auto scrollbar-hide">
          <div
            role="tablist"
            aria-label="Earnings categories"
            className="flex items-center gap-0.5 bg-surface-secondary rounded-full p-1 w-fit"
          >
            {TABS.map((tab, index) => (
              <button
                key={tab}
                ref={(el) => { tabRefs.current[index] = el; }}
                role="tab"
                aria-selected={activeTab === tab}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                onKeyDown={(e) => handleTabKeyDown(e, index)}
                className={cn(
                  "whitespace-nowrap text-[12px] font-medium px-3 py-1 rounded-full transition-all",
                  activeTab === tab
                    ? "bg-[#fff3ee] dark:bg-[#200d00] text-[#fd5000]"
                    : "text-text-muted hover:text-text-secondary"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Total earnings — reactive to tab + period ── */}
      <div className="mb-1">
        <p className="text-[11px] text-text-muted">Total Earnings</p>
      </div>
      <div className="flex flex-wrap items-baseline gap-2 sm:gap-2.5 mb-4">
        <span className="text-[24px] sm:text-[28px] font-extrabold tracking-tight text-text-primary">
          {displayTotal}
        </span>
        {displayChange && (
          <span
            className={cn(
              "flex items-center gap-1 text-[12px] font-medium",
              changePositive ? "text-[#30a46c]" : "text-red-500"
            )}
          >
            {changePositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {displayChange}
          </span>
        )}
        {compareMode && (
          <span className="text-[11px] text-text-muted font-medium px-2 py-0.5 bg-surface-secondary rounded-full">
            Comparing with previous period
          </span>
        )}
      </div>

      {/* ── Legend (interactive — click to toggle datasets) ── */}
      <div className="mb-4">
        {/* Mobile: 2-column grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:hidden">
          {baseDatasets.map((d) => {
            const isHidden = hiddenDatasets.has(d.label);
            return (
              <button
                key={d.label}
                type="button"
                onClick={() => toggleDataset(d.label)}
                aria-pressed={!isHidden}
                title={isHidden ? "Show dataset" : "Hide dataset"}
                className={cn(
                  "flex items-center gap-1.5 text-[12px] min-w-0 text-left",
                  "transition-opacity select-none",
                  isHidden ? "opacity-40" : "opacity-100"
                )}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ background: d.color }}
                />
                <span
                  className={cn(
                    "truncate",
                    isHidden ? "line-through text-text-muted" : "text-text-secondary"
                  )}
                >
                  {d.label}
                </span>
                <span className="text-text-muted flex-shrink-0">{d.amount}</span>
              </button>
            );
          })}
          <span className="col-span-2 text-[12px] text-text-muted mt-1">
            Total <span className="font-bold text-text-primary">{displayTotal}</span>
          </span>
        </div>

        {/* Desktop: flex row */}
        <div className="hidden sm:flex flex-wrap gap-4">
          {baseDatasets.map((d) => {
            const isHidden = hiddenDatasets.has(d.label);
            return (
              <button
                key={d.label}
                type="button"
                onClick={() => toggleDataset(d.label)}
                aria-pressed={!isHidden}
                title={isHidden ? "Show dataset" : "Hide dataset"}
                className={cn(
                  "flex items-center gap-1.5 text-[12px] cursor-pointer select-none",
                  "transition-opacity hover:opacity-80",
                  isHidden ? "opacity-40" : "opacity-100"
                )}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-sm"
                  style={{ background: d.color }}
                />
                <span
                  className={cn(
                    isHidden
                      ? "line-through text-text-muted"
                      : "text-text-secondary"
                  )}
                >
                  {d.label}
                </span>
                <span className="text-text-muted">{d.amount}</span>
              </button>
            );
          })}
          <span className="ml-auto text-[12px] text-text-muted">
            Total <span className="font-bold text-text-primary">{displayTotal}</span>
          </span>
        </div>
      </div>

      {/* ── Chart area ── */}
      <div className="relative h-[180px] sm:h-[200px] lg:h-[220px]">

        {/* Loading skeleton */}
        {!chartReady && !chartError && hasData && (
          <div className="absolute inset-0 flex items-end gap-1 pb-6 px-1">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm bg-surface-secondary animate-pulse"
                style={{
                  height: `${28 + Math.sin(i * 0.9) * 22 + 18}%`,
                  animationDelay: `${i * 50}ms`,
                }}
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {chartError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <AlertCircle size={20} className="text-red-400" />
            <p className="text-[13px] text-text-secondary font-medium">
              Failed to load chart
            </p>
            <p className="text-[12px] text-text-muted">
              Check your internet connection
            </p>
            <button
              onClick={() => {
                setChartError(false);
                setRetryCount((c) => c + 1);
              }}
              className="mt-1 text-[12px] font-semibold text-[#fd5000] hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!chartError && !hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <p className="text-[13px] font-medium text-text-secondary">
              No data for &ldquo;{activeTab}&rdquo;
            </p>
            <p className="text-[12px] text-text-muted">
              Try a different tab or period
            </p>
            <button
              onClick={() => setActiveTab("All")}
              className="mt-1 text-[12px] font-semibold text-[#fd5000] hover:underline"
            >
              Show all categories
            </button>
          </div>
        )}

        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Earnings overview line chart — ${activeTab} · ${activePeriod}`}
          className={cn(
            "transition-opacity duration-300",
            chartReady && hasData && !chartError
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
          )}
        />
      </div>
    </div>
  );
}