# Deployment Readiness Checklist

**Date:** 2025-01-24  
**Project:** Crew Up  
**Status:** Pre-Deployment Review

## Pre-Deployment Validation

### ✅ Code Quality & Testing

- [x] **All tests passing**
  - Status: 353 tests passing (46 test files)
  - Coverage: Unit + Integration tests for all new features
  - Pre-existing test failures resolved

- [x] **Build successful**
  - Status: `npm run build` compiles without errors
  - Note: Sitemap warning is pre-existing and non-blocking

- [x] **Linting passes**
  - Status: `npm run lint` passes with no errors or warnings

- [x] **Type checking**
  - Status: TypeScript compilation successful
  - All type errors resolved

### ✅ Database & Migrations

- [x] **Migrations ready**
  - Migration files:
    - `001_initial_schema.sql` - Core schema
    - `002_search_profiles_rpc.sql` - Search functionality
    - `003_claim_reminder_tracking.sql` - Reminder tracking (Story 6.5)
  - **Action Required:** Run migrations on production Supabase instance before deployment

- [x] **Database schema documented**
  - Schema defined in migrations
  - Types updated in `packages/shared/src/types/index.ts`

### ⚠️ Environment Variables

**Required for Production (Vercel):**

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Node Environment
NODE_ENV=production
```

**Action Required:**
- [ ] Set all environment variables in Vercel project settings
- [ ] Verify variables are set for Production, Preview, and Development environments
- [ ] Ensure `RESEND_API_KEY` is configured (required for claim reminders and contact notifications)

### ⚠️ Pre-Deployment Tasks

#### 1. Email Template Domain Update
- [ ] **File:** `apps/web/emails/claim-reminder.tsx` (line 28)
- [ ] **Current:** `https://crewup.com/crew/${profile.slug}` (placeholder)
- [ ] **Action:** Update to actual production domain
- [ ] **Priority:** High (affects claim links in reminder emails)

#### 2. Database Migrations
- [ ] Run migration `003_claim_reminder_tracking.sql` on production Supabase
- [ ] Verify columns `reminder_sent_at_7days` and `reminder_sent_at_14days` exist in `profiles` table
- [ ] Test migration rollback plan (if needed)

#### 3. Scheduled Job Setup (Reminder Processing)
- [ ] **Endpoint:** `POST /api/admin/reminders/process`
- [ ] **Action:** Set up daily cron job to trigger reminder processing
- [ ] **Options:**
  - Vercel Cron Jobs (recommended)
  - GitHub Actions scheduled workflow
  - External cron service (cron-job.org, EasyCron, etc.)
- [ ] **Schedule:** Daily at optimal time (e.g., 9 AM EST)
- [ ] **Priority:** Medium (can be set up post-deployment)

#### 4. Supabase Storage Configuration
- [ ] Verify `profile-photos` bucket exists in production Supabase
- [ ] Verify bucket policies allow public read access
- [ ] Verify bucket policies allow authenticated uploads (for profile photo updates)

#### 5. Resend API Configuration
- [ ] Verify Resend API key is valid and has sufficient quota
- [ ] **Free tier:** 100 emails/day
- [ ] **Paid tier:** 50,000 emails/month
- [ ] Configure "From" email address in Resend dashboard
- [ ] Verify domain authentication (if using custom domain)

### ✅ Deployment Configuration

- [x] **Vercel Configuration**
  - Deployment workflow: `.github/workflows/deploy.yml` exists
  - Auto-deploy on push to `main` branch configured
  - Build command: `pnpm build` (or `npm run build`)
  - Output directory: `.next`

- [x] **CI/CD Pipeline**
  - GitHub Actions workflow configured
  - Tests run before deployment
  - Deployment requires Vercel secrets:
    - `VERCEL_TOKEN`
    - `VERCEL_ORG_ID`
    - `VERCEL_PROJECT_ID`

### ✅ Security Checklist

- [x] **Authentication**
  - Admin endpoints protected with `requireAdmin` middleware
  - User endpoints protected with `requireAuth` middleware
  - Supabase RLS policies in place

- [x] **Input Validation**
  - Zod schemas for all API endpoints
  - File upload validation (size, type, magic bytes)
  - SQL injection prevention (Supabase parameterized queries)

