"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ApiV1Doc } from "@/lib/navigation/api-v1-docs";

type KeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
  expires_at: string | null;
};

export function ApiKeyManager({
  scopes,
  docs,
}: {
  scopes: readonly string[];
  docs: readonly ApiV1Doc[];
}) {
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [secretOnce, setSecretOnce] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/dropshipping/api-keys");
    const payload = (await response.json().catch(() => ({}))) as { error?: string; keys?: KeyRow[] };
    if (!response.ok) {
      setError(payload.error || "API keys could not be loaded.");
      return;
    }
    setError(null);
    setKeys(payload.keys ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  function toggle(scope: string) {
    setSelected((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );
  }

  async function createKey(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setCopied(false);
    setSecretOnce(null);
    const response = await fetch("/api/dropshipping/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, scopes: selected }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; secret?: string };
    if (!response.ok || typeof payload.secret !== "string") {
      setError(payload.error || "The key was not created.");
      setBusy(false);
      return;
    }
    setSecretOnce(payload.secret);
    setName("");
    setSelected([]);
    await load();
    setBusy(false);
  }

  async function copySecret() {
    if (!secretOnce) return;
    try {
      await navigator.clipboard.writeText(secretOnce);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("The browser did not copy the key. Select it and copy it manually.");
    }
  }

  async function revoke(id: string) {
    if (!window.confirm("Revoke this key? Requests that use it will be rejected.")) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/dropshipping/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "The key was not revoked.");
      setBusy(false);
      return;
    }
    await load();
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">Developers</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-text-primary">API keys</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
        Create a key for the merchant account you are signed in as. The secret is shown once and is not stored in this browser.
        Send it as <code className="text-[13px]">Authorization: Bearer</code>. Read the{" "}
        <Link href="/docs" className="font-medium text-[var(--color-accent)] hover:underline">API docs</Link>
        {" "}for the live routes. The retired channel key screen is not used.
      </p>

      <form onSubmit={createKey} className="mt-8 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-text-primary">Create a key</h2>
        <label className="mt-4 block text-xs font-medium text-text-muted" htmlFor="api-key-name">
          Name
        </label>
        <input
          id="api-key-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Store integration"
          className="mt-1 h-11 w-full max-w-md rounded-md border border-border bg-[var(--color-bg)] px-3 text-sm text-text-primary"
        />
        <fieldset className="mt-4">
          <legend className="text-xs font-medium text-text-muted">Scopes used by live routes</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {scopes.map((scope) => {
              const on = selected.includes(scope);
              return (
                <label key={scope} className={on
                  ? "cursor-pointer rounded-md border border-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)]"
                  : "cursor-pointer rounded-md border border-border px-3 py-1.5 text-xs text-text-secondary"}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    onChange={() => toggle(scope)}
                  />
                  {scope}
                </label>
              );
            })}
          </div>
        </fieldset>
        <button
          type="submit"
          disabled={busy}
          className="mt-4 inline-flex h-11 items-center rounded-md bg-[var(--color-accent)] px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Working…" : "Create API key"}
        </button>
        {secretOnce ? (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">Copy this secret now. It will not be shown again.</p>
            <code className="mt-2 block break-all text-[13px] text-text-primary">{secretOnce}</code>
            <button type="button" onClick={() => void copySecret()} className="mt-3 text-sm font-medium text-[var(--color-accent)]">
              {copied ? "Copied" : "Copy key"}
            </button>
          </div>
        ) : null}
      </form>

      {error ? <p className="mt-4 text-sm text-red-600" role="alert">{error}</p> : null}

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-text-primary">Your keys</h2>
        {keys.length === 0 ? (
          <p className="mt-2 text-sm text-text-secondary">No keys yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
            {keys.map((key) => (
              <li key={key.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">{key.name}</p>
                  <p className="mt-1 font-mono text-xs text-text-muted">{key.key_prefix}…</p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {key.revoked_at ? "Revoked" : key.expires_at ? `Expires ${new Date(key.expires_at).toLocaleDateString()}` : "Active"}
                    {" · "}
                    Created {new Date(key.created_at).toLocaleDateString()}
                    {" · "}
                    Last used {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : "never"}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">{key.scopes.join(", ")}</p>
                </div>
                {key.revoked_at ? null : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void revoke(key.id)}
                    className="h-9 rounded-md border border-border px-3 text-xs font-semibold text-text-primary disabled:opacity-60"
                  >
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-text-primary">Routes these scopes open</h2>
        <ul className="mt-2 space-y-1 text-sm text-text-secondary">
          {docs.map((endpoint) => (
            <li key={`${endpoint.method}-${endpoint.path}`}>
              <span className="font-medium text-text-primary">{endpoint.method}</span> {endpoint.path}
              <span className="text-text-muted"> · {endpoint.scope}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
