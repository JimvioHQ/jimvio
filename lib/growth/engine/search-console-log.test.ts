import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchConsoleReadSummary } from "./search-console-log";

describe("search console count summary", () => {
  it("records query count, page count, and read status without query text or page URLs", () => {
    const read = searchConsoleReadSummary({
      status: "read",
      rowCount: 24,
      pageRows: [{ length: 2 }, { length: 2 }],
      pageRead: "read",
    });
    assert.equal(read, "Search Console returned 24 queries and 2 pages (read).");
    assert.equal(read.includes("http"), false);

    const failedPages = searchConsoleReadSummary({
      status: "read",
      rowCount: 24,
      pageRows: [],
      pageRead: "failed",
    });
    assert.equal(failedPages, "Search Console returned 24 queries and 0 pages (failed).");

    const legacy = searchConsoleReadSummary({ status: "read", rowCount: 1 });
    assert.equal(legacy, "Search Console returned 1 queries.");
  });
});
