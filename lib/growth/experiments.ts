import { getFlag, isRolloutIncluded } from "@/lib/ops/feature-flags";
import { trackGrowthEvent } from "@/services/growth/events";

export type ExperimentVariant = "control" | "variant";

export async function getExperimentVariant(key: string, userId: string): Promise<ExperimentVariant> {
  const flag = await getFlag(key).catch(() => null);
  if (!flag?.enabled || flag.rollout_percent <= 0) return "control";
  return isRolloutIncluded(key, userId, Math.min(100, flag.rollout_percent)) ? "variant" : "control";
}

export async function trackExperimentExposure(userId: string, key: string, variant: ExperimentVariant): Promise<void> {
  await trackGrowthEvent(userId, "growth.experiment_exposure", { key, variant });
}

export async function getRemoteConfig<T extends Record<string, unknown> = Record<string, unknown>>(): Promise<T> {
  const flag = await getFlag("growth.remote_config").catch(() => null);
  return (flag?.enabled && flag.metadata && typeof flag.metadata === "object" ? flag.metadata : {}) as T;
}
