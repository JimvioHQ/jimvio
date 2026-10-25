/**
 * One safe Resend check. Reads domains, then sends only to delivered@resend.dev.
 * Never prints the API key. Exits 2 when RESEND_API_KEY is absent.
 *
 *   npx tsx --env-file=.env.local scripts/growth/resend-connectivity.ts
 */
import { readResendDomains, sendResendConnectivityTest } from "../../lib/growth/engine/resend-probe";

const key = process.env.RESEND_API_KEY?.trim() ?? "";
if (!key) {
  console.log("BLOCKED: RESEND_API_KEY is not set in this process.");
  console.log("Setup: create a key at https://resend.com/api-keys and put RESEND_API_KEY in the server environment. Do not commit it.");
  process.exit(2);
}

const domains = await readResendDomains({ env: process.env, backoffMs: 200 });
if (!domains.ok) {
  console.log(`FAILED: Resend domains read ${domains.code}${domains.status ? ` HTTP ${domains.status}` : ""}.`);
  process.exit(1);
}
console.log(`Domains read ok. Count: ${domains.domainCount}.`);

const sent = await sendResendConnectivityTest({ env: process.env, backoffMs: 200 });
if (!sent.ok) {
  console.log(`FAILED: connectivity send ${sent.code}${sent.status ? ` HTTP ${sent.status}` : ""}. Recipient stayed on the Resend sink.`);
  process.exit(1);
}
console.log(`Connectivity send accepted. Id present: ${sent.id ? "yes" : "no"}. Recipient: delivered@resend.dev.`);
