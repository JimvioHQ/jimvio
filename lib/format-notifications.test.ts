import { describe, it, expect } from "vitest";
import { formatNotificationTime, getNotificationIcon, getNotificationColor } from "./notifications";

describe("formatNotificationTime", () => {
  it('returns "Just now" for very recent times', () => {
    const result = formatNotificationTime(new Date().toISOString());
    expect(result).toBe("Just now");
  });

  it('returns "1m ago" for one minute old', () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(formatNotificationTime(past)).toBe("1m ago");
  });

  it('returns "5m ago" for five minutes old', () => {
    const past = new Date(Date.now() - 300_000).toISOString();
    expect(formatNotificationTime(past)).toBe("5m ago");
  });

  it('returns "2h ago" for two hours old', () => {
    const past = new Date(Date.now() - 7_200_000).toISOString();
    expect(formatNotificationTime(past)).toBe("2h ago");
  });

  it('returns "3d ago" for three days old', () => {
    const past = new Date(Date.now() - 259_200_000).toISOString();
    expect(formatNotificationTime(past)).toBe("3d ago");
  });

  it("returns empty string for null input", () => {
    expect(formatNotificationTime(null)).toBe("");
  });

  it("returns a locale date string for dates older than a week", () => {
    const past = new Date("2026-01-01").toISOString();
    const result = formatNotificationTime(past);
    expect(result).not.toMatch(/ago/);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("getNotificationIcon", () => {
  it("returns correct icon for order type", () => {
    expect(getNotificationIcon("order")).toBe("ShoppingCart");
  });

  it("returns correct icon for payment type", () => {
    expect(getNotificationIcon("payment")).toBe("DollarSign");
  });

  it("returns Bell for unknown types", () => {
    expect(getNotificationIcon("system")).toBe("Bell");
  });
});

describe("getNotificationColor", () => {
  it("returns blue for order type", () => {
    expect(getNotificationColor("order")).toBe("#2563eb");
  });

  it("returns orange for community type", () => {
    expect(getNotificationColor("community")).toBe("#fd5000");
  });

  it("returns gray for unknown types", () => {
    expect(getNotificationColor("system")).toBe("#6b7280");
  });
});
