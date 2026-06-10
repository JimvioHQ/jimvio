"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Maximize2,
  X,
  Plus,
  Minus,
  RotateCcw,
  Locate,
  ZoomIn,
  Globe2,
  Search,
  Loader2,
  Moon,
  Sun,
  Route,
  RefreshCw,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

/* ─── Dynamic import ─────────────────────────────────────────────────────── */
const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center" style={{ background: "#020b18" }}>
      <div style={{
        width: 52, height: 52, borderRadius: "50%",
        border: "3px solid rgba(253,80,0,0.2)",
        borderTopColor: "#fd5000",
        animation: "spin 0.85s linear infinite",
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  ),
});

type GlobeMethods = {
  pointOfView: (
    pov?: { lat: number; lng: number; altitude: number },
    ms?: number
  ) => { lat: number; lng: number; altitude: number };
  controls: () => {
    autoRotate: boolean;
    autoRotateSpeed: number;
    enableZoom: boolean;
  };
  scene: () => any;     // THREE.Scene
  camera: () => any;    // THREE.PerspectiveCamera
  renderer: () => any;  // THREE.WebGLRenderer
};

/* ─── Data ───────────────────────────────────────────────────────────────── */
const CITIES = [
  // Africa
  { name: "Lagos", lat: 6.52, lng: 3.38, pop: 15000000 },
  { name: "Cairo", lat: 30.04, lng: 31.23, pop: 21000000 },
  { name: "Nairobi", lat: -1.29, lng: 36.82, pop: 4900000 },
  { name: "Johannesburg", lat: -26.20, lng: 28.04, pop: 6000000 },
  { name: "Cape Town", lat: -33.92, lng: 18.42, pop: 4600000 },
  { name: "Accra", lat: 5.56, lng: -0.20, pop: 2500000 },
  { name: "Addis Ababa", lat: 9.03, lng: 38.74, pop: 4600000 },
  { name: "Casablanca", lat: 33.59, lng: -7.62, pop: 3700000 },
  { name: "Kigali", lat: -1.95, lng: 30.06, pop: 1300000 },
  { name: "Kampala", lat: 0.31, lng: 32.58, pop: 1650000 },
  { name: "Dar es Salaam", lat: -6.80, lng: 39.29, pop: 5400000 },
  { name: "Abidjan", lat: 5.35, lng: -4.00, pop: 5200000 },
  { name: "Dakar", lat: 14.72, lng: -17.47, pop: 3700000 },
  { name: "Luanda", lat: -8.83, lng: 13.23, pop: 8400000 },
  { name: "Kinshasa", lat: -4.32, lng: 15.32, pop: 15600000 },
  // Americas
  { name: "New York", lat: 40.71, lng: -74.00, pop: 18800000 },
  { name: "Los Angeles", lat: 34.05, lng: -118.24, pop: 13000000 },
  { name: "Chicago", lat: 41.85, lng: -87.65, pop: 9500000 },
  { name: "Toronto", lat: 43.70, lng: -79.42, pop: 6200000 },
  { name: "Mexico City", lat: 19.43, lng: -99.13, pop: 21600000 },
  { name: "São Paulo", lat: -23.54, lng: -46.63, pop: 22400000 },
  { name: "Rio de Janeiro", lat: -22.90, lng: -43.17, pop: 13500000 },
  { name: "Buenos Aires", lat: -34.60, lng: -58.38, pop: 15000000 },
  { name: "Bogotá", lat: 4.71, lng: -74.07, pop: 10700000 },
  { name: "Lima", lat: -12.04, lng: -77.02, pop: 11000000 },
  { name: "Santiago", lat: -33.45, lng: -70.67, pop: 7100000 },
  { name: "Vancouver", lat: 49.24, lng: -123.11, pop: 2600000 },
  { name: "Miami", lat: 25.77, lng: -80.19, pop: 6200000 },
  // Europe
  { name: "London", lat: 51.50, lng: -0.12, pop: 9700000 },
  { name: "Paris", lat: 48.85, lng: 2.35, pop: 11000000 },
  { name: "Berlin", lat: 52.52, lng: 13.40, pop: 3700000 },
  { name: "Madrid", lat: 40.42, lng: -3.70, pop: 6700000 },
  { name: "Rome", lat: 41.90, lng: 12.49, pop: 4200000 },
  { name: "Amsterdam", lat: 52.37, lng: 4.90, pop: 2500000 },
  { name: "Moscow", lat: 55.75, lng: 37.61, pop: 12600000 },
  { name: "Istanbul", lat: 41.01, lng: 28.96, pop: 15400000 },
  { name: "Warsaw", lat: 52.23, lng: 21.01, pop: 1800000 },
  { name: "Vienna", lat: 48.21, lng: 16.37, pop: 1900000 },
  { name: "Stockholm", lat: 59.33, lng: 18.07, pop: 1600000 },
  { name: "Athens", lat: 37.98, lng: 23.72, pop: 3600000 },
  { name: "Barcelona", lat: 41.38, lng: 2.17, pop: 5600000 },
  { name: "Munich", lat: 48.14, lng: 11.58, pop: 1500000 },
  { name: "Kyiv", lat: 50.45, lng: 30.52, pop: 2900000 },
  // Asia
  { name: "Tokyo", lat: 35.69, lng: 139.69, pop: 37700000 },
  { name: "Shanghai", lat: 31.22, lng: 121.47, pop: 24900000 },
  { name: "Beijing", lat: 39.92, lng: 116.38, pop: 21500000 },
  { name: "Delhi", lat: 28.66, lng: 77.22, pop: 32900000 },
  { name: "Mumbai", lat: 19.08, lng: 72.88, pop: 20700000 },
  { name: "Dhaka", lat: 23.72, lng: 90.40, pop: 22400000 },
  { name: "Karachi", lat: 24.86, lng: 67.01, pop: 16100000 },
  { name: "Kolkata", lat: 22.57, lng: 88.36, pop: 15100000 },
  { name: "Lahore", lat: 31.54, lng: 74.34, pop: 13700000 },
  { name: "Chengdu", lat: 30.65, lng: 104.07, pop: 9000000 },
  { name: "Bangkok", lat: 13.75, lng: 100.52, pop: 10700000 },
  { name: "Singapore", lat: 1.35, lng: 103.82, pop: 5800000 },
  { name: "Jakarta", lat: -6.21, lng: 106.84, pop: 34500000 },
  { name: "Seoul", lat: 37.57, lng: 126.97, pop: 9700000 },
  { name: "Osaka", lat: 34.69, lng: 135.50, pop: 19000000 },
  { name: "Taipei", lat: 25.03, lng: 121.56, pop: 4100000 },
  { name: "Hong Kong", lat: 22.33, lng: 114.16, pop: 7500000 },
  { name: "Kuala Lumpur", lat: 3.14, lng: 101.69, pop: 8400000 },
  { name: "Dubai", lat: 25.20, lng: 55.27, pop: 3500000 },
  { name: "Riyadh", lat: 24.69, lng: 46.72, pop: 7700000 },
  { name: "Tehran", lat: 35.69, lng: 51.42, pop: 9600000 },
  { name: "Kabul", lat: 34.52, lng: 69.18, pop: 4600000 },
  { name: "Tashkent", lat: 41.30, lng: 69.24, pop: 2500000 },
  { name: "Bangalore", lat: 12.97, lng: 77.59, pop: 12700000 },
  { name: "Shenzhen", lat: 22.54, lng: 114.05, pop: 12600000 },
  // Oceania
  { name: "Sydney", lat: -33.87, lng: 151.21, pop: 5300000 },
  { name: "Melbourne", lat: -37.81, lng: 144.96, pop: 5100000 },
  { name: "Auckland", lat: -36.86, lng: 174.77, pop: 1700000 },
];

