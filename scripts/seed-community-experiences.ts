/**
 * Idempotent seeder for Jimvio-managed community programming.
 * Delegates to the world-scale seeder.
 *
 * Usage: npx tsx scripts/seed-community-experiences.ts
 */
import "./seed-community-world.ts";

// P0-3: persona seeding is retired. Editorial content must be published as
// the community or as "Jimvio Editorial" — never under invented people.
if (process.env.JIMVIO_ALLOW_PERSONA_SEED !== "retired-p0-3") {
  console.error("Disabled: persona seeding creates fake members (see P0-3 audit).");
  process.exit(1);
}
