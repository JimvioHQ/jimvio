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
assert.doesNotMatch(css, /--color-accent:\s*#0a0a0a/);

assert.match(toggle, /useTheme/);
assert.match(toggle, /setTheme/);

assert.match(ugcShell, /bg-\[var\(--color-bg\)\]/);
assert.match(appNav, /bg-\[var\(--color-surface\)\]/);

const themeProviders = [
  "components/providers/theme-provider.tsx",
].filter((rel) => fs.existsSync(path.join(root, rel)));
assert.equal(themeProviders.length, 1);

console.log("verify-theme-global: ok");
