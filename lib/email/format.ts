export function formatEmailDate(input?: Date | string | null, withTime = false): string {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
  if (!withTime) return datePart;
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(date);
  return `${datePart} ${timePart} UTC`;
}

export function formatEmailMoney(amount: number, currency: string): string {
  const code = (currency || "USD").toUpperCase();
  const value = Number(amount);
  if (!Number.isFinite(value)) return code;
  return `${code} ${value.toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function firstNameFrom(fullName?: string | null): string | null {
  const part = fullName?.trim().split(/\s+/)[0];
  if (!part) return null;
  return part.slice(0, 40);
}