const ROUTES = [
  { from: "Lagos", to: "London" },
  { from: "New York", to: "São Paulo" },
  { from: "London", to: "Mumbai" },
  { from: "Tokyo", to: "Singapore" },
  { from: "Dubai", to: "Nairobi" },
  { from: "Sydney", to: "Tokyo" },
  { from: "Mexico City", to: "New York" },
  { from: "Cairo", to: "Dubai" },
  { from: "Kigali", to: "London" },
  { from: "Johannesburg", to: "Mumbai" },
  { from: "Singapore", to: "Sydney" },
  { from: "Mumbai", to: "Nairobi" },
  { from: "Berlin", to: "New York" },
  { from: "Shanghai", to: "Los Angeles" },
  { from: "Seoul", to: "Tokyo" },
  { from: "Moscow", to: "Beijing" },
  { from: "Paris", to: "Casablanca" },
  { from: "Buenos Aires", to: "São Paulo" },
  { from: "Riyadh", to: "Cairo" },
  { from: "Hong Kong", to: "Sydney" },
  { from: "London", to: "New York" },
  { from: "Dubai", to: "Mumbai" },
  { from: "Tokyo", to: "Los Angeles" },
  { from: "Lagos", to: "Nairobi" },
];

/* ─── Activity data ─────────────────────────────────────────────────────── */
type ActivityCard = {
  id: string;
  iconEmoji: string;
  iconBg: string;
  event: string;
  city: string;
  amount?: string;
  inlineStyle: React.CSSProperties;
  fullscreenStyle: React.CSSProperties;
};