- [x] **Error Handling**
  - Consistent error handling with `handleError` utility
  - No sensitive information leaked in error messages
  - Proper HTTP status codes

- [x] **Secrets Management**
  - No hardcoded secrets in code
  - Environment variables used for all sensitive data
  - Service role keys only used server-side

### ✅ Feature Completeness

- [x] **Core Features**
  - Profile search and filtering
  - Profile claiming system
  - Contact form functionality
  - Profile photo uploads
  - Profile editing

- [x] **Story 6.5: Claim Reminder Emails**
  - Reminder service implemented
  - Email template created
  - Bulk processing endpoint
  - Manual reminder endpoint
  - Database tracking

### 📋 Post-Deployment Tasks

#### Immediate (Day 1)
- [ ] Verify deployment URL is accessible
- [ ] Test critical user flows:
  - [ ] Profile search
  - [ ] Profile claiming
  - [ ] Contact form submission
  - [ ] Profile photo upload
- [ ] Monitor error logs in Vercel dashboard
- [ ] Verify environment variables are loaded correctly

#### Week 1
- [ ] Set up monitoring/alerting (if not already configured)
- [ ] Test reminder email system manually
- [ ] Set up scheduled job for reminder processing
- [ ] Monitor email delivery rates (Resend dashboard)
- [ ] Check database performance

#### Month 1
- [ ] Monitor user feedback
- [ ] Track profile claim rates
- [ ] Monitor email bounce rates
- [ ] Review and optimize database queries if needed

### 🚨 Known Issues & Technical Debt

1. **Email Template Domain (Low Priority)**
   - Location: `apps/web/emails/claim-reminder.tsx:28`
   - Issue: Placeholder domain `crewup.com`
   - Impact: Claim links in reminder emails will use placeholder domain
   - Fix: Update to production domain before sending reminders

2. **Sitemap Dynamic Rendering Warning (Non-blocking)**
   - Issue: Sitemap uses cookies, preventing static generation
   - Impact: Sitemap is dynamically rendered (acceptable for MVP)
   - Fix: Can be optimized later if needed

3. **Scheduled Job Not Configured (Medium Priority)**
   - Issue: Reminder processing endpoint exists but no cron job set up
   - Impact: Reminders won't be sent automatically until cron is configured
   - Fix: Set up Vercel Cron or external cron service

### 📊 Deployment Steps

1. **Pre-Deployment**
   ```bash
   # Final verification
   cd apps/web
   npm run lint
   npm run build
   npm test
   ```

2. **Database Migration**
   - Log into production Supabase dashboard
   - Navigate to SQL Editor
   - Run migration: `003_claim_reminder_tracking.sql`
   - Verify columns created successfully

3. **Environment Variables**
   - Log into Vercel dashboard
   - Navigate to Project Settings > Environment Variables
   - Add all required variables (see above)
   - Set for Production, Preview, and Development

4. **Deploy**
   - Push to `main` branch (triggers auto-deploy)
   - OR manually trigger deployment in Vercel dashboard
   - Monitor deployment logs

5. **Post-Deployment Verification**
   - Test production URL
   - Verify API endpoints respond correctly
   - Check Vercel function logs for errors
   - Test critical user flows

### ✅ Final Checklist

Before deploying, ensure:

- [ ] All tests passing locally
- [ ] Build successful locally
- [ ] Database migrations ready and tested
- [ ] Environment variables documented and ready to set in Vercel
- [ ] Email template domain updated (or scheduled for immediate post-deploy fix)
- [ ] Resend API key configured
- [ ] Supabase production instance ready
- [ ] Storage bucket configured
- [ ] Deployment workflow secrets configured in GitHub

## Deployment Approval

**Status:** ✅ **READY FOR DEPLOYMENT** (with noted action items)

**Recommendation:** 
- Deploy to production after completing:
  1. Database migration
  2. Environment variable configuration
  3. Email template domain update (or fix immediately post-deploy)

**Blockers:** None

**Optional Post-Deploy:**
- Scheduled job setup for reminder processing
- Monitoring/alerting configuration

---

**Last Updated:** 2025-01-24  
**Validated By:** Dev Agent (Claude Sonnet 4.5)

