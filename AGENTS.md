# AGENTS.md

## Cursor Cloud specific instructions

Jimvio is a single Next.js 16 (App Router) app backed by Supabase/Postgres. There is no
separate backend service — the Next.js server (App Router route handlers + server actions)
talks directly to Supabase. Standard commands live in `package.json` and `README.md`; only
the non-obvious cloud caveats are captured here.

### Node version (important)
The npm scripts (`dev`, `build`, `start`) pass `--use-system-ca` via `NODE_OPTIONS`, which is
only valid on Node >= 22.15. The VM's default `/exec-daemon/node` is v22.14 and will fail with
`--use-system-ca is not allowed in NODE_OPTIONS`. A newer Node (v22.23.2) is installed via nvm and
`~/.bashrc` prepends it to `PATH`. Because the harness re-prepends `/exec-daemon` for one-off tool
commands, run app commands in a **login shell** (e.g. a tmux session started with `bash -l`, or
`bash -lc '<cmd>'`) so `node -v` resolves to v22.23.2.

### Local database (Supabase) — required to run the app
The app boots for anonymous public pages without Supabase, but any auth/commerce action needs it.
Use the local Supabase stack (Docker required):

1. Ensure the Docker daemon is running and the socket is accessible:
   `sudo dockerd &` then `sudo chmod 666 /var/run/docker.sock` (only needed if `docker ps` fails).
2. Start Supabase (excludes heavy optional containers):
   `supabase start -x vector,imgproxy,edge-runtime`
3. **Do NOT rely on `supabase db reset` / the `supabase/migrations` chain — it is broken**
   (migration `088_creator_economy_memberships` references `public.communities` before it exists).
   Instead, the migrations were moved aside and the authoritative root `schema.sql` (a full pg_dump,
   77 tables) is loaded directly into the local DB:
   ```bash
   docker exec -i supabase_db_jimvio psql -v ON_ERROR_STOP=0 -U postgres -d postgres < schema.sql
   # schema.sql references public.gin_trgm_ops; enable pg_trgm + recreate the 2 trigram indexes:
   docker exec -i supabase_db_jimvio psql -U postgres -d postgres -c \
     "CREATE EXTENSION IF NOT EXISTS pg_trgm SCHEMA public;
      CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (name public.gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_vendors_name_trgm ON public.vendors USING gin (business_name public.gin_trgm_ops);"
   ```
4. `.env.local` (gitignored) holds the local Supabase URL + the deterministic Supabase CLI dev keys
   (`sb_publishable_...` / `sb_secret_...`). These are local-only, not real secrets. Recreate it from
   `supabase status` output if missing.

Auth email confirmation is disabled locally (`enable_confirmations = false` in `supabase/config.toml`),
so email/password signups are immediately usable (no inbox step). The app's `signUp` action also
writes `profiles`, `user_roles`, and `wallets` rows via the service-role client.

### Run / lint / test / build
- Dev server: `npm run dev` (login shell) → http://localhost:3000
- Lint: `npm run lint`  •  Automated verifiers: `npm test` (static `scripts/run-verifies.mjs`)
- Type check: `npm run type-check`  •  Build: `npm run build`
- Full pre-push gate (required before pushing per `.cursor/rules/pre-push-ci.mdc`): `npm run ci:prepush`

Nearly all third-party integrations (payments, LiveKit, Cloudinary, OpenAI/Gemini, Shopify, social
APIs) are optional and degrade gracefully when their env vars are unset; only Supabase is required to
exercise core flows locally.
