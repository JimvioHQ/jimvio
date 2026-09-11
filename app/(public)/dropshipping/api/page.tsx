"use client";

import { useEffect, useState } from "react";

const API_SCOPES = [
  "products:read",
  "products:write",
  "inventory:read",
  "orders:read",
  "orders:write",
  "fulfillment:read",
  "fulfillment:write",
  "shipping:read",
  "stores:read",
  "stores:write",
] as const;

type KeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

export default function DropshippingApiPage() {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState("Merchant API");
  const [scopes, setScopes] = useState<string[]>([
    "products:read",
    "orders:read",
    "orders:write",
    "inventory:read",
    "stores:read",
    "shipping:read",
    "fulfillment:write",
  ]);
  const [secretOnce, setSecretOnce] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/dropshipping/api-keys");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Failed to load API keys.");
      return;
    }
    setKeys(json.keys ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createKey() {
    setBusy(true);
    setError(null);
    setSecretOnce(null);
    const res = await fetch("/api/dropshipping/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, scopes }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(typeof json.error === "string" ? json.error : "Failed to create API key.");
      setBusy(false);
      return;
    }
    setSecretOnce(json.secret as string);
    await load();
    setBusy(false);
  }

  function toggleScope(scope: string) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-[#111827]">API</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Create merchant API keys for <code className="text-[11px]">/api/v1/*</code>. The
          secret is shown once.
        </p>
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <p className="text-sm font-medium text-[#111827]">Create key</p>
        <input
          className="mt-2 h-10 w-full max-w-md rounded-md border border-[#E5E7EB] px-3 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {API_SCOPES.map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => toggleScope(scope)}
              className={
                scopes.includes(scope)
                  ? "rounded-md bg-[#FF5A1F]/10 px-2 py-1 text-[11px] font-semibold text-[#FF5A1F]"
                  : "rounded-md border border-[#E5E7EB] px-2 py-1 text-[11px] text-[#6B7280]"
              }
            >
              {scope}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={busy || scopes.length === 0}
          onClick={() => void createKey()}
          className="mt-3 h-10 rounded-md bg-[#FF5A1F] px-4 text-xs font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create API key"}
        </button>
        {secretOnce ? (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
            <p className="font-medium text-amber-900">Copy this secret now — it won&apos;t be shown again.</p>
            <code className="mt-1 block break-all text-[12px] text-[#111827]">{secretOnce}</code>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      <div className="rounded-lg border border-[#E5E7EB] bg-white p-4">
        <p className="text-sm font-medium text-[#111827]">Your keys</p>
        {!keys.length ? (
          <p className="mt-2 text-sm text-[#6B7280]">No keys yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {keys.map((k) => (
              <li key={k.id} className="text-sm">
                <span className="font-medium text-[#111827]">{k.name}</span>
                <span className="text-[#6B7280]">
                  {" "}
                  · {k.key_prefix}… · {k.scopes?.length ?? 0} scopes
                  {k.revoked_at ? " · revoked" : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] p-4 text-xs text-[#4B5563]">
        <p className="font-medium text-[#111827]">Auth</p>
        <p className="mt-1">
          <code>Authorization: Bearer jmv_…</code>
        </p>
        <p className="mt-2">
          Endpoints: <code>/api/v1/products</code>, <code>/api/v1/orders</code>,{" "}
          <code>/api/v1/inventory</code>, <code>/api/v1/stores</code>,{" "}
          <code>/api/v1/shipping/rates</code>, <code>/api/v1/fulfillments</code>,{" "}
          <code>/api/v1/connections</code>
        </p>
      </div>
    </div>
  );
}
