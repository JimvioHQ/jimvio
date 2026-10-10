import { createHash, randomBytes } from "node:crypto";
import {
  ISSUE_TYPES,
  SUPPORT_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  type IssueType,
  type TicketPriority,
  type TicketStatus,
} from "./types";

const CATEGORY_IDS = new Set(SUPPORT_CATEGORIES.map((category) => category.id));
const CARD_RE = /(?:\d[ -]*?){13,19}/;
const SECRET_RE =
  /\b(password|passcode|cvv|cvc|private key|seed phrase|authenticator code|one[- ]time code|otp)\b/i;

export type TicketInput = {
  subject: unknown;
  category: unknown;
  issueType: unknown;
  description: unknown;
  priority: unknown;
  referenceCode: unknown;
  name: unknown;
  email: unknown;
  idempotencyKey: unknown;
  company: unknown;
};

export type ValidTicketInput = {
  subject: string;
  category: string;
  issueType: IssueType;
  description: string;
  priority: TicketPriority;
  referenceCode: string | null;
  name: string | null;
  email: string | null;
  idempotencyKey: string | null;
};

export function containsSensitiveSupportText(value: string) {
  return CARD_RE.test(value) || SECRET_RE.test(value);
}

/** Keep ticket search inside ilike literals. Strips filter syntax such as commas and parentheses. */
export function ticketSearchTerm(value: string) {
  return value.replace(/[^a-zA-Z0-9 .+@-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
}

export function validateTicketInput(
  input: TicketInput,
  options?: { requireEmail?: boolean },
): { ok: true; value: ValidTicketInput } | { ok: false; error: string } {
  if (cleanText(input.company, 200)) {
    return { ok: true, value: honeypotTicket() };
  }

  const subject = cleanText(input.subject, 180);
  const description = cleanText(input.description, 8000);
  const category = cleanText(input.category, 80);
  const issueType = cleanText(input.issueType, 40);
  const priority = cleanText(input.priority, 20) || "normal";
  const referenceCode = cleanText(input.referenceCode, 120) || null;
  const name = cleanText(input.name, 120) || null;
  const email = cleanText(input.email, 200) || null;
  const idempotencyKey = cleanText(input.idempotencyKey, 80) || null;

  if (subject.length < 3) return { ok: false, error: "Enter a subject of at least 3 characters." };
  if (!CATEGORY_IDS.has(category as never)) return { ok: false, error: "Choose a support category." };
  if (!ISSUE_TYPES.includes(issueType as IssueType)) return { ok: false, error: "Choose an issue type." };
  if (!TICKET_PRIORITIES.includes(priority as TicketPriority)) {
    return { ok: false, error: "Choose a priority." };
  }
  if (description.length < 10) {
    return { ok: false, error: "Describe the issue in at least 10 characters." };
  }
  if (containsSensitiveSupportText(description) || containsSensitiveSupportText(subject)) {
    return {
      ok: false,
      error: "Remove passwords, authenticator codes, and card numbers before submitting.",
    };
  }
  if (options?.requireEmail) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "Enter a valid email address." };
    }
  } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (idempotencyKey && !/^[a-zA-Z0-9_-]{8,80}$/.test(idempotencyKey)) {
    return { ok: false, error: "Invalid submission key." };
  }

  return {
    ok: true,
    value: {
      subject,
      category,
      issueType: issueType as IssueType,
      description,
      priority: priority as TicketPriority,
      referenceCode,
      name,
      email,
      idempotencyKey,
    },
  };
}

function honeypotTicket(): ValidTicketInput {
  return {
    subject: "",
    category: "",
    issueType: "question",
    description: "",
    priority: "normal",
    referenceCode: null,
    name: null,
    email: null,
    idempotencyKey: null,
  };
}

export function isHoneypot(value: ValidTicketInput) {
  return value.subject === "" && value.description === "";
}

export function newPublicRef() {
  return `JV-${randomBytes(8).toString("hex")}`;
}

export function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex");
}

export function canTransition(from: TicketStatus, to: TicketStatus, actor: "customer" | "staff") {
  if (from === to) return true;
  if (actor === "customer") {
    return (from === "resolved" || from === "closed") && to === "open";
  }
  return TICKET_STATUSES.includes(from) && TICKET_STATUSES.includes(to);
}

