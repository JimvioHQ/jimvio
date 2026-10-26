import { readResendDomains, type ResendProbe } from "./resend-probe";

type FailureCode = Extract<ResendProbe, { ok: false }>["code"];

export type ResendDiagnostic = {
  ok: boolean;
  code: FailureCode | null;
  status: number | null;
  domainCount: number;
};

function empty(code: FailureCode, status: number | null = null): ResendDiagnostic {
  return { ok: false, code, status, domainCount: 0 };
}

/** Fixed public shape for a domains read. The key and provider body are never copied in. */
export function toResendDiagnostic(result: ResendProbe): ResendDiagnostic {
  if (!result.ok) return empty(result.code, result.status ?? null);
  const domainCount = Number.isSafeInteger(result.domainCount) && result.domainCount > 0 ? result.domainCount : 0;
  return { ok: true, code: null, status: 200, domainCount };
}

function resendEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  // ProcessEnv requires NODE_ENV. The reader uses only RESEND_API_KEY.
  return {
    NODE_ENV: env.NODE_ENV,
    RESEND_API_KEY: env.RESEND_API_KEY,
  };
}

/**
 * Read-only Resend domains check. Calls readResendDomains and no other provider.
 * It does not send email.
 */
export async function diagnoseResend(input: {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  attempts?: number;
  backoffMs?: number;
} = {}): Promise<ResendDiagnostic> {
  try {
    const result = await readResendDomains({
      env: resendEnv(input.env ?? process.env),
      fetchImpl: input.fetchImpl,
      attempts: input.attempts,
      backoffMs: input.backoffMs,
    });
    return toResendDiagnostic(result);
  } catch {
    return empty("network");
  }
}
