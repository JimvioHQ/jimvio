import { readFileSync } from "node:fs";
const sql = readFileSync(new URL("../../database/migrations/089_creator_economy_digital.sql", import.meta.url), "utf8");
for (const value of ["download_count", "digital_product_versions", "digital_download_events", "ENABLE ROW LEVEL SECURITY"]) if (!sql.includes(value)) throw new Error(`Missing ${value}`);
console.log("Creator Economy digital migration verified.");
