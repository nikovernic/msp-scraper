import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware/auth'
import { profileService } from '@/lib/services/profileService'
import { handleError } from '@/lib/utils/errorHandler'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Credit } from '@crew-up/shared'

// Zod schema for credit creation/update
const creditSchema = z.object({
  project_title: z.string().min(1, 'Project title is required'),
  role: z.string().min(1, 'Role is required'),
  project_type: z.enum([
    'commercial',
    'feature_film',
    'documentary',
    'music_video',
    'tv',
    'corporate',
    'other',
  ]),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  production_company: z.string().optional().nullable(),
  director: z.string().optional().nullable(),
  display_order: z.number().int().min(0).default(0),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const { id: profileId } = params

    // Verify profile exists
    const profile = await profileService.getProfileById(profileId)
    if (!profile) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Profile not found',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = creditSchema.parse(body)

    // Create credit
    const supabase = createClient()
    const { data: credit, error } = await supabase
      .from('credits')
      .insert({
        profile_id: profileId,
        ...validatedData,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create credit: ${error.message}`)
    }

    return NextResponse.json(credit as Credit, { status: 201 })
  } catch (error) {
    return handleError(error)
  }
}


