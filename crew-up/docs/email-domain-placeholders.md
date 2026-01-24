# Email Domain Placeholders to Update

## Summary

There are **6 places** where `crewup.com` placeholders need to be replaced with your actual production domain:

1. **3 email "from" addresses** in `emailService.ts`
2. **3 profile URLs** in email templates

---

## 1. Email "From" Addresses (3 locations)

**File:** `apps/web/lib/services/emailService.ts`

### Location 1: Contact Notification Email
- **Line 60:** `from: 'Crew Up <noreply@crewup.com>'`
- **Used for:** Contact form notifications

### Location 2: Claim Invitation Email
- **Line 111:** `from: 'Crew Up <noreply@crewup.com>'`
- **Used for:** Initial claim invitation emails

### Location 3: Claim Reminder Email
- **Line 165:** `from: 'Crew Up <noreply@crewup.com>'`
- **Used for:** 7-day and 14-day reminder emails

**Important:** The email domain (e.g., `noreply@yourdomain.com`) must be:
- Verified in your Resend account
- Either use Resend's default domain or your custom verified domain

---

## 2. Profile URLs in Email Templates (3 locations)

### Location 1: Claim Reminder Email
**File:** `apps/web/emails/claim-reminder.tsx`
- **Line 28:** `const profileUrl = 'https://crewup.com/crew/${profile.slug}'`
- **Used for:** Links to profile pages in reminder emails

### Location 2: Claim Invitation Email
**File:** `apps/web/emails/claim-invitation.tsx`
- **Line 26:** `const profileUrl = 'https://crewup.com/crew/${profile.slug}'`
- **Used for:** Links to profile pages in invitation emails

### Location 3: Contact Notification Email
**File:** `apps/web/emails/contact-notification.tsx`
- **Line 32:** `const profileUrl = 'https://crewup.com/crew/${profileSlug}'`
- **Used for:** Links to profile pages in contact notifications

**Important:** These URLs should match your production domain (e.g., `https://yourdomain.com/crew/...`)

---

## Quick Update Guide

### Option 1: Manual Update

Replace all instances of:
- `crewup.com` → `yourdomain.com` (or your actual domain)
- `noreply@crewup.com` → `noreply@yourdomain.com` (must match Resend verification)

### Option 2: Use Environment Variable (Recommended)

You could create an environment variable for the domain and use it throughout:

```typescript
// In emailService.ts and email templates
const DOMAIN = process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'
const FROM_EMAIL = process.env.EMAIL_FROM || 'Crew Up <noreply@yourdomain.com>'
```

Then add to `.env.local`:
```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
EMAIL_FROM=Crew Up <noreply@yourdomain.com>
```

---

## Files to Update

1. ✅ `apps/web/lib/services/emailService.ts` (3 locations - lines 60, 111, 165)
2. ✅ `apps/web/emails/claim-reminder.tsx` (1 location - line 28)
3. ✅ `apps/web/emails/claim-invitation.tsx` (1 location - line 26)
4. ✅ `apps/web/emails/contact-notification.tsx` (1 location - line 32)

**Total:** 6 placeholder locations across 4 files

---

## Resend Domain Verification

Before updating the "from" email addresses, ensure:

1. **Resend Account Setup:**
   - Log into Resend dashboard
   - Go to "Domains" section
   - Either:
     - Use Resend's default domain (e.g., `onboarding.resend.dev`)
     - Add and verify your custom domain

2. **Domain Verification:**
   - Add DNS records (SPF, DKIM, DMARC) as instructed by Resend
   - Wait for verification (usually a few minutes)
   - Once verified, you can use emails from that domain

3. **Update Code:**
   - Replace `noreply@crewup.com` with your verified domain
   - Example: `noreply@yourdomain.com` or `noreply@onboarding.resend.dev`

---

## Testing After Update

After updating the domains:

1. **Test Email Sending:**
   - Send a test claim invitation
   - Send a test reminder
   - Submit a test contact form
   - Verify emails are received

2. **Verify Links:**
   - Click profile links in emails
   - Ensure they point to correct production domain
   - Verify links work correctly

3. **Check Email Deliverability:**
   - Monitor Resend dashboard for delivery status
   - Check spam folders if emails don't arrive
   - Verify "from" address appears correctly

---

## Priority

- **High Priority:** Update before sending any production emails
- **Can Deploy First:** You can deploy with placeholders, but update before sending real emails
- **Recommended:** Update before first production deployment

