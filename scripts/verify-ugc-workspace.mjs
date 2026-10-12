import { spawnSync } from "node:child_process";
import { join } from "node:path";

const tsx = join(process.cwd(), "node_modules", ".bin", "tsx");
const result = spawnSync(tsx, ["--test", "lib/ugc/campaign-edit-guard.test.ts", "lib/ugc/submission-reward.test.ts", "lib/ugc/join-auth.test.ts", "lib/ugc/join-decision.test.ts"], {
  stdio: "inherit",
  cwd: process.cwd(),
});
process.exit(result.status ?? 1);