const ACTIVITY_CARDS: ActivityCard[] = [
  {
    id: "ebook", iconEmoji: "📘", iconBg: "#dbeafe",
    event: "Ebook Sold", city: "London, UK", amount: "$29",
    inlineStyle: { top: "7%", left: "3%" },
    fullscreenStyle: { top: "10%", left: "6%" },
  },
  {
    id: "commission", iconEmoji: "💰", iconBg: "#fef3c7",
    event: "Commission Earned", city: "New York, USA", amount: "$142",
    inlineStyle: { top: "15%", right: "3%" },
    fullscreenStyle: { top: "12%", right: "6%" },
  },
  {
    id: "creator", iconEmoji: "👤", iconBg: "#dcfce7",
    event: "Creator Signup", city: "Lagos, Nigeria",
    inlineStyle: { top: "48%", left: "1%" },
    fullscreenStyle: { top: "42%", left: "4%" },
  },
  {
    id: "sale", iconEmoji: "🛒", iconBg: "#ffedd5",
    event: "Product Sale", city: "Kigali, Rwanda", amount: "$89",
    inlineStyle: { top: "52%", left: "38%" },
    fullscreenStyle: { top: "52%", left: "42%" },
  },
  {
    id: "ugc", iconEmoji: "🎬", iconBg: "#f3e8ff",
    event: "UGC Campaign", city: "São Paulo, Brazil",
    inlineStyle: { bottom: "20%", left: "3%" },
    fullscreenStyle: { bottom: "22%", left: "6%" },
  },
  {
    id: "community", iconEmoji: "👥", iconBg: "#fce7f3",
    event: "Community Join", city: "Cape Town, SA",
    inlineStyle: { bottom: "8%", right: "3%" },
    fullscreenStyle: { bottom: "10%", right: "6%" },
  },
];

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function ActivityBadge({
  card, style, delay, isDark,
}: {
  card: ActivityCard;
  style: React.CSSProperties;
  delay: number;
  isDark: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="absolute flex items-center gap-2.5 pointer-events-none"
      style={{
        ...style,
        background: isDark ? "rgba(4,9,26,0.9)" : "rgba(255,255,255,0.95)",
        boxShadow: isDark
          ? "0 4px 20px rgba(0,0,0,0.6)"
          : "0 4px 20px rgba(0,0,0,0.1)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: isDark
          ? "0.5px solid rgba(255,255,255,0.1)"
          : "0.5px solid rgba(0,0,0,0.07)",
        borderRadius: 14,
        padding: "7px 12px",
        minWidth: 152,
        maxWidth: 200,
        zIndex: 10,
      }}
    >
      <div
        className="flex items-center justify-center shrink-0 rounded-lg text-sm"
        style={{ width: 28, height: 28, background: card.iconBg }}
      >
        {card.iconEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="font-semibold leading-tight truncate"
          style={{ fontSize: 11, color: isDark ? "#ededed" : "#111" }}
        >
          {card.event}
        </div>
        <div
          className="leading-tight truncate"
          style={{ fontSize: 9, color: isDark ? "rgba(255,255,255,0.38)" : "#999" }}
        >
          {card.city}
        </div>
      </div>
      {card.amount && (
        <div
          className="shrink-0 font-bold"
          style={{ fontSize: 11, color: "#fd5000" }}
        >
          {card.amount}
        </div>
      )}
    </motion.div>
  );
}

function CountryTooltip({
  name, pos, isDark,
}: {
  name: string;
  pos: { x: number; y: number } | null;
  isDark: boolean;
}) {
  if (!name || !pos) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: pos.x + 14,
        top: pos.y - 12,
        background: isDark ? "rgba(4,9,26,0.95)" : "rgba(255,255,255,0.96)",
        border: "0.5px solid rgba(253,80,0,0.45)",
        color: isDark ? "#ededed" : "#111",
        fontSize: 12,
        fontWeight: 700,
        padding: "5px 11px",
        borderRadius: 8,
        pointerEvents: "none",
        zIndex: 20,
        backdropFilter: "blur(10px)",
        whiteSpace: "nowrap",
        letterSpacing: 0.4,
        boxShadow: isDark
          ? "0 4px 16px rgba(0,0,0,0.6)"
          : "0 4px 16px rgba(0,0,0,0.1)",
      }}
    >
      {name}
    </div>
  );
}

/* ── Button style factory ── */
function ctrlBtn(
  isDark: boolean,
  accent?: { color: string; border: string }
): React.CSSProperties {
  return {
    width: 34,
    height: 34,
    borderRadius: 9,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: isDark ? "rgba(4,9,26,0.88)" : "rgba(255,255,255,0.92)",
    borderWidth: "0.5px",
    borderStyle: "solid",
    borderColor: accent?.border ?? (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"),
    color: accent?.color ?? (isDark ? "rgba(237,237,237,0.82)" : "rgba(17,17,17,0.78)"),
    cursor: "pointer",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    transition: "all 0.15s",
    outline: "none",
    boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.45)" : "0 2px 8px rgba(0,0,0,0.07)",
  };
}

function GlobeControls({
  onZoomIn, onZoomOut, onReset, onLocate, onMaxZoom,
  onToggleNight, onToggleArcs, onToggleRotate,
  nightMode, arcsOn, rotating, isDark,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onLocate: () => void;
  onMaxZoom: () => void;
  onToggleNight: () => void;
  onToggleArcs: () => void;
  onToggleRotate: () => void;
  nightMode: boolean;
  arcsOn: boolean;
  rotating: boolean;
  isDark: boolean;
}) {
  const base = ctrlBtn(isDark);
  return (
    <div
      className="absolute flex flex-col gap-1.5"
      style={{ top: 14, left: 14, zIndex: 15 }}
    >
      <button onClick={onZoomIn} style={base} title="Zoom in"><Plus size={13} /></button>
      <button onClick={onZoomOut} style={base} title="Zoom out"><Minus size={13} /></button>
      <button
        onClick={onMaxZoom}
        style={ctrlBtn(isDark, { color: "#facc15", border: "rgba(250,204,21,0.4)" })}
        title="Max zoom"
      >
        <ZoomIn size={12} />
      </button>
      <button onClick={onReset} style={base} title="Reset"><RotateCcw size={12} /></button>
      <button
        onClick={onLocate}
        style={ctrlBtn(isDark, { color: "#22c55e", border: "rgba(34,197,94,0.35)" })}
        title="My location"
      >
        <Locate size={12} />
      </button>

      {/* divider */}
      <div style={{ height: "0.5px", background: "rgba(255,255,255,0.1)", margin: "2px 0" }} />

      {/* Night toggle */}
      <button
        onClick={onToggleNight}
        style={ctrlBtn(isDark, nightMode
          ? { color: "#facc15", border: "rgba(250,204,21,0.4)" }
          : undefined
        )}
        title={nightMode ? "Switch to day" : "Switch to night"}
      >
        {nightMode ? <Sun size={12} /> : <Moon size={12} />}
      </button>

      {/* Arcs toggle */}
      <button
        onClick={onToggleArcs}
        style={ctrlBtn(isDark, !arcsOn
          ? { color: "rgba(255,255,255,0.3)", border: "rgba(255,255,255,0.06)" }
          : { color: "#60a5fa", border: "rgba(96,165,250,0.35)" }
        )}
        title={arcsOn ? "Hide routes" : "Show routes"}
      >
        <Route size={12} />
      </button>

      {/* Auto-rotate toggle */}
      <button
        onClick={onToggleRotate}
        style={ctrlBtn(isDark, rotating
          ? { color: "#fd5000", border: "rgba(253,80,0,0.35)" }
          : undefined
        )}
        title={rotating ? "Pause rotation" : "Resume rotation"}
      >
        <RefreshCw size={12} />
      </button>
    </div>
  );
}

