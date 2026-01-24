import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { profileService } from '@/lib/services/profileService'
import { handleError } from '@/lib/utils/errorHandler'
import { z } from 'zod'

// Zod schema for profile update (all fields optional)
const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  primary_role: z.string().min(1, 'Primary role is required').optional(),
  primary_location_city: z.string().min(1, 'City is required').optional(),
  primary_location_state: z.string().length(2, 'State must be 2-letter code').optional(),
  contact_email: z.string().email('Invalid email address').optional(),
  contact_phone: z.string().optional().nullable(),
  bio: z.string().max(250, 'Bio must be 250 characters or less').optional().nullable(),
  portfolio_url: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
  website: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
  instagram_url: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
  vimeo_url: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
  union_status: z.enum(['union', 'non-union', 'either']).optional().nullable(),
  years_experience: z.number().int().positive().optional().nullable(),
  secondary_roles: z.array(z.string()).optional().nullable(),
  additional_markets: z
    .array(
      z.object({
        city: z.string().min(1, 'City is required'),
        state: z.string().length(2, 'State must be 2-letter code'),
      })
    )
    .optional()
    .nullable(),
  photo_url: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
})

export async function PUT(request: NextRequest) {
  try {
    // Check authentication (require authenticated crew user)
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const { user } = auth

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    // Update profile (ensures user can only update their own profile)
    const updatedProfile = await profileService.updateProfileForUser(user.id, validatedData)

    return NextResponse.json(updatedProfile, { status: 200 })
  } catch (error) {
    return handleError(error)
  }
}

