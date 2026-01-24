import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware/auth'
import { profileService } from '@/lib/services/profileService'
import { claimService } from '@/lib/services/claimService'
import { emailService } from '@/lib/services/emailService'
import { handleError } from '@/lib/utils/errorHandler'
import { z } from 'zod'

// Zod schema for profile creation
const createProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  primary_role: z.string().min(1, 'Primary role is required'),
  primary_location_city: z.string().min(1, 'City is required'),
  primary_location_state: z.string().length(2, 'State must be 2-letter code'),
  contact_email: z.string().email('Invalid email address'),
  contact_phone: z.string().optional().nullable(),
  bio: z.string().max(250, 'Bio must be 250 characters or less').optional().nullable(),
  portfolio_url: z.string().url().optional().nullable().or(z.literal('')),
  website: z.string().url().optional().nullable().or(z.literal('')),
  instagram_url: z.string().url().optional().nullable().or(z.literal('')),
  vimeo_url: z.string().url().optional().nullable().or(z.literal('')),
  union_status: z.enum(['union', 'non-union', 'either']).optional().nullable(),
  years_experience: z.number().int().positive().optional().nullable(),
  secondary_roles: z.array(z.string()).optional().nullable(),
  additional_markets: z
    .array(
      z.object({
        city: z.string(),
        state: z.string().length(2),
      })
    )
    .optional()
    .nullable(),
})

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    // Parse and validate request body
    const body = await request.json()
    const validatedData = createProfileSchema.parse(body)

    // Create profile
    const profile = await profileService.createProfile(validatedData)

    // Generate claim token and send invitation email
    // Email failures should not fail profile creation (graceful degradation)
    try {
      const claimToken = await claimService.saveClaimToken(profile.id)
      
      // Send claim invitation email (non-blocking)
      try {
        await emailService.sendClaimInvitation(profile, claimToken)
      } catch (emailError) {
        // Log error but don't fail profile creation
        console.error('Failed to send claim invitation email after profile creation:', emailError)
        // Token is still saved, so admin can manually resend email if needed
      }
    } catch (tokenError) {
      // Log token generation error but don't fail profile creation
      console.error('Failed to generate claim token after profile creation:', tokenError)
      // Profile is still created successfully
    }

    return NextResponse.json(profile, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}