/* ── Location search ── */
function LocationSearch({
  onSelect, isDark,
}: {
  onSelect: (lat: number, lng: number, name: string) => void;
  isDark: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setOpen(false); return; }
    const t = setTimeout(() => {
      setLoading(true);
      fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`
      )
        .then((r) => r.json())
        .then((d) => { setResults(Array.isArray(d) ? d : []); setOpen(true); })
        .catch(() => { })
        .finally(() => setLoading(false));
    }, 420);
    return () => clearTimeout(t);
  }, [query]);

  const panelBg = isDark
    ? "rgba(4,9,26,0.96)"
    : "rgba(255,255,255,0.96)";
  const panelBorder = isDark
    ? "0.5px solid rgba(255,255,255,0.1)"
    : "0.5px solid rgba(0,0,0,0.09)";

  return (
    <div className="absolute top-3.5 right-3.5 z-20 w-60">
      {/* Input row */}
      <div
        className="relative flex items-center px-3 py-2 rounded-2xl"
        style={{
          background: panelBg,
          border: panelBorder,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: isDark
            ? "0 4px 20px rgba(0,0,0,0.5)"
            : "0 4px 16px rgba(0,0,0,0.08)",
        }}
      >
        <Search size={13} className="mr-2 shrink-0" style={{ color: isDark ? "#555" : "#aaa" }} />
        <input
          type="text"
          placeholder="Search places…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="bg-transparent border-none outline-none w-full text-xs font-medium"
          style={{ color: isDark ? "#ededed" : "#111" }}
        />
        {loading && <Loader2 size={11} className="animate-spin shrink-0 ml-1" style={{ color: "#fd5000" }} />}
        {query && !loading && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="ml-1 shrink-0"
          >
            <X size={11} style={{ color: isDark ? "#555" : "#bbb" }} />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="absolute top-full mt-2 left-0 right-0 rounded-xl overflow-hidden"
            style={{
              background: panelBg,
              border: panelBorder,
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              boxShadow: isDark
                ? "0 8px 32px rgba(0,0,0,0.6)"
                : "0 8px 24px rgba(0,0,0,0.1)",
            }}
          >
            {results.map((r: any, i: number) => (
              <div
                key={r.place_id}
                className="px-3 py-2.5 cursor-pointer transition-colors"
                style={{
                  borderBottom:
                    i < results.length - 1
                      ? isDark
                        ? "0.5px solid rgba(255,255,255,0.06)"
                        : "0.5px solid rgba(0,0,0,0.05)"
                      : "none",
                }}
                onClick={() => {
                  setQuery("");
                  setOpen(false);
                  onSelect(
                    parseFloat(r.lat),
                    parseFloat(r.lon),
                    r.display_name.split(",")[0]
                  );
                }}
                onMouseEnter={(e) =>
                (e.currentTarget.style.background = isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(0,0,0,0.04)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  className="font-semibold truncate"
                  style={{ fontSize: 12, color: isDark ? "#fff" : "#000" }}
                >
                  {r.display_name.split(",")[0]}
                </div>
                <div
                  className="truncate mt-0.5"
                  style={{ fontSize: 10, color: isDark ? "rgba(255,255,255,0.38)" : "#aaa" }}
                >
                  {r.display_name.split(",").slice(1, 3).join(",")}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── GlobeView ─────────────────────────────────────────────────────────── */
function GlobeView({
  containerRef,
  showControls = true,
  showCards = true,
  cardStyle = "inline",
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  showControls?: boolean;
  showCards?: boolean;
  cardStyle?: "inline" | "fullscreen";
}) {
  const globeRef = useRef<GlobeMethods | null>(null);

  // State
  const [nightMode, setNightMode] = useState(false);
  const [arcsOn, setArcsOn] = useState(true);
  const [rotating, setRotating] = useState(true);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [searchTarget, setSearchTarget] = useState<{
    lat: number; lng: number; name: string;
  } | null>(null);
  const [localPlaces, setLocalPlaces] = useState<any[]>([]);
  const [countriesData, setCountriesData] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState({ width: 520, height: 490 });

  // Store pre-parsed city data {lat,lng,name} for fast filtering
  const lastFetchRef = useRef<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const citiesDbRef = useRef<{ lat: number; lng: number; name: string }[]>([]);
  const isZoomedInRef = useRef(false);
  const cloudMeshRef = useRef<any>(null); // THREE.Mesh for cloud layer
  const cloudAnimRef = useRef<number | null>(null);

  // Theme
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = !mounted || resolvedTheme === "dark";

  // Load country polygons
  useEffect(() => {
    fetch(
      "https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson/ne_110m_admin_0_countries.geojson"
    )
      .then((r) => r.json())
      .then((d) => setCountriesData(d?.features ?? []))
      .catch(() => { });
  }, []);

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setDimensions({ width: el.clientWidth || 520, height: el.clientHeight || 490 })
    );
    ro.observe(el);
    setDimensions({ width: el.clientWidth || 520, height: el.clientHeight || 490 });
    return () => ro.disconnect();
  }, [containerRef]);

  // Mouse position → tooltip
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fn = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setTooltipPos({ x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener("mousemove", fn);
    return () => el.removeEventListener("mousemove", fn);
  }, [containerRef]);

  // Auto-rotate on mount
  useEffect(() => {
    const t = setTimeout(() => {
      if (!globeRef.current) return;
      const c = globeRef.current.controls();
      c.autoRotate = true;
      c.autoRotateSpeed = 0.38;
    }, 600);
    return () => clearTimeout(t);
  }, []);

  // Dynamic LOD — 128k cities dataset
  // Pre-parse lat/lng to floats ONCE on load so the interval stays fast
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/cities.json@1.1.5/cities.json")
      .then((r) => r.json())
      .then((d: any[]) => {
        if (!Array.isArray(d)) return;
        // Pre-parse into fast lookup objects (do it once, not every poll)
        citiesDbRef.current = d
          .filter((c) => c.lat != null && c.lng != null)
          .map((c) => ({
            lat: typeof c.lat === 'number' ? c.lat : parseFloat(c.lat),
            lng: typeof c.lng === 'number' ? c.lng : parseFloat(c.lng),
            name: c.name ?? c.city ?? '',
          }))
          .filter((c) => !isNaN(c.lat) && !isNaN(c.lng));
      })
      .catch(() => { });

    // Poll globe viewport — lightweight: only simple number comparisons
    const id = setInterval(() => {
      if (!globeRef.current) return;
      const pov = globeRef.current.pointOfView();
      const zoomed = pov.altitude < 0.15;
      isZoomedInRef.current = zoomed;

      if (!zoomed) {
        // Use functional updater to avoid stale closure dependency
        setLocalPlaces((prev) => (prev.length > 0 ? [] : prev));
        return;
      }

      const db = citiesDbRef.current;
      if (!db.length) return;

      const last = lastFetchRef.current;
      const moved = Math.abs(pov.lat - last.lat) + Math.abs(pov.lng - last.lng);
      if (moved < 0.02) return; // Haven't moved enough — skip

      lastFetchRef.current = { lat: pov.lat, lng: pov.lng };
      const box = 1.0;
      const lat = pov.lat;
      const lng = pov.lng;

      // Fast O(n) filter with pre-parsed numbers — no parseFloat per call
      const nearby: { lat: number; lng: number; name: string }[] = [];
      for (let i = 0; i < db.length; i++) {
        const c = db[i];
        if (Math.abs(c.lat - lat) < box && Math.abs(c.lng - lng) < box) {
          nearby.push(c);
        }
      }

      // Sort by distance squared (fast, no sqrt needed)
      nearby.sort((a, b) =>
        (a.lat - lat) ** 2 + (a.lng - lng) ** 2 -
        ((b.lat - lat) ** 2 + (b.lng - lng) ** 2)
      );

      setLocalPlaces(nearby.slice(0, 40));
    }, 1200); // Poll every 1.2s — smooth enough, avoids main-thread pressure

    return () => {
      clearInterval(id);
      // Cleanup cloud animation on unmount
      if (cloudAnimRef.current !== null) {
        cancelAnimationFrame(cloudAnimRef.current);
      }
    };
  }, []); // No dependencies — interval is self-contained via refs

  /* ── Arc data — neon orange/gold/amber routes ── */
  const arcsData = useMemo(() => {
    const cityMap = Object.fromEntries(CITIES.map((c) => [c.name, c]));
    return ROUTES.flatMap((rt, i) => {
      const from = cityMap[rt.from];
      const to = cityMap[rt.to];
      if (!from || !to) return [];
      // Cinematic orange/amber/gold palette — brand-matched neon routes
      const colors = [
        ["rgba(253,80,0,0.95)",  "rgba(255,160,30,0.95)"],  // vivid orange → amber
        ["rgba(255,200,0,0.90)", "rgba(253,120,0,0.90)"],   // gold → orange
        ["rgba(255,120,0,0.92)", "rgba(255,220,60,0.92)"],  // orange → yellow-gold
        ["rgba(253,80,0,0.85)",  "rgba(255,60,0,0.85)"],    // orange → red-orange
      ];
      return [{
        startLat: from.lat, startLng: from.lng,
        endLat: to.lat, endLng: to.lng,
        color: colors[i % 4],
        dashAnimateTime: 1400 + (i % 6) * 200,
      }];
    });
  }, []);

  /* ── Labels ── */
  const cityLabels = useMemo(
    () =>
      CITIES.map((c) => ({
        lat: c.lat, lng: c.lng,
        text: c.name,
        size: c.pop,
        color:
          c.pop > 20000000
            ? "#ff5500"        // vivid orange — mega cities
            : c.pop > 10000000
              ? "#ffaa00"      // bright amber
              : c.pop > 4000000
                ? "#ffd060"    // warm gold
                : "#ffe8b0",   // pale gold — smaller cities
        isLocal: false,
      })),
    []
  );

  const dynamicLabels = useMemo(
    () =>
      localPlaces.map((p) => ({
        lat: p.lat,   // already a float — pre-parsed on load
        lng: p.lng,
        text: p.name,
        size: 350000,
        color: "#38bdf8",
        isLocal: true,
      })),
    [localPlaces]
  );

  const allLabels = useMemo(() => {
    const base = [...cityLabels, ...dynamicLabels];
    if (searchTarget)
      return [
        ...base,
        { ...searchTarget, size: 60000000, color: "#fd5000", isLocal: false },
      ];
    return base;
  }, [cityLabels, dynamicLabels, searchTarget]);

  /* ── Ring data — glowing data hub pulses ── */
  const ringsData = useMemo(() => [
    // Mega cities — large vivid orange rings
    ...CITIES.filter((c) => c.pop > 15000000).map((c) => ({
      lat: c.lat, lng: c.lng,
      maxR: 5.5,
      color: "rgba(253,80,0,{opacity})",
    })),
    // Large cities — medium amber/gold rings
    ...CITIES.filter((c) => c.pop > 6000000 && c.pop <= 15000000).map((c) => ({
      lat: c.lat, lng: c.lng,
      maxR: 3.8,
      color: "rgba(255,190,0,{opacity})",
    })),
    // Medium cities — small gold rings
    ...CITIES.filter((c) => c.pop > 2500000 && c.pop <= 6000000).map((c) => ({
      lat: c.lat, lng: c.lng,
      maxR: 2.4,
      color: "rgba(255,220,60,{opacity})",
    })),
    // Search target — extra bright ring
    ...(searchTarget
      ? [{ lat: searchTarget.lat, lng: searchTarget.lng, maxR: 6.5, color: "rgba(253,80,0,{opacity})" }]
      : []),
  ], [searchTarget]);

  /* ── Controls logic ── */
  const zoomBy = useCallback((delta: number) => {
    if (!globeRef.current) return;
    const pov = globeRef.current.pointOfView();
    globeRef.current.pointOfView(
      { lat: pov.lat, lng: pov.lng, altitude: Math.max(0.04, Math.min(4.0, pov.altitude + delta)) },
      420
    );
  }, []);

  const handleZoomIn = useCallback(() => zoomBy(-0.32), [zoomBy]);
  const handleZoomOut = useCallback(() => zoomBy(0.32), [zoomBy]);
  const handleMaxZoom = useCallback(() => {
    if (!globeRef.current) return;
    const pov = globeRef.current.pointOfView();
    globeRef.current.pointOfView({ ...pov, altitude: 0.10 }, 850);
  }, []);
  const handleReset = useCallback(() => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 900);
    globeRef.current.controls().autoRotate = true;
    setRotating(true);
    setSelectedCountry(null);
    setSearchTarget(null);
  }, []);
  const handleLocate = useCallback(() => {
    if (!navigator?.geolocation || !globeRef.current) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude: lat, longitude: lng } = pos.coords;
      setSearchTarget({ lat, lng, name: "My Location" });
      globeRef.current!.pointOfView({ lat, lng, altitude: 0.06 }, 1300);
      globeRef.current!.controls().autoRotate = false;
      setRotating(false);
    });
  }, []);
  const handleSearch = useCallback((lat: number, lng: number, name: string) => {
    if (!globeRef.current) return;
    setSearchTarget({ lat, lng, name });
    globeRef.current.pointOfView({ lat, lng, altitude: 0.06 }, 1500);
    globeRef.current.controls().autoRotate = false;
    setRotating(false);
  }, []);

  const handleToggleRotate = useCallback(() => {
    if (!globeRef.current) return;
    const next = !rotating;
    globeRef.current.controls().autoRotate = next;
    setRotating(next);
  }, [rotating]);

  /* ── Polygon colour ── */
  const polyCapColor = useCallback(
    (feat: any) => {
      const n = feat?.properties?.ADMIN || feat?.properties?.NAME;
      if (n === selectedCountry) return "rgba(253,80,0,0.32)";
      if (n === hoveredCountry) return "rgba(253,80,0,0.16)";
      return isDark ? "rgba(100,160,255,0.04)" : "rgba(60,120,200,0.06)";
    },
    [hoveredCountry, selectedCountry, isDark]
  );

  const polyStrokeColor = useCallback(
    (feat: any) => {
      const n = feat?.properties?.ADMIN || feat?.properties?.NAME;
      if (n === selectedCountry) return "rgba(253,80,0,0.9)";
      if (n === hoveredCountry) return "rgba(253,80,0,0.55)";
      return isDark ? "rgba(130,190,255,0.35)" : "rgba(100,160,255,0.45)";
    },
    [hoveredCountry, selectedCountry, isDark]
  );

  /* ── Texture URLs — NASA / Blue-Marble high-res ── */
  const globeImageUrl = nightMode
    ? "https://unpkg.com/three-globe/example/img/earth-night.jpg"
    : isDark
      // Blue Marble 2048x1024 from NASA via three-globe CDN — deeper blues, vivid relief
      ? "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      : "https://unpkg.com/three-globe/example/img/earth-day.jpg";

  const backgroundUrl =
    isDark || nightMode
      ? "https://unpkg.com/three-globe/example/img/night-sky.png"
      : "";

  // Cinematic atmosphere — wide orange-amber glow in dark, sky-blue in light
  const atmosphereColor = nightMode
    ? "#1144cc"
    : isDark
      ? "#ff6820"
      : "#3399ff";
  const atmosphereAlt = nightMode ? 0.22 : isDark ? 0.26 : 0.18;

  /* ── Globe ready — cinematic lighting + rotating cloud sphere ── */
  const handleGlobeReady = useCallback(() => {
    if (!globeRef.current) return;
    const scene = (globeRef.current as any).scene?.();
    const renderer = (globeRef.current as any).renderer?.();
    if (!scene || !renderer) return;

    import("three").then((THREE) => {
      // Boost renderer for richer, more vibrant colors
      renderer.toneMappingExposure = 1.35;

      // Warm sun light from upper-right (key light)
      const sunLight = new THREE.DirectionalLight(0xfff0e0, 2.6);
      sunLight.position.set(200, 120, 80);
      scene.add(sunLight);

      // Cool fill from opposite side (earthshine scatter)
      const fillLight = new THREE.DirectionalLight(0x4466aa, 0.5);
      fillLight.position.set(-200, -60, -100);
      scene.add(fillLight);

      // Dark ambient base to lift deep shadows subtly
      const ambient = new THREE.AmbientLight(0x112244, 0.7);
      scene.add(ambient);

      // Cloud sphere — semi-transparent rotating above surface
      const cloudGeo = new THREE.SphereGeometry(101.5, 64, 64);
      const cloudLoader = new THREE.TextureLoader();
      cloudLoader.load(
        "https://unpkg.com/three-globe/example/img/earth-clouds.png",
        (tex: any) => {
          const cloudMat = new THREE.MeshPhongMaterial({
            map: tex,
            transparent: true,
            opacity: isDark ? 0.38 : 0.28,
            depthWrite: false,
          });
          const clouds = new THREE.Mesh(cloudGeo, cloudMat);
          scene.add(clouds);
          cloudMeshRef.current = clouds;

          const animateClouds = () => {
            if (cloudMeshRef.current) cloudMeshRef.current.rotation.y += 0.000075;
            cloudAnimRef.current = requestAnimationFrame(animateClouds);
          };
          animateClouds();
        }
      );
    }).catch(() => { /* THREE not available — skip silently */ });
  }, [isDark]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <Globe
        ref={globeRef as any}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl={globeImageUrl}
        bumpImageUrl="https://unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl={backgroundUrl}
        atmosphereColor={atmosphereColor}
        atmosphereAltitude={atmosphereAlt}
        showAtmosphere={true}
        showGraticules={false}
        onGlobeReady={handleGlobeReady}

        /* Country polygons */
        polygonsData={countriesData}
        polygonCapColor={polyCapColor}
        polygonSideColor={() => "rgba(0,0,0,0)"}
        polygonStrokeColor={polyStrokeColor}
        polygonAltitude={(feat: any) => {
          const n = feat?.properties?.ADMIN || feat?.properties?.NAME;
          return n === selectedCountry ? 0.007 : 0.001;
        }}
        onPolygonHover={(feat: any) => {
          const n = feat?.properties?.ADMIN || feat?.properties?.NAME || null;
          setHoveredCountry(n);
          if (!feat) setTooltipPos(null);
        }}
        onPolygonClick={(feat: any) => {
          const n = feat?.properties?.ADMIN || feat?.properties?.NAME || null;
          setSelectedCountry((prev) => (prev === n ? null : n));
          const p = feat?.properties;
          if (p?.LABEL_X != null && p?.LABEL_Y != null && globeRef.current) {
            globeRef.current.pointOfView(
              { lat: p.LABEL_Y, lng: p.LABEL_X, altitude: 0.55 },
              900
            );
            globeRef.current.controls().autoRotate = false;
            setRotating(false);
          }
        }}
        polygonLabel={() => ""}

        /* Labels */
        labelsData={allLabels}
        labelLat="lat"
        labelLng="lng"
        labelText="text"
        labelSize={(d: any) => d.isLocal ? 0.30 : Math.sqrt(d.size) * 5.5e-4}
        labelDotRadius={(d: any) => d.isLocal ? 0.18 : Math.sqrt(d.size) * 3.2e-4}
        labelColor={(d: any) => d.color}
        labelResolution={3}
        labelAltitude={(d: any) => (d.isLocal ? 0.001 : 0.003)}
        onLabelClick={(d: any) => {
          if (!globeRef.current) return;
          globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 0.06 }, 1300);
          globeRef.current.controls().autoRotate = false;
          setRotating(false);
          setSearchTarget({ lat: d.lat, lng: d.lng, name: d.text });
        }}

        /* Arcs — neon orange/gold cinematic routes */
        arcsData={arcsOn ? arcsData : []}
        arcColor="color"
        arcAltitude={0.32}
        arcStroke={1.2}
        arcDashLength={0.5}
        arcDashGap={0.12}
        arcDashAnimateTime={(d: any) => d.dashAnimateTime ?? 1800}

        /* Rings — vivid glowing data hubs */
        ringsData={ringsData}
        ringColor={(d: any) => (t: number) => {
          const base = d.color || "rgba(253,80,0,{opacity})";
          // Keep full glow near origin, fade to transparent
          const alpha = Math.max(0, Math.pow(1 - t, 1.5));
          return base.replace("{opacity}", `${alpha}`);
        }}
        ringMaxRadius={(d: any) => d.maxR ?? 3.5}
        ringPropagationSpeed={2.8}
        ringRepeatPeriod={900}
      />

      {showControls && <LocationSearch onSelect={handleSearch} isDark={isDark} />}

      <CountryTooltip
        name={hoveredCountry ?? ""}
        pos={tooltipPos}
        isDark={isDark}
      />

      {showCards &&
        ACTIVITY_CARDS.map((card, i) => (
          <ActivityBadge
            key={card.id}
            card={card}
            style={cardStyle === "inline" ? card.inlineStyle : card.fullscreenStyle}
            delay={0.35 + i * 0.1}
            isDark={isDark}
          />
        ))}

      {showControls && (
        <GlobeControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
          onLocate={handleLocate}
          onMaxZoom={handleMaxZoom}
          onToggleNight={() => setNightMode((n) => !n)}
          onToggleArcs={() => setArcsOn((a) => !a)}
          onToggleRotate={handleToggleRotate}
          nightMode={nightMode}
          arcsOn={arcsOn}
          rotating={rotating}
          isDark={isDark}
        />
      )}

      {/* Selected / search banner */}
      <AnimatePresence>
        {(selectedCountry || searchTarget) && (
          <motion.div
            key="banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "absolute",
              top: 14,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(253,80,0,0.92)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 12,
              padding: "5px 16px",
              borderRadius: 20,
              zIndex: 20,
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              letterSpacing: 0.4,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(253,80,0,0.4)",
              whiteSpace: "nowrap",
            }}
            onClick={() => {
              setSelectedCountry(null);
              setSearchTarget(null);
            }}
          >
            📍 {searchTarget ? searchTarget.name : selectedCountry}&nbsp;&nbsp;✕
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Fullscreen Modal ───────────────────────────────────────────────────── */
function FullscreenModal({ onClose }: { onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = !mounted || resolvedTheme === "dark";

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  const content = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: isDark ? "#020b18" : "#e8f0f8" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{
          borderBottom: isDark
            ? "0.5px solid rgba(255,255,255,0.07)"
            : "0.5px solid rgba(0,0,0,0.08)",
          background: isDark
            ? "rgba(2,11,24,0.94)"
            : "rgba(240,246,255,0.94)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <span
            className="rounded-full"
            style={{ width: 7, height: 7, background: "#22c55e", boxShadow: "0 0 8px #22c55e", display: "block", animation: "pulse 2s ease-in-out infinite" }}
          />
          <span
            className="text-sm font-semibold"
            style={{ color: isDark ? "rgba(237,237,237,0.82)" : "rgba(17,17,17,0.8)" }}
          >
            Global Activity — Live
          </span>
        </div>

        <div
          className="flex items-center gap-3 text-xs"
          style={{ color: isDark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.45)" }}
        >
          <span className="hidden sm:block">
            Scroll to zoom · Drag to rotate · Click country to select
          </span>
          <button
            onClick={onClose}
            aria-label="Close fullscreen"
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{
              width: 32, height: 32,
              border: isDark
                ? "0.5px solid rgba(255,255,255,0.14)"
                : "0.5px solid rgba(0,0,0,0.12)",
              color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Globe */}
      <div ref={containerRef} className="relative flex-1 overflow-hidden">
        <GlobeView
          containerRef={containerRef}
          showControls
          showCards
          cardStyle="fullscreen"
        />
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </motion.div>
  );

  return createPortal(content, document.body);
}

/* ─── GlobeCanvas (main export) ─────────────────────────────────────────── */
export function GlobeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = !mounted || resolvedTheme === "dark";

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <>
      <div className="relative w-full" style={{ aspectRatio: "520 / 490", minHeight: 320 }}>
        <div
          ref={containerRef}
          className="absolute inset-0 rounded-3xl overflow-hidden"
          onClick={() => { if (isMobile) setIsFullscreen(true); }}
          style={{ cursor: isMobile ? "pointer" : "default" }}
        >
          {isMobile ? (
            /* Mobile: show static placeholder, open fullscreen on tap */
            <div
              className="w-full h-full flex items-center justify-center"
              style={{ background: isDark ? "#020b18" : "#e8f0f8" }}
            >
              <div className="text-center">
                <Globe2
                  size={52}
                  className="mx-auto mb-3"
                  style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)" }}
                />
                <p
                  className="text-sm font-medium"
                  style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)" }}
                >
                  Tap for interactive globe
                </p>
              </div>
            </div>
          ) : (
            <GlobeView
              containerRef={containerRef}
              showControls
              showCards
              cardStyle="inline"
            />
          )}
        </div>

        {/* Full-view button */}
        <button
          onClick={() => setIsFullscreen(true)}
          aria-label="Open fullscreen globe"
          className="absolute flex items-center gap-1.5 rounded-xl transition-all hover:scale-105 active:scale-95"
          style={{
            bottom: 12, right: 12,
            background: isDark ? "rgba(2,11,24,0.84)" : "rgba(255,255,255,0.88)",
            border: isDark
              ? "0.5px solid rgba(253,80,0,0.3)"
              : "0.5px solid rgba(0,0,0,0.1)",
            color: isDark ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)",
            padding: "6px 13px",
            fontSize: 11,
            fontWeight: 700,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            zIndex: 10,
            cursor: "pointer",
          }}
        >
          <Maximize2 size={11} />
          Full View
        </button>
      </div>

      <AnimatePresence>
        {isFullscreen && (
          <FullscreenModal onClose={() => setIsFullscreen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}