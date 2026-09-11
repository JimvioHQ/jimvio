"use client";

import { useState } from "react";

type Rule = {
  id: string;
  name: string;
  markup_type: string;
  markup_value: number;
  min_profit: number | null;
  max_price: number | null;
  rounding_rule: string;
  currency: string;
  priority: number;
  is_active: boolean;
  store_id: string | null;
  product_id: string | null;
};

export function PricingRulesClient({
  initialRules,
}: {
  initialRules: Rule[];
  vendorId: string;
}) {
  const [rules, setRules] = useState(initialRules);
  const [name, setName] = useState("Default");
  const [markupType, setMarkupType] = useState<"percent" | "fixed">("percent");
  const [markupValue, setMarkupValue] = useState(40);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function createRule() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/dropshipping/pricing/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        markup_type: markupType,
        markup_value: markupValue,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(
        typeof json.error === "string" ? json.error : "Could not create price rule."
      );
      setSaving(false);
      return;
    }
    setRules((prev) => [json.rule as Rule, ...prev]);
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <p className="text-sm font-medium text-[#111827]">Add rule</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <input
            className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Rule name"
          />
          <select
            className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm"
            value={markupType}
            onChange={(e) => setMarkupType(e.target.value as "percent" | "fixed")}
          >
            <option value="percent">Percent</option>
            <option value="fixed">Fixed</option>
          </select>
          <input
            type="number"
            min={0}
            className="h-10 rounded-md border border-[#E5E7EB] px-3 text-sm"
            value={markupValue}
            onChange={(e) => setMarkupValue(Number(e.target.value))}
          />
          <button
            type="button"
            disabled={saving}
            onClick={() => void createRule()}
            className="h-10 rounded-md bg-[#FF5A1F] text-xs font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Create rule"}
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>

      {!rules.length ? (
        <div className="rounded-lg border border-[#E5E7EB] bg-white p-5 text-sm text-[#6B7280]">
          No rules yet. Default import markup is 40% until you add one.
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div
              key={r.id}
              className="rounded-lg border border-[#E5E7EB] bg-white px-4 py-3 text-sm"
            >
              <p className="font-medium text-[#111827]">{r.name}</p>
              <p className="text-xs text-[#6B7280]">
                {r.markup_type} {r.markup_value}
                {r.markup_type === "percent" ? "%" : ""} · priority {r.priority} ·{" "}
                {r.is_active ? "active" : "inactive"} · {r.currency}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
