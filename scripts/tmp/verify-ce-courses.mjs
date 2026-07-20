import { readFileSync } from "node:fs";
const sql = readFileSync(new URL("../../database/migrations/090_creator_economy_courses.sql", import.meta.url), "utf8");
for (const value of ["course_quizzes", "course_quiz_attempts", "course_certificates", "certificate_enabled"]) if (!sql.includes(value)) throw new Error(`Missing ${value}`);
console.log("Creator Economy courses migration verified.");
