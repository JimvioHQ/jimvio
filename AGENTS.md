# AGENTS.md

## Cursor Cloud specific instructions

Jimvio is a single Next.js 16 (App Router, Turbopack) + TypeScript app. The only
backend service it needs to boot is **Supabase** (Postgres + Auth + Storage),
which runs locally via the Supabase CLI + Docker. All payment gateways
(PesaPal/PawaPay/NowPayments/AfriPay/BinancePay), Shopify, AI (OpenAI/Gemini),
email (Resend), Cloudinary, and social-media sync are optional and only needed
when testing those specific flows.

Standard scripts live in `package.json` (`dev`, `build`, `start`, `type-check`).
Setup steps (Node 20+, copy `.env.example`) are in `README.md`. Note the README
mentions `npx prisma generate`, but **Prisma is not used at runtime** (the schema
is plain SQL applied to Postgres / Supabase); skip that step.

### Node version gotcha (important)
The `dev`/`build`/`start` scripts pass `NODE_OPTIONS=--use-system-ca`, which is
only allowed on **Node >= 22.15**. The VM's default `node` (`/exec-daemon/node`)
is older and will fail with `--use-system-ca is not allowed in NODE_OPTIONS`.
Use the nvm-installed Node `v22.22.2` instead. Setup already prepends it in
`~/.bashrc`, so a fresh login shell (e.g. a new `bash -l` / tmux login shell)
runs the correct Node — verify with `node -v` → `v22.22.2`. `npm install` itself
works on either Node version.

### Running the app (full stack)
1. Ensure Docker is running (`sudo dockerd` in the background if `docker info` fails).
2. Start Supabase: `sudo supabase start` (ports: API 54321, DB 54322, Studio 54323,
   Mailpit 54324). It must be run with `sudo` because dockerd runs as root here.
3. Apply the schema (the committed `supabase/migrations/*.sql` is fully commented
   out and is a no-op; the real schema is the root `schema.sql` pg-dump):
   - `sudo docker cp schema.sql supabase_db_jimvio:/tmp/schema.sql`
   - `sudo docker exec supabase_db_jimvio psql -U postgres -d postgres -f /tmp/schema.sql`
   - Two trigram indexes need pg_trgm: `sudo docker exec supabase_db_jimvio psql -U postgres -d postgres -c "CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;"` then re-create `idx_products_name_trgm` / `idx_vendors_name_trgm`.
   - Optional category seed: `database/seeds/001_categories.sql` (seeds `product_categories`).
4. `.env.local` (gitignored) holds the local Supabase URL + keys. This CLI emits
   the new-style keys (`sb_publishable_...` / `sb_secret_...`); use the publishable
   key as `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the secret key as
   `SUPABASE_SERVICE_ROLE_KEY` (both work with `@supabase/supabase-js` v2.105+).
5. `npm run dev` → http://localhost:3000.

### Auth note
Local Supabase has email confirmations disabled (`enable_confirmations = false`
in `supabase/config.toml`), so registering at `/register` immediately creates a
confirmed user (with `profiles`/`user_roles`/`wallets` rows) and logs in — no
email step. Outbound email is disabled via `EMAIL_NOTIFICATIONS_ENABLED=false`;
any emails that would be sent are viewable in Mailpit (port 54324).

### Lint caveat
`npm run lint` is broken: it runs `next lint`, which was removed in Next 16
(fails with "Invalid project directory ... /workspace/lint"), and there is no
ESLint config file in the repo. Use `npm run type-check` (`tsc --noEmit`) for
static checking; it passes clean.
