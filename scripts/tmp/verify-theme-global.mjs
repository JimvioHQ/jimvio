/**
 * Global dark/night mode must stay on the existing next-themes + CSS token system.
 * Auto-picked up by npm test via scripts/tmp/verify-*.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const layout = read("app/layout.tsx");
const provider = read("components/providers/theme-provider.tsx");
const tailwind = read("tailwind.config.ts");
const css = read("styles/globals.css");
const toggle = read("components/ui/theme-toggle.tsx");
const ugcShell = read("components/ugc/workspace/UGCWorkspaceShell.tsx");
const appNav = read("components/shell/AppTopNav.tsx");
const commandCenter = read("components/command-center/CommandCenter.tsx");

assert.match(layout, /from "@\/components\/providers\/theme-provider"/);
assert.match(layout, /<ThemeProvider>/);
assert.match(layout, /bg-\[var\(--color-bg\)\]/);

assert.match(provider, /next-themes/);
assert.match(provider, /attribute="class"/);
assert.match(provider, /enableSystem/);
assert.match(provider, /enableColorScheme/);
assert.doesNotMatch(provider, /forcedTheme/);

assert.match(tailwind, /darkMode:\s*"class"/);

assert.match(css, /\.dark\s*\{/);
assert.match(css, /--color-bg:\s*#0a0a0a/);
assert.match(css, /html\.dark\s*\{/);
assert.match(css, /color-scheme:\s*dark/);
assert.match(css, /data-slot="switch-thumb"/);
assert.match(css, /:not\(\[class\*="dark:bg-"\]\)/);
assert.match(css, /Global dark chrome remap/);
assert.match(css, /--background:\s*var\(--color-bg\)/);
assert.match(css, /\.jimvio-page/);
assert.match(css, /overflow-wrap:\s*break-word/);
assert.match(css, /html\.dark \.wallet-os-scope/);
assert.doesNotMatch(css, /--color-accent:\s*#0a0a0a/);

assert.match(toggle, /useTheme/);
assert.match(toggle, /setTheme/);

assert.match(ugcShell, /bg-\[var\(--color-bg\)\]/);
assert.match(appNav, /bg-\[var\(--color-surface\)\]/);
assert.match(commandCenter, /bg-\[var\(--color-surface\)\]\/95/);
assert.doesNotMatch(commandCenter, /sm:bg-white\/85/);

const select = read("components/ui/select.tsx");
assert.match(select, /bg-\[var\(--color-surface\)\]/);
assert.doesNotMatch(select, /bg-slate-900\/90/);

const ugcPage = read("components/ugc/workspace/UGCPageShell.tsx");
assert.match(ugcPage, /px-4/);
assert.match(ugcPage, /--color-text-primary/);

const dash = read("components/dashboard/dashboard-shell.tsx");
assert.match(dash, /px-4/);
assert.doesNotMatch(dash, /px-0 py-3/);

const themeProviders = [
  "components/providers/theme-provider.tsx",
].filter((rel) => fs.existsSync(path.join(root, rel)));
assert.equal(themeProviders.length, 1);

console.log("verify-theme-global: ok");
