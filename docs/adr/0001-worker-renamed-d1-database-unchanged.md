---
status: accepted
---

# Worker renamed to omachi, D1 database stays omastats

omachi is becoming the new home for the omastats product (same Worker, new codebase, new name), so the Cloudflare Worker's `name` in `wrangler.jsonc` changes from `omastats` to `omachi`. The D1 database does not follow: Cloudflare has no in-place database rename, not even via the API — the only path is exporting to SQL and importing into a newly created database (confirmed against Cloudflare's own docs and community answers). Renaming the D1 database would mean replaying ~142k rows of snapshot history for a purely cosmetic gain, so `database_name`/`database_id` in the `d1_databases` binding stay `omastats`, along with every other existing binding (custom domain route, vars).

## Consequences

`wrangler.jsonc` will show `name: "omachi"` next to a D1 binding still called `omastats`. That mismatch is intentional, not a leftover from an incomplete migration — don't "fix" it without redoing the export/import tradeoff analysis above.
