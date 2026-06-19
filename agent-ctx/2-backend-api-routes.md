# Task 2 — Backend API Routes Agent Work Record

## Summary
Built all backend API routes for the Shift & Payment Tracker, migrating from the old `Profile` model to the new `User` model, and adding NextAuth.js v4 authentication support.

## Files Created

1. **`/home/z/my-project/src/lib/auth.ts`** — NextAuth.js v4 configuration
   - PrismaAdapter with conditional Google provider (won't crash if credentials missing)
   - Custom callbacks: signIn, session (attaches user id, username, image to session)
   - Database session strategy
   - Custom sign-in page at `/`
   - Exported auth handlers and signIn/signOut helpers

2. **`/home/z/my-project/src/app/api/auth/[...nextauth]/route.ts`** — NextAuth route handler
   - Re-exports GET and POST handlers from NextAuth with authOptions

3. **`/home/z/my-project/src/types/next-auth.d.ts`** — Type augmentation for NextAuth
   - Added `id`, `username`, `image` to Session user type
   - Added `username` to User type

4. **`/home/z/my-project/src/app/api/profile/route.ts`** — GET/PATCH profile
   - GET: Returns user profile with totalShifts and totalEarnings
   - PATCH: Updates username, name, image fields
   - Auto-creates default user if none exists

5. **`/home/z/my-project/src/app/api/profile/export/route.ts`** — CSV export
   - Returns shifts as CSV with headers: Date, Day, Hall Name, Location, Covering For, Amount, Status
   - Proper CSV escaping for quoted fields
   - text/csv content type with attachment disposition

## Files Updated

6. **`/home/z/my-project/src/app/api/shifts/route.ts`** — Migrated to User model
   - Replaced `db.profile` with `db.user`
   - Added `getOrCreateUser()` helper
   - Added `hallName` to all response mappings
   - Added `hallName` to POST body parsing

7. **`/home/z/my-project/src/app/api/shifts/[id]/route.ts`** — Added hallName support
   - Added `hallName` to PATCH updateData mapping
   - Added `hallName` to response mapping

8. **`/home/z/my-project/src/app/api/seed/route.ts`** — Migrated to User model with new hall names
   - Replaced `db.profile` with `db.user`
   - Updated HALL_NAMES constant: Grand Ballroom, Crystal Hall, Garden Pavilion, Rooftop Terrace, Heritage Room, Lakeside Chamber, Sunset Lounge, Victoria Suite
   - Added hallName to all 40 predefined shift entries

9. **`/home/z/my-project/src/app/api/analytics/route.ts`** — Migrated to User model
   - Replaced `db.profile` with `db.user`

10. **`/home/z/my-project/src/types/database.types.ts`** — Updated type definitions
    - Removed `Profile` interface, added `UserProfile` interface (with totalShifts, totalEarnings)
    - Added `hallName` to `Shift` interface
    - Added `hallName` to `ShiftCreateInput` and `ShiftUpdateInput`
    - Added `ShiftsResponse` and `ProfileResponse` API types
    - Removed old Supabase `Database` type

## Package Installed
- `@next-auth/prisma-adapter` (v1.0.7)

## Verification
- `bun run db:push` — schema in sync
- `bun run lint` — passes clean
- No remaining references to `db.profile` in the codebase
