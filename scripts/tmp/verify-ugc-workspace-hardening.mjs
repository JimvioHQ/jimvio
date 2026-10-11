import { spawnSync } from "node:child_process";
import { join } from "node:path";

const script = join(process.cwd(), "scripts", "verify-ugc-workspace.mjs");
const result = spawnSync(process.execPath, [script], { stdio: "inherit", cwd: process.cwd() });
process.exit(result.status ?? 1);
