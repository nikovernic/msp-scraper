# Supabase Migration Instructions

## Quick Migration Guide

You need to run 3 migrations in order. Copy and paste each one into the Supabase SQL Editor.

---

## Migration 1: Initial Schema

**File:** `apps/web/supabase/migrations/001_initial_schema.sql`

1. Go to Supabase dashboard → SQL Editor → New query
2. Copy the ENTIRE contents of the file above
3. Paste into SQL Editor
4. Click "Run" (or press Cmd+Enter)
5. Wait for "Success" message

This creates:
- `users` table
- `profiles` table
- `credits` table
- `contact_inquiries` table
- Indexes and RLS policies

---

## Migration 2: Search Function

**File:** `apps/web/supabase/migrations/002_search_profiles_rpc.sql`

1. In SQL Editor, click "New query"
2. Copy the ENTIRE contents of the file above
3. Paste into SQL Editor
4. Click "Run"
5. Wait for "Success" message

This creates:
- `search_profiles()` function
- `search_profiles_count()` function

---

## Migration 3: Reminder Tracking

**File:** `apps/web/supabase/migrations/003_claim_reminder_tracking.sql`

1. In SQL Editor, click "New query"
2. Copy the ENTIRE contents of the file above
3. Paste into SQL Editor
4. Click "Run"
5. Wait for "Success" message

This adds:
- `reminder_sent_at_7days` column
- `reminder_sent_at_14days` column
- Indexes for reminder queries

---

## After Migrations

Once all 3 migrations are done:
1. Go to Storage → Create bucket `profile-photos` (public)
2. Restart your dev server
3. Add some test data to see it working!

