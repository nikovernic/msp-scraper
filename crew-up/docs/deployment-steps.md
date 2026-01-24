# Deployment Steps

## Pre-Deployment Checklist

✅ **Build successful** - Verified  
✅ **Linting passes** - Verified  
✅ **All tests passing** - 353 tests  
✅ **Email domains updated** - findfilmcrew.com  
✅ **Email from addresses configured** - Using Resend default domain  

## Deployment Options

### Option 1: Automatic Deployment (Recommended)

If your GitHub repository is connected to Vercel and you have the GitHub Actions workflow set up:

1. **Commit and push your changes:**
   ```bash
   git add .
   git commit -m "Update email domains to findfilmcrew.com and configure Resend email addresses"
   git push origin main
   ```

2. **Automatic deployment:**
   - GitHub Actions will trigger on push to `main`
   - Build will run automatically
   - Deployment to Vercel will happen automatically

3. **Monitor deployment:**
   - Check GitHub Actions tab for build status
   - Check Vercel dashboard for deployment status

### Option 2: Manual Vercel Deployment

If you prefer to deploy manually through Vercel:

1. **Install Vercel CLI (if not already installed):**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd apps/web
   vercel --prod
   ```

## Post-Deployment Tasks

### 1. Verify Environment Variables in Vercel

Make sure these are set in Vercel project settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `NODE_ENV=production`

### 2. Run Database Migration

**Important:** Run the reminder tracking migration on production Supabase:

1. Log into your production Supabase dashboard
2. Go to SQL Editor
3. Run the migration: `apps/web/supabase/migrations/003_claim_reminder_tracking.sql`
4. Verify columns `reminder_sent_at_7days` and `reminder_sent_at_14days` exist

### 3. Test Production Deployment

After deployment, test:

- [ ] Homepage loads: `https://findfilmcrew.com` (or your Vercel URL)
- [ ] Search functionality works
- [ ] Profile pages load correctly
- [ ] Contact form works
- [ ] Sign-in works
- [ ] API endpoints respond correctly

### 4. Set Up Scheduled Job (Optional but Recommended)

Set up a daily cron job to process reminders:

**Option A: Vercel Cron (Recommended)**
- Create `vercel.json` with cron configuration
- Or use Vercel dashboard to set up cron job

**Option B: GitHub Actions Scheduled Workflow**
- Create a workflow that runs daily
- Calls `POST /api/admin/reminders/process`

**Option C: External Cron Service**
- Use cron-job.org, EasyCron, etc.
- Set to call `POST https://findfilmcrew.com/api/admin/reminders/process` daily

## Troubleshooting

### Build Fails
- Check Vercel build logs
- Verify all environment variables are set
- Check for TypeScript errors

### Environment Variables Not Loading
- Verify variables are set in Vercel dashboard
- Check variable names match exactly (case-sensitive)
- Redeploy after adding variables

### Database Connection Issues
- Verify Supabase URL and keys are correct
- Check if Supabase project is paused (free tier)
- Verify RLS policies are configured

### Email Not Sending
- Verify `RESEND_API_KEY` is set correctly
- Check Resend dashboard for delivery status
- Verify "from" email domain is valid (using `onboarding@resend.dev` works immediately)

## Next Steps After Deployment

1. ✅ Monitor error logs in Vercel
2. ✅ Test all critical user flows
3. ✅ Set up monitoring/alerting (if not already)
4. ✅ Configure scheduled job for reminders
5. ✅ Monitor email delivery rates

---

**Ready to deploy!** 🚀

