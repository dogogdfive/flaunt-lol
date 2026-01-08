# Production Outage Post-Mortem: Store Pages Server Error

## Executive Summary

**Incident:** All store pages on flaunt.lol were returning HTTP 500 errors with message "Application error: a server-side exception has occurred" (Digest: 2481474876).

**Root Cause:** Database schema drift - the Prisma schema had `latitude` and `longitude` columns on the `stores` table that were never migrated to the production Supabase database.

**Resolution:** Added missing columns via Supabase MCP migration.

**Duration:** Unknown start time, discovered January 8, 2026.

---

## Technical Background

### How Prisma Works with Databases

Prisma is an ORM (Object-Relational Mapping) that acts as a bridge between your TypeScript/JavaScript code and the PostgreSQL database. It has two key components:

1. **Prisma Schema (`prisma/schema.prisma`)**: A declarative file that defines your database models, their fields, types, and relationships. This is the "source of truth" for what your application expects the database to look like.

2. **Prisma Client**: Auto-generated TypeScript code that provides type-safe database queries. The client is regenerated every time you run `prisma generate` (which happens during `npm run build`).

### The Schema-Database Synchronization Problem

When you add new fields to the Prisma schema, you must also update the actual database to match. There are two ways to do this:

- **`prisma db push`**: Directly pushes schema changes to the database (used in development)
- **`prisma migrate`**: Creates versioned migration files (used in production)

If you update the schema but don't run either command against the production database, you get **schema drift** - the Prisma Client expects columns that don't exist.

### What Happened Here

In commit `d70906b` ("Add local selling and animal sales features"), the following fields were added to the Store model in `prisma/schema.prisma`:

```prisma
// Lines 96-98 in prisma/schema.prisma
latitude         Float?            @map("latitude")
longitude        Float?            @map("longitude")
showLocation     Boolean           @default(false) @map("show_location")
```

The `show_location` column was added to the database, but `latitude` and `longitude` were NOT.

---

## Why This Caused All Store Pages to Break

### Server-Side Rendering Flow

When a user visits `/store/mcdonaldscoin`, here's what happens:

1. Next.js receives the request on Vercel
2. The server component `app/(store)/store/[slug]/page.tsx` executes
3. It calls `prisma.store.findUnique()` to fetch the store data
4. Prisma Client generates a SQL query that includes ALL columns defined in the schema
5. PostgreSQL tries to SELECT the `latitude` column
6. **ERROR**: Column doesn't exist, query fails
7. Next.js catches the error and shows the generic error page

### The Generated SQL

When Prisma runs `store.findUnique()`, it generates SQL like:

```sql
SELECT
  id, owner_id, name, slug, description, logo_url, banner_url,
  status, rejection_reason, payout_wallet, website_url, twitter_url,
  discord_url, telegram_url, is_verified, trades_enabled, total_sales,
  total_orders, avg_rating, review_count, approved_at, approved_by_id,
  created_at, updated_at, contact_email, contact_phone, business_name,
  business_address, business_city, business_state, business_zip,
  business_country, latitude, longitude, show_location  -- THESE TWO DON'T EXIST!
FROM stores
WHERE slug = 'mcdonaldscoin' AND status = 'APPROVED'
```

PostgreSQL throws error P2022: `The column 'stores.latitude' does not exist in the current database.`

### Why Old Deployments Also Failed

This is the key insight that confused the debugging initially. Even older Vercel deployments that "used to work" were failing.

**The database is shared across all deployments.** Every deployment connects to the same Supabase database. When the Prisma Client in ANY deployment tries to query the `stores` table, it fails because:

- Older deployments: Had older Prisma schema without latitude/longitude - these were working fine
- Newer deployments (post d70906b): Have Prisma schema with latitude/longitude - these expect columns that don't exist

BUT when Vercel caches the Prisma Client or when the Node.js runtime is shared, all deployments can end up using the newer Prisma Client that expects the missing columns.

Additionally, Vercel's build system runs `prisma generate` during each deployment, which regenerates the client based on the current schema in the repo. So even "rolling back" to an older deployment didn't help because Vercel would regenerate the client with the current schema.

---

## The Misleading Debug Trail

### Initial Suspicion: Background Removal Code

The investigation started when implementing a feature to add automatic background removal to store logo uploads. The changes were made to `app/(merchant)/merchant/settings/page.tsx`, which is:

1. A **client component** (has `'use client'` directive)
2. In a completely different route (`/merchant/settings` vs `/store/[slug]`)
3. Doesn't affect server-side rendering at all

The timing was coincidental - the real issue (schema drift) had been lurking since commit `d70906b`, but nobody had tried to load a store page until after the background removal feature was deployed.

### Why Reverting Code Didn't Help

Multiple code reverts were attempted:
1. Reverted the background removal feature
2. Reverted incorrect Next.js 15 params changes
3. Full revert to pre-feature state

None of these helped because **the problem was in the database, not the code**. The Prisma schema still had the latitude/longitude fields, and the database still lacked them.

---

## The Fix

### Migration Applied

```sql
ALTER TABLE stores ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
```

This was applied via the Supabase MCP (Model Context Protocol) integration, which allows direct database modifications through Claude Code.

### Verification

After the migration, the stores table now has all required columns:
- `latitude` (DOUBLE PRECISION, nullable)
- `longitude` (DOUBLE PRECISION, nullable)

---

## Prevention: How to Avoid This in the Future

### 1. Always Run Migrations on Schema Changes

When you modify `prisma/schema.prisma`:

```bash
# Development
npx prisma db push

# Production (via CI/CD or manually)
npx prisma migrate deploy
```

### 2. Add Migration Check to CI/CD

Add a step that compares Prisma schema against production database:

```bash
npx prisma migrate status
```

This will show if there are pending migrations.

### 3. Use Prisma Migrate Instead of db push for Production

Create versioned migrations that can be tracked in git:

```bash
npx prisma migrate dev --name add_store_location_fields
```

This creates a migration file in `prisma/migrations/` that documents what changed.

### 4. Test Database Queries in Staging First

Before deploying, verify that all Prisma queries work against a staging database with the same schema as production.

---

## Timeline

1. **Unknown date**: Commit `d70906b` added `latitude`, `longitude`, `showLocation` to Prisma schema
2. **Unknown date**: Migration partially applied (only `show_location` added, not lat/long)
3. **January 8, 2026 ~01:00**: Background removal feature implemented and deployed
4. **January 8, 2026 ~01:30**: Store pages discovered broken, initially blamed on bg removal code
5. **January 8, 2026 ~02:00**: Multiple code reverts attempted, none worked
6. **January 8, 2026 ~06:42**: Vercel logs revealed the actual error (P2022)
7. **January 8, 2026 ~06:45**: Missing columns added via Supabase MCP

---

## Lessons Learned

1. **Error messages matter**: The generic "server-side exception" error hid the actual cause. Always check Vercel function logs for the real error.

2. **Database is shared**: Rolling back code doesn't roll back database schema. Schema drift affects all deployments.

3. **Correlation ≠ Causation**: The store pages broke right after deploying bg removal, but the actual cause was unrelated schema drift that had been waiting to cause problems.

4. **Prisma is strict**: Unlike some ORMs that ignore missing columns, Prisma queries all fields defined in the schema. This is actually good - it catches schema drift early.
