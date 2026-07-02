"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

const PRODUCT_SUGGESTIONS = [
  "Wireless Earbuds",
  "Gaming Headset",
  "Smart Watch",
  "Portable Speaker",
  "Mechanical Keyboard",
  "Power Bank",
];

const CATEGORY_SUGGESTIONS = [
  "Electronics",
  "Fashion",
  "Home & Living",
  "Health & Beauty",
  "Creator Equipment",
  "Gaming Accessories",
];

type RotatingSuggestion = {
  prefix: string;
  label: string;
};

function buildSuggestions(type: "physical" | "digital"): RotatingSuggestion[] {
  const products = PRODUCT_SUGGESTIONS.map((label) => ({
    prefix: "Search for",
    label,
  }));
  const categories = CATEGORY_SUGGESTIONS.map((label) => ({
    prefix: "Search in",
    label,
  }));
  const mixed = [...products, ...categories];
  if (type === "digital") {
    return [
      { prefix: "Search for", label: "Design Templates" },
      { prefix: "Search for", label: "Online Courses" },
      { prefix: "Search in", label: "Software" },
      ...mixed,
    ];
  }
  return mixed;
}

type Props = {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  type: "physical" | "digital";
};

export function MarketplaceSearchBar({
  value,
  onChange,
  onFocus,
  onBlur,
  onKeyDown,
  type,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  const suggestions = useMemo(() => buildSuggestions(type), [type]);
  const current = suggestions[index % suggestions.length];
  const showRotating = value.length === 0 && !focused;

  useEffect(() => {
    setIndex(0);
  }, [type]);

  useEffect(() => {
    if (!showRotating) return;
    const id = setInterval(() => {
      setExiting(true);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % suggestions.length);
        setExiting(false);
      }, 350);
    }, 3000);
    return () => clearInterval(id);
  }, [showRotating, suggestions.length]);

  return (
    <div className="relative min-w-0 flex-1">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => {
          setFocused(true);
          onFocus();
        }}
        onBlur={() => {
          setFocused(false);
          onBlur();
        }}
        onKeyDown={onKeyDown}
        placeholder=" "
        aria-label={
          type === "digital"
            ? "Search digital products"
            : "Search physical products"
        }
        className="relative z-10 min-w-0 w-full bg-transparent text-sm text-[var(--color-text-primary)] outline-none"
      />

      {showRotating && (
        <div
          className="pointer-events-none absolute inset-0 z-0 flex items-center overflow-hidden"
          aria-hidden
        >
          <span
            key={index}
            className="truncate text-sm text-[var(--color-text-muted)]"
            style={{
              transform: exiting ? "translate3d(0, -100%, 0)" : "translate3d(0, 0, 0)",
              opacity: exiting ? 0 : 1,
              transition: exiting
                ? "transform 350ms ease, opacity 350ms ease"
                : undefined,
              animation: exiting ? undefined : "marketplaceSearchPlaceholderIn 350ms ease",
              willChange: "transform, opacity",
            }}
          >
            {current.prefix}{" "}
            <span className="font-semibold text-[var(--color-text-secondary)]">
              {current.label}
            </span>
            ...
          </span>
        </div>
      )}
    </div>
  );
}

export function MarketplaceSearchIcon({ active }: { active: boolean }) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setPulse(true);
      window.setTimeout(() => setPulse(false), 600);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <Search
      className={`size-4 shrink-0 text-[var(--color-text-muted)] transition-transform duration-300 ${
        active ? "animate-pulse" : pulse ? "scale-110" : "scale-100"
      }`}
      style={{ willChange: "transform" }}
    />
  );
}

export function marketplaceSearchBarClassName(focused: boolean) {
  return [
    "flex items-center gap-2 rounded-sm border px-3 py-2 shadow-sm transition-all duration-300 sm:gap-3 sm:px-4",
    "bg-[var(--color-surface)]/90 backdrop-blur-md",
    focused
      ? "border-[var(--color-accent)]/50 shadow-[0_0_0_3px_rgba(253,80,0,0.12),0_8px_24px_rgba(0,0,0,0.06)]"
      : "border-[var(--color-border)] hover:border-[var(--color-border-strong,var(--color-border))]",
  ].join(" ");
}
