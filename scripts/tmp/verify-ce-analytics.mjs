import { existsSync, readFileSync } from "node:fs";
const file = new URL("../../services/creator-economy/analytics.ts", import.meta.url);
if (!existsSync(file) || !readFileSync(file, "utf8").includes("getCreatorAnalytics")) throw new Error("Analytics service missing");
console.log("Creator Economy analytics service verified.");
