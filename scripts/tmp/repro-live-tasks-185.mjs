/**
 * Prove LiveTasksPanel selector pattern no longer trips React #185.
 * React DEVELOPMENT + Zustand — same mechanism as production Minified #185.
 */
import { createRequire } from "module";
import { JSDOM } from "jsdom";
import path from "path";

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
  "CSS",
  "getComputedStyle",
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
const React = require(
  path.join(path.dirname(require.resolve("react/package.json")), "cjs/react.development.js")
);
const { createRoot } = require(
  path.join(
    path.dirname(require.resolve("react-dom/package.json")),
    "cjs/react-dom-client.development.js"
  )
);
const { create } = require("zustand");
const { createElement, useEffect, useState, useMemo } = React;

const useCreatorOSStore = create(() => ({
  tasks: [],
}));

/** Pre-fix pattern (must hit #185) */
function LiveTasksPanelBad({ communityId, roomId }) {
  const tasks = useCreatorOSStore((s) =>
    s.tasks
      .filter(
        (t) =>
          (communityId && t.communityId === communityId) ||
          (roomId && t.roomId === roomId)
      )
      .slice(0, 12)
  );
  const [n, setN] = useState(0);
  useEffect(() => {
    setN((x) => x + 1);
  }, [tasks]);
  return createElement("div", null, `bad ${n}`);
}

/** Post-fix pattern (must NOT hit #185) */
function LiveTasksPanelGood({ communityId, roomId }) {
  const allTasks = useCreatorOSStore((s) => s.tasks);
  const tasks = useMemo(
    () =>
      allTasks
        .filter(
          (t) =>
            (communityId && t.communityId === communityId) ||
            (roomId && t.roomId === roomId)
        )
        .slice(0, 12),
    [allTasks, communityId, roomId]
  );
  const [n, setN] = useState(0);
  useEffect(() => {
    setN((x) => x + 1);
  }, [tasks]);
  return createElement("div", null, `good ${tasks.length} n=${n}`);
}

async function run(label, Comp, props) {
  const rootEl = document.getElementById("root");
  rootEl.innerHTML = "";
  const root = createRoot(rootEl);
  const errors = [];
  const prevErr = console.error;
  console.error = (...args) => {
    errors.push(args.map(String).join(" "));
  };
  const onErr = (e) => errors.push(String(e.error?.stack || e.message));
  window.addEventListener("error", onErr);
  try {
    root.render(createElement(Comp, props));
  } catch (e) {
    errors.push(e.stack || String(e));
  }
  await new Promise((r) => setTimeout(r, 700));
  console.error = prevErr;
  window.removeEventListener("error", onErr);
  const hit = errors.find((e) =>
    /Maximum update depth|Minified React error #185/i.test(e)
  );
  try {
    root.unmount();
  } catch {
    /* */
  }
  return {
    label,
    hit: Boolean(hit),
    stack: hit ? hit.slice(0, 1200) : null,
    text: rootEl.textContent,
  };
}

const results = [];
results.push(
  await run("LiveTasksPanelBad filter.slice", LiveTasksPanelBad, {
    communityId: "c1",
    roomId: null,
  })
);
results.push(
  await run("LiveTasksPanelGood select+useMemo", LiveTasksPanelGood, {
    communityId: "c1",
    roomId: null,
  })
);

const bad = results[0];
const good = results[1];
if (!bad.hit) {
  console.error("EXPECTED bad pattern to hit #185");
  process.exit(1);
}
if (good.hit) {
  console.error("EXPECTED good pattern to be clean");
  console.error(good.stack);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      evidence: {
        component: "LiveTasksPanel",
        file: "components/community/live-collab/LiveCollabPanels.tsx",
        hook: "useCreatorOSStore",
        badSelector: "s.tasks.filter(...).slice(0, 12)",
        stackSignature: "forceStoreRerender → updateStoreInstance → Maximum update depth",
        badHit: bad.hit,
        goodHit: good.hit,
        goodText: good.text,
      },
    },
    null,
    2
  )
);
