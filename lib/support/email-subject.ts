export function sanitizeEmailSubject(value: string) {
  return value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

export function customerReplySubject(agentName: string) {
  const name = sanitizeEmailSubject(agentName) || "Jimvio Support";
  return sanitizeEmailSubject(`${name} from Jimvio Support replied to your conversation`);
}

export function staffHandoffSubject() {
  return "A new customer conversation needs attention | Jimvio";
}

export function ticketReceivedSubject(topic: string | null | undefined) {
  const clean = sanitizeEmailSubject(topic ?? "");
  if (clean.length < 3) return "Your Jimvio support request has been received";
  const short = clean.length > 48 ? `${clean.slice(0, 45).trim()}…` : clean;
  return sanitizeEmailSubject(`Update on your ${short} | Jimvio`);
}
