# Supabase Setup Guide

## Step 1: Create Supabase Project

1. **Go to Supabase:**
   - Visit: https://supabase.com
   - Click "Start your project" or "Sign in"

2. **Sign up / Sign in:**
   - Use your GitHub account (recommended) or email
   - Complete the sign-up process

3. **Create New Project:**
   - Click "New Project" or "Add Project"
   - Fill in:
     - **Name:** `crew-up` (or your preferred name)
     - **Database Password:** Create a strong password (save this!)
     - **Region:** Choose closest to you (e.g., US East)
     - **Pricing Plan:** Free tier is fine for development

4. **Wait for Project Setup:**
   - Takes 1-2 minutes
   - You'll see a loading screen

## Step 2: Get Your Credentials

Once your project is ready:

1. **Go to Project Settings:**
   - Click the gear icon (⚙️) in the left sidebar
   - Or go to: Settings → API

2. **Copy These Values:**
   - **Project URL:** `https://xxxxx.supabase.co`
   - **anon public key:** `eyJhbGc...` (long string)
   - **service_role key:** `eyJhbGc...` (long string, keep secret!)

3. **Save them somewhere safe** - you'll need them for `.env.local`

## Step 3: Run Database Migrations

1. **Open SQL Editor:**
   - In Supabase dashboard, click "SQL Editor" in left sidebar
   - Click "New query"

2. **Run Migration 1 (Initial Schema):**
   - Copy contents of: `apps/web/supabase/migrations/001_initial_schema.sql`
   - Paste into SQL Editor
   - Click "Run" (or press Cmd+Enter)
   - Wait for success message

3. **Run Migration 2 (Search Function):**
   - Copy contents of: `apps/web/supabase/migrations/002_search_profiles_rpc.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Wait for success message

4. **Run Migration 3 (Reminder Tracking):**
   - Copy contents of: `apps/web/supabase/migrations/003_claim_reminder_tracking.sql`
   - Paste into SQL Editor
   - Click "Run"
   - Wait for success message

## Step 4: Set Up Storage Bucket

1. **Go to Storage:**
   - Click "Storage" in left sidebar

2. **Create Bucket:**
   - Click "New bucket"
   - **Name:** `profile-photos`
   - **Public bucket:** ✅ Yes (check this!)
   - Click "Create bucket"

3. **Set Bucket Policies:**
   - Click on `profile-photos` bucket
   - Go to "Policies" tab
   - Click "New Policy"
   - **Policy name:** `Public read access`
   - **Allowed operation:** `SELECT`
   - **Policy definition:** `true`
   - Click "Save policy"
   
   - Create another policy:
   - **Policy name:** `Authenticated upload`
   - **Allowed operation:** `INSERT`
   - **Policy definition:** `auth.role() = 'authenticated'`
   - Click "Save policy"

## Step 5: Configure Authentication

1. **Go to Authentication:**
   - Click "Authentication" in left sidebar
   - Go to "Providers" tab

2. **Enable Email Provider:**
   - Make sure "Email" is enabled (should be by default)
   - You can customize email templates later

3. **Set Up Email Templates (Optional):**
   - Go to "Email Templates" tab
   - Customize if needed (defaults work fine)

## Step 6: Set Up Environment Variables

1. **Create `.env.local` file:**
   ```bash
   cd apps/web
   cp .env.local.template .env.local
   ```

2. **Edit `.env.local` with your credentials:**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (anon key)
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (service_role key)
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   NODE_ENV=development
   ```

3. **Restart your dev server:**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

## Step 7: Add Test Data (Optional)

To see the site working, you'll need some profiles in the database:

1. **Go to Table Editor:**
   - Click "Table Editor" in left sidebar
   - Select `profiles` table

2. **Add a Test Profile:**
   - Click "Insert" → "Insert row"
   - Fill in:
     - `name`: "John Doe"
     - `primary_role`: "Gaffer"
     - `primary_location_city`: "Nashville"
     - `primary_location_state`: "TN"
     - `contact_email`: "john@example.com"
     - `slug`: "john-doe" (auto-generated or manual)
     - `is_claimed`: false
   - Click "Save"

3. **Add More Profiles:**
   - Repeat to add a few more test profiles
   - Try different roles and locations

## Verification Checklist

- [ ] Supabase project created
- [ ] Credentials copied (URL, anon key, service_role key)
- [ ] All 3 migrations run successfully
- [ ] Storage bucket `profile-photos` created (public)
- [ ] Storage policies set up
- [ ] `.env.local` file created with credentials
- [ ] Dev server restarted
- [ ] Test profiles added (optional)

## Troubleshooting

### "Connection timeout" error:
- Check if project is paused (free tier pauses after inactivity)
- Go to project settings and click "Restore" if paused

### "Invalid API key" error:
- Double-check you copied the correct keys
- Make sure there are no extra spaces
- Verify keys in Supabase dashboard

### Migrations fail:
- Check error message in SQL Editor
- Make sure you're running migrations in order (001, 002, 003)
- Some errors are okay if tables already exist

### Storage upload fails:
- Verify bucket is public
- Check storage policies are set correctly
- Verify file size is under limit (default 5MB)

---

**Next Steps:**
1. Create Supabase project
2. Run migrations
3. Set up storage
4. Configure `.env.local`
5. Restart dev server
6. Test the site!

