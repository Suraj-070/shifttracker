-- ============================================
-- Shift & Payment Tracker — Supabase Migration
-- ============================================
-- This matches the actual app: a plain `users` table
-- (driven by NextAuth's Demo Login provider, NOT Supabase Auth),
-- and a `shifts` table with no Row Level Security, since the
-- app authenticates via NextAuth and talks to Supabase with the
-- anon key directly (no auth.uid() session is ever set).
--
-- If you later add real per-account login, switch to Supabase Auth
-- and re-enable RLS using auth.uid() — this file intentionally
-- does NOT do that today because it would silently break every
-- request the app currently makes.
-- ============================================

-- 1. Users table
CREATE TABLE IF NOT EXISTS public.users (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT,
  email          TEXT UNIQUE,
  email_verified TIMESTAMPTZ,
  image          TEXT,
  username       TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- 2. Shifts table
CREATE TABLE IF NOT EXISTS public.shifts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  covering_for  TEXT NOT NULL DEFAULT 'Unassigned',
  shift_date    DATE NOT NULL,
  location_name TEXT NOT NULL,
  notes         TEXT NOT NULL DEFAULT '',
  shift_day     TEXT NOT NULL,
  amount_earned NUMERIC(10,2) NOT NULL DEFAULT 0,
  status        TEXT NOT NULL DEFAULT 'Unpaid'
                CHECK (status IN ('Paid', 'Unpaid')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON public.shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_shift_date ON public.shifts(shift_date DESC);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);

-- ============================================
-- Migrating an EXISTING database that already has
-- the old `hall_name` column and is missing `notes`?
-- Run this block instead of recreating tables:
-- ============================================
-- ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS notes TEXT NOT NULL DEFAULT '';
-- ALTER TABLE public.shifts DROP COLUMN IF EXISTS hall_name;
