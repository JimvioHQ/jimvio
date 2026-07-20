import { readFileSync } from "node:fs";
const sql = readFileSync(new URL("../../database/migrations/091_creator_economy_payouts.sql", import.meta.url), "utf8");
if (!sql.includes("creator_payout_methods") || !sql.includes("ROW LEVEL SECURITY")) throw new Error("Payout migration incomplete");
console.log("Creator Economy payouts migration verified.");
