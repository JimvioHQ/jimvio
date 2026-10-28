/**
 * R-2: internal link checker. Every literal internal link in app/components/lib
 * must resolve to a page, route handler or redirect. Fails CI on a dead link.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();

function walk(dir: string, acc: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const routes: string[][] = walk(join(root, "app"))
  .filter((f) => /\/(page|route)\.tsx?$/.test(f.split(sep).join("/")))
  .map((f) =>
    relative(join(root, "app"), f)
      .split(sep)
      .slice(0, -1)
      .filter((p) => !(p.startsWith("(") && p.endsWith(")")) && !p.startsWith("@")),
  );

const redirectSources = [...readFileSync(join(root, "next.config.ts"), "utf8").matchAll(/source:\s*"([^"]+)"/g)]
  .map((m) => m[1])
  .filter((s) => s !== "/:path*" && !s.includes("("))
  .map((s) => new RegExp(`^${s.replace(/:\w+\*/g, ".*").replace(/:\w+/g, "[^/]+")}$`));

function resolves(path: string): boolean {
  const segs = path.split("/").filter(Boolean);
  for (const route of routes) {
    let i = 0;
    let ok = true;
    for (const part of route) {
      if (part.startsWith("[[...")) {
        i = segs.length;
        break;
      }
      if (part.startsWith("[...")) {
        if (i >= segs.length) ok = false;
        i = segs.length;
        break;
      }
      if (i >= segs.length || !(part.startsWith("[") || part === segs[i])) {
        ok = false;
        break;
      }
      i += 1;
    }
    if (ok && i === segs.length) return true;
  }
  return redirectSources.some((re) => re.test(path));
}

// Merchant storefront paths are served on store hosts by the proxy; workspace
// shells build hrefs relative to a community base path.
const SKIP_FILES = [/\/admin\//, /\.test\.tsx?$/, /lib\/commerce-os\/storefront\//, /components\/community\/workspace\/WorkspaceShell\.tsx$/];
const LINK = /(?:href=|href:|path:|router\.push\(|redirect\()\s*\{?\s*["'`](\/[a-zA-Z0-9_\-/]*)["'`?#]/g;

describe("internal links", () => {
  it("every literal internal link resolves to a route or redirect", () => {
    const dead: string[] = [];
    for (const dir of ["app", "components", "lib"]) {
      for (const file of walk(join(root, dir))) {
        if (!/\.tsx?$/.test(file)) continue;
        const rel = relative(root, file).split(sep).join("/");
        if (SKIP_FILES.some((re) => re.test(`/${rel}`))) continue;
        readFileSync(file, "utf8")
          .split("\n")
          .forEach((line, i) => {
            if (/^\s*(?:\/\/|\*)/.test(line)) return;
            for (const m of line.matchAll(LINK)) {
              const path = m[1].replace(/\/$/, "") || "/";
              if (path.startsWith("/api") || path.startsWith("/_next")) continue;
              if (path.split("/").pop()?.includes(".")) continue;
              if (!resolves(path)) dead.push(`${rel}:${i + 1} ${path}`);
            }
          });
      }
    }
    assert.deepEqual(dead, [], `Dead internal links:\n${dead.join("\n")}`);
  });
});
