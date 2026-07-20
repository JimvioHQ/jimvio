import { getAdminDB } from "@/services/base";

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  description: string | null;
  rollout_percent: number;
  metadata: Record<string, unknown>;
  updated_at: string;
};

const db = () => getAdminDB() as never as {
  from: (table: string) => any;
};

export async function listFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await db().from("platform_feature_flags").select("*").order("key");
  if (error) throw error;
  return (data ?? []) as FeatureFlag[];
}

export async function getFlag(key: string): Promise<FeatureFlag | null> {
  const { data, error } = await db().from("platform_feature_flags").select("*").eq("key", key).maybeSingle();
  if (error) throw error;
  return data as FeatureFlag | null;
}

export async function setFlag(
  key: string,
  input: Partial<Pick<FeatureFlag, "enabled" | "description" | "rollout_percent" | "metadata">>,
  updatedBy?: string,
) {
  const { data, error } = await db().from("platform_feature_flags").upsert({
    key,
    ...input,
    updated_by: updatedBy ?? null,
    updated_at: new Date().toISOString(),
  }).select().single();
  if (error) throw error;
  return data as FeatureFlag;
}

export function isRolloutIncluded(key: string, userId: string, rolloutPercent: number) {
  let hash = 0;
  for (const char of `${key}:${userId}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 100 < rolloutPercent;
}

export async function isEnabled(key: string, userId?: string) {
  const flag = await getFlag(key);
  if (!flag?.enabled) return false;
  if (!userId || flag.rollout_percent >= 100) return true;
  return flag.rollout_percent > 0 && isRolloutIncluded(key, userId, flag.rollout_percent);
}
