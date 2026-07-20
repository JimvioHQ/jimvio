import { existsSync, readFileSync } from "node:fs";
const file = new URL("../../services/creator-economy/revenue.ts", import.meta.url);
if (!existsSync(file) || !readFileSync(file, "utf8").includes("getCreatorRevenue")) throw new Error("Revenue service missing");
console.log("Creator Economy revenue service verified.");
