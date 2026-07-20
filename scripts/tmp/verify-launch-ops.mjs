import assert from "node:assert/strict";

function rollout(key, userId, percent) {
  let hash = 0;
  for (const char of `${key}:${userId}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 100 < percent;
}

function makeLimiter() {
  const windows = new Map();
  return (key, limit, windowMs, now) => {
    const current = windows.get(key);
    if (!current || now - current.startedAt >= windowMs) { windows.set(key, { startedAt: now, hits: 1 }); return { allowed: true, remaining: limit - 1 }; }
    current.hits += 1;
    return { allowed: current.hits <= limit, remaining: Math.max(0, limit - current.hits) };
  };
}

const limit = makeLimiter();
assert.equal(limit("a", 2, 1000, 0).allowed, true);
assert.equal(limit("a", 2, 1000, 1).remaining, 0);
assert.equal(limit("a", 2, 1000, 2).allowed, false);
assert.equal(limit("a", 2, 1000, 1000).allowed, true);
assert.equal(rollout("flag", "user", 0), false);
assert.equal(rollout("flag", "user", 100), true);
assert.equal(rollout("flag", "user", 50), rollout("flag", "user", 50));

const delays = [];
let attempts = 0;
async function retry(fn, retries = 2, baseMs = 10) {
  let last;
  for (let attempt = 0; attempt <= retries; attempt += 1) try { return await fn(); } catch (error) {
    last = error;
    if (attempt === retries) break;
    delays.push(baseMs * 2 ** attempt);
  }
  throw last;
}
assert.equal(await retry(async () => { attempts += 1; if (attempts < 3) throw new Error("retry"); return "ok"; }), "ok");
assert.deepEqual(delays, [10, 20]);

function cronAuthorized({ production, secret, authorization, header }) {
  if (production && !secret) return 503;
  if (!secret) return 200;
  if (authorization === `Bearer ${secret}` || header === secret) return 200;
  return 401;
}
assert.equal(cronAuthorized({ production: true, secret: "", authorization: "", header: "" }), 503);
assert.equal(cronAuthorized({ production: true, secret: "x", authorization: "Bearer wrong", header: "" }), 401);
assert.equal(cronAuthorized({ production: true, secret: "x", authorization: "Bearer x", header: "" }), 200);
assert.equal(cronAuthorized({ production: true, secret: "x", authorization: "", header: "x" }), 200);
console.log("verify-launch-ops: passed");
