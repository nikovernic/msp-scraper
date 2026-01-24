# Local Production Testing Guide

This guide helps you test the production build locally before deploying to Vercel.

## Quick Start

### 1. Build for Production

```bash
cd apps/web
npm run build
```

This creates an optimized production build in the `.next` directory.

### 2. Start Production Server

```bash
npm start
```

The production server will start on `http://localhost:3000`

### 3. Test the Application

Open your browser and navigate to:
- **Homepage:** http://localhost:3000
- **Search:** http://localhost:3000/search
- **Profile Page:** http://localhost:3000/crew/[slug] (use an actual profile slug)
- **API Endpoints:** http://localhost:3000/api/...

## What to Test

### Core Functionality
- [ ] Homepage loads correctly
- [ ] Search functionality works
- [ ] Profile pages display correctly
- [ ] Profile photos load
- [ ] Contact form works
- [ ] Sign-in flow works
- [ ] Profile claiming works
- [ ] Profile editing works

### API Endpoints
- [ ] `/api/profiles/search` - Search profiles
- [ ] `/api/profiles/[slug]` - Get profile by slug
- [ ] `/api/profiles/[slug]/contact` - Contact form submission
- [ ] `/api/auth/claim/[token]` - Claim profile
- [ ] `/api/admin/reminders/process` - Bulk reminder processing (admin only)
- [ ] `/api/admin/profiles/[id]/send-claim-reminder` - Manual reminder (admin only)

### Performance
- [ ] Pages load quickly
- [ ] Images optimize correctly
- [ ] No console errors
- [ ] No network errors

### Environment Variables

Make sure your `.env.local` file has all required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_xxxxxxxxxxxxx
NODE_ENV=production  # Use 'production' for production build testing
```

**Note:** The production server will use environment variables from `.env.local`, but in a real deployment, these should be set in Vercel.

## Differences from Development Mode

### Production Mode Characteristics:
- **Optimized bundles:** Code is minified and optimized
- **Static generation:** Pages that can be statically generated are pre-rendered
- **No hot reload:** Changes require rebuild
- **Error handling:** Production error pages instead of dev error overlay
- **Performance:** Closer to actual production performance

### What to Watch For:
- **Build errors:** Any issues that only appear in production
- **Environment variable issues:** Variables not loading correctly
- **API route issues:** Server-side code behaving differently
- **Static generation issues:** Pages that should be static but aren't
- **Image optimization:** Next.js Image component behavior

## Troubleshooting

### Build Fails
- Check for TypeScript errors: `npm run type-check`
- Check for linting errors: `npm run lint`
- Review build output for specific errors

### Server Won't Start
- Make sure port 3000 is not in use
- Check that build completed successfully
- Verify environment variables are set

### API Routes Not Working
- Check that environment variables are loaded
- Verify Supabase connection
- Check server logs for errors

### Pages Not Loading
- Check browser console for errors
- Verify API endpoints are responding
- Check network tab for failed requests

## Next Steps

After successful local testing:

1. **Update email domains** (if not done already)
   - Replace `crewup.com` placeholders with actual domain

2. **Run database migrations** on production Supabase
   - Apply `003_claim_reminder_tracking.sql`

3. **Set environment variables** in Vercel
   - Add all required variables to Vercel project settings

4. **Deploy to Vercel**
   - Push to `main` branch (auto-deploys)
   - Or manually trigger deployment

## Stopping the Server

Press `Ctrl+C` in the terminal to stop the production server.

