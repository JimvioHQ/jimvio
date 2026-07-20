export type LogLevel = "debug" | "info" | "warn" | "error";

/** JSON logs keep serverless output queryable without relying on a runtime-specific SDK. */
export function log(level: LogLevel, message: string, fields: Record<string, unknown> = {}) {
  const entry = JSON.stringify({ level, message, fields, timestamp: new Date().toISOString() });
  const writer = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  writer(entry);
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => log("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => log("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => log("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => log("error", message, fields),
};
