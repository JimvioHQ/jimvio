import { classifyLock } from "./lock";
import { appendAudit } from "./state";
import type { EngineState, RiskClass } from "./types";
import { evaluateAction } from "./policy";

export type GrowthTask = {
  idempotencyKey: string;
  riskClass: RiskClass;
  subjectId: string;
  title: string;
  execute: (state: EngineState) => EngineState | Promise<EngineState>;
};

export type ScheduleResult = {
  state: EngineState;
  tasksRun: number;
  tasksSkipped: number;
  errors: string[];
  stopped: string | null;
};

async function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function acquireRunLock(state: EngineState, owner: string, now: Date, ttlMs: number): { state: EngineState; acquired: boolean; token: string | null } {
  const kind = classifyLock(state.lock, owner, now);
  if (kind === "held") {
    return {
      acquired: false,
      token: null,
      state: appendAudit(state, {
        at: now.toISOString(),
        action: "lock",
        subjectId: owner,
        outcome: "blocked",
        detail: "contended: another run holds the lock",
      }),
    };
  }
  const token = crypto.randomUUID();
  return {
    acquired: true,
    token,
    state: {
      ...state,
      lock: { owner, token, until: new Date(now.getTime() + ttlMs).toISOString() },
    },
  };
}

export function releaseRunLock(state: EngineState, owner: string, token: string): { state: EngineState; released: boolean } {
  if (state.lock?.owner !== owner || state.lock.token !== token) {
    return { state, released: false };
  }
  return { state: { ...state, lock: null }, released: true };
}

export async function runScheduledTasks(
  initial: EngineState,
  tasks: GrowthTask[],
  input: { now: Date; env?: NodeJS.ProcessEnv },
): Promise<ScheduleResult> {
  let state = initial;
  let tasksRun = 0;
  let tasksSkipped = 0;
  const errors: string[] = [];
  let stopped: string | null = null;
  const selected = tasks.slice(0, state.limits.maxTasksPerRun);

  for (const task of selected) {
    if (state.completedKeys.includes(task.idempotencyKey)) {
      tasksSkipped += 1;
      state = appendAudit(state, {
        at: input.now.toISOString(),
        action: task.title,
        subjectId: task.subjectId,
        outcome: "skipped",
        detail: "Duplicate idempotency key.",
      });
      continue;
    }
    const decision = evaluateAction(state, task.riskClass, task.subjectId, input.now, input.env);
    if (!decision.allowed) {
      tasksSkipped += 1;
      stopped = stopped ?? decision.reason;
      state = appendAudit(state, {
        at: input.now.toISOString(),
        action: task.title,
        subjectId: task.subjectId,
        outcome: "blocked",
        detail: decision.reason,
      });
      if (decision.reason === "Daily task limit reached." || decision.reason.includes("kill switch") || decision.reason === state.pausedReason) {
        break;
      }
      continue;
    }

    let attempt = 0;
    let done = false;
    while (!done && attempt <= state.limits.maxRetries) {
      attempt += 1;
      try {
        const next = await withTimeout(Promise.resolve(task.execute(state)), state.limits.taskTimeoutMs);
        state = {
          ...next,
          daily: { ...next.daily, tasks: next.daily.tasks + 1 },
          completedKeys: [...next.completedKeys, task.idempotencyKey],
        };
        state = appendAudit(state, {
          at: input.now.toISOString(),
          action: task.title,
          subjectId: task.subjectId,
          outcome: "success",
          detail: task.riskClass,
        });
        tasksRun += 1;
        done = true;
      } catch (error) {
        const message = error instanceof Error ? error.message : "task failed";
        if (attempt > state.limits.maxRetries) {
          errors.push(`${task.title}: ${message}`);
          state = { ...state, lastError: message };
          state = appendAudit(state, {
            at: input.now.toISOString(),
            action: task.title,
            subjectId: task.subjectId,
            outcome: "error",
            detail: message,
          });
          done = true;
        }
      }
    }
  }

  if (tasks.length > selected.length) {
    tasksSkipped += tasks.length - selected.length;
    stopped = stopped ?? "Run task limit reached.";
  }

  return { state, tasksRun, tasksSkipped, errors, stopped };
}
