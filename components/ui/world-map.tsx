"use client";

import { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import DottedMap from "dotted-map";

export type WorldMapPoint = {
  lat: number;
  lng: number;
  label?: string;
};

export type WorldMapDot = {
  start: WorldMapPoint;
  end: WorldMapPoint;
};

export type WorldMapPin = {
  lat: number;
  lng: number;
  color: string;
  size?: number;
};

type WorldMapProps = {
  dots?: WorldMapDot[];
  pins?: WorldMapPin[];
  lineColor?: string;
  className?: string;
  showArcs?: boolean;
};

/** Aceternity World Map — https://21st.dev/community/components/aceternity/world-map */
export function WorldMap({
  dots = [],
  pins = [],
  lineColor = "#fd5000",
  className = "",
  showArcs = true,
}: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  const mapImage = useMemo(() => {
    // Smaller grid keeps the dotted SVG compact while looking the same at card size.
    const map = new DottedMap({ height: 60, grid: "diagonal" });
    const svg = map.getSVG({
      radius: 0.28,
      color: "#94a3b8",
      shape: "circle",
      backgroundColor: "transparent",
    });
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, []);

  const projectPoint = (lat: number, lng: number) => {
    const x = (lng + 180) * (800 / 360);
    const y = (90 - lat) * (400 / 180);
    return { x, y };
  };

  const createCurvedPath = (start: { x: number; y: number }, end: { x: number; y: number }) => {
    const midX = (start.x + end.x) / 2;
    const midY = Math.min(start.y, end.y) - 50;
    return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
  };

  return (
    <div className={`relative aspect-[2/1] w-full overflow-hidden rounded-xl bg-[var(--color-surface-secondary)] ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mapImage}
        alt="World map"
        className="pointer-events-none h-full w-full select-none object-cover opacity-90"
        draggable={false}
      />
      <svg
        ref={svgRef}
        viewBox="0 0 800 400"
        className="pointer-events-none absolute inset-0 h-full w-full select-none"
        aria-hidden
      >
        {showArcs && dots.map((dot, i) => {
          const startPoint = projectPoint(dot.start.lat, dot.start.lng);
          const endPoint = projectPoint(dot.end.lat, dot.end.lng);
          return (
            <g key={`${dot.start.lat}-${dot.end.lat}-${i}`}>
              <motion.path
                d={createCurvedPath(startPoint, endPoint)}
                fill="none"
                stroke={lineColor}
                strokeWidth="1.5"
                strokeOpacity="0.55"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.25 * i, ease: "easeOut" }}
              />
              {[startPoint, endPoint].map((point, j) => (
                <g key={j}>
                  <circle cx={point.x} cy={point.y} r="3" fill={lineColor} fillOpacity="0.85" />
                  <circle cx={point.x} cy={point.y} r="3" fill={lineColor}>
                    <animate attributeName="r" from="3" to="10" dur="2s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.55" to="0" dur="2s" begin={`${i * 0.25}s`} repeatCount="indefinite" />
                  </circle>
                </g>
              ))}
            </g>
          );
        })}
        {pins.map((pin, i) => {
          const point = projectPoint(pin.lat, pin.lng);
          const r = pin.size ?? 5;
          return (
            <g key={`pin-${pin.lat}-${pin.lng}-${i}`}>
              <circle cx={point.x} cy={point.y} r={r + 3} fill={pin.color} fillOpacity="0.18" />
              <circle cx={point.x} cy={point.y} r={r} fill={pin.color} fillOpacity="0.95" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
