import { NextResponse } from "next/server";
import { assertPlatformAdmin } from "@/lib/auth/platform-admin";
import { processAutoPublishQueue } from "@/lib/cj/premium-intelligence/auto-publish-queue";
import { AUTO_PUBLISH_WORKER_BATCH_SIZE } from "@/lib/cj/premium-intelligence/system-publish";

async function assertAdmin() {
  const auth = await assertPlatformAdmin();
  return auth.ok;
}

export async function POST() {
  if (!(await assertAdmin())) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await processAutoPublishQueue(AUTO_PUBLISH_WORKER_BATCH_SIZE);
  return NextResponse.json({ success: true, result });
}
