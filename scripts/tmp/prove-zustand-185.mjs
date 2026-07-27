/**
 * FACT proof: unstable zustand selectors cause React Maximum update depth (#185).
 * Uses React DEVELOPMENT error strings.
 */
import { createRequire } from "module";
import { JSDOM } from "jsdom";

process.env.NODE_ENV = "development";

const dom = new JSDOM(
  "<!doctype html><html><body><div id='root'></div></body></html>",
  { url: "http://localhost/", pretendToBeVisual: true }
);

const { window } = dom;
for (const key of [
  "window",
  "document",
  "HTMLElement",
  "Node",
  "MutationObserver",
  "Event",
  "CustomEvent",
]) {
  globalThis[key] = window[key];
}
Object.defineProperty(globalThis, "navigator", {
  value: window.navigator,
  configurable: true,
});
globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const require = createRequire(import.meta.url);
const path = require("path");
const reactDev = path.join(
  path.dirname(require.resolve("react/package.json")),
  "cjs/react.development.js"
);
const reactDomDev = path.join(
  path.dirname(require.resolve("react-dom/package.json")),
  "cjs/react-dom-client.development.js"
);
const React = require(reactDev);
const { createElement, useState, useEffect } = React;
const { createRoot } = require(reactDomDev);
const { create } = require("zustand");

const EMPTY = [];
const useStore = create(() => ({ byId: {}, reactions: [] }));

function BadInlineEmpty({ id }) {
  // Mirrors LiveQaCollabPanel / LivePollsCollabPanel / LiveWhiteboard / LiveRecordingPanel
  const items = useStore((s) => s.byId[id] ?? []);
  const [n, setN] = useState(0);
  useEffect(() => {
    setN((x) => x + 1);
  }, [items]);
  return createElement("div", null, `bad-empty renders=${n}`);
}

function BadFilterSlice({ sessionId }) {
  // Mirrors LiveReactionsBar (pre-fix)
  const recent = useStore((s) =>
    s.reactions.filter((r) => r.sessionId === sessionId).slice(-6)
  );
  const [n, setN] = useState(0);
  useEffect(() => {
    setN((x) => x + 1);
  }, [recent]);
  return createElement("div", null, `bad-filter renders=${n}`);
}

function GoodSharedEmpty({ id }) {
  const items = useStore((s) => s.byId[id] ?? EMPTY);
  const [n, setN] = useState(0);
  useEffect(() => {
    setN((x) => x + 1);
  }, [items]);
  return createElement("div", null, `good renders=${n}`);
}

function GoodMemoFilter({ sessionId }) {
  const reactions = useStore((s) => s.reactions);
  const recent = React.useMemo(
    () => reactions.filter((r) => r.sessionId === sessionId).slice(-6),
    [reactions, sessionId]
  );
  const [n, setN] = useState(0);
  useEffect(() => {
    setN((x) => x + 1);
  }, [recent]);
  return createElement("div", null, `good-memo renders=${n}`);
}

function run(label, Comp, props) {
  return new Promise((resolve) => {
    const rootEl = document.getElementById("root");
    rootEl.innerHTML = "";
    const root = createRoot(rootEl);
    const errors = [];
    const onErr = (event) => {
      errors.push(String(event.error?.stack || event.message || event));
    };
    const onRej = (event) => {
      errors.push(String(event.reason?.stack || event.reason));
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);
    const prevErr = console.error;
    console.error = (...args) => {
      errors.push(args.map(String).join(" "));
      // swallow noisy react logs in output collection
    };
    try {
      root.render(createElement(Comp, props));
    } catch (e) {
      errors.push(e.stack || String(e));
    }
    setTimeout(() => {
      console.error = prevErr;
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
      const text = rootEl.textContent;
      try {
        root.unmount();
      } catch {
        /* ignore */
      }
      const hit = errors.find((e) =>
        /Maximum update depth|Minified React error #185/i.test(e)
      );
      resolve({
        label,
        text,
        hit: hit ? hit.slice(0, 1200) : null,
        errorCount: errors.length,
      });
    }, 800);
  });
}

const results = [];
results.push(await run("BAD ?? []", BadInlineEmpty, { id: "s1" }));
results.push(
  await run("BAD filter().slice()", BadFilterSlice, { sessionId: "s1" })
);
results.push(await run("GOOD shared EMPTY", GoodSharedEmpty, { id: "s1" }));
results.push(
  await run("GOOD memo filter", GoodMemoFilter, { sessionId: "s1" })
);

const badHits = results.filter((r) => r.label.startsWith("BAD") && r.hit);
const goodOk = results.filter((r) => r.label.startsWith("GOOD") && !r.hit);
if (badHits.length !== 2 || goodOk.length !== 2) {
  console.error(JSON.stringify(results, null, 2));
  process.exit(1);
}
console.log(
  JSON.stringify(
    {
      ok: true,
      proven:
        "Unstable Zustand selector identities cause React Maximum update depth (#185) via forceStoreRerender",
      badPatterns: badHits.map((r) => r.label),
      goodPatterns: goodOk.map((r) => r.label),
      sampleStack: badHits[0].hit.slice(0, 800),
    },
    null,
    2
  )
);
