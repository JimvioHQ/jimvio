import { spawnSync } from "node:child_process";
import { join } from "node:path";

const tsx = join(process.cwd(), "node_modules", ".bin", "tsx");
const result = spawnSync(
  tsx,
  [
    "--test",
    "lib/ai/ai-guard.test.ts",
    "lib/ai/copilot-reliability.test.ts",
    "lib/ai/earning-guide.test.ts",
    "lib/ai/action-guide.test.ts",
  ],
  { stdio: "inherit", cwd: process.cwd() },
);
process.exit(result.status ?? 1);
