import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { profileService } from '@/lib/services/profileService'
import { handleError } from '@/lib/utils/errorHandler'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Credit } from '@crew-up/shared'

// Zod schema for credit update
const creditUpdateSchema = z.object({
  project_title: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  project_type: z
    .enum([
      'commercial',
      'feature_film',
      'documentary',
      'music_video',
      'tv',
      'corporate',
      'other',
    ])
    .optional(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1).optional(),
  production_company: z.string().optional().nullable(),
  director: z.string().optional().nullable(),
  display_order: z.number().int().min(0).optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { creditId: string } }
) {
  try {
    // Check authentication (require authenticated crew user)
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth

    // Get user's profile
    const profile = await profileService.getProfileByUserId(user.id)
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

    const { creditId } = params

    // Verify credit belongs to profile
    const { data: existingCredit, error: fetchError } = await supabase
      .from('credits')
      .select('*')
      .eq('id', creditId)
      .eq('profile_id', profile.id)
      .single()

    if (fetchError || !existingCredit) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Credit not found',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 404 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = creditUpdateSchema.parse(body)

    // Update credit
    const { data: credit, error } = await supabase
      .from('credits')
      .update(validatedData)
      .eq('id', creditId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update credit: ${error.message}`)
    }

    return NextResponse.json(credit as Credit)
  } catch (error) {
    return handleError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { creditId: string } }
) {
  try {
    // Check authentication (require authenticated crew user)
    const auth = await requireAuth(request)
    if (auth instanceof NextResponse) return auth

    const { user, supabase } = auth

    // Get user's profile
    const profile = await profileService.getProfileByUserId(user.id)
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

    const { creditId } = params

    // Verify credit belongs to profile
    const { data: existingCredit } = await supabase
      .from('credits')
      .select('id')
      .eq('id', creditId)
      .eq('profile_id', profile.id)
      .single()

    if (!existingCredit) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Credit not found',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 404 }
      )
    }

    // Delete credit
    const { error } = await supabase.from('credits').delete().eq('id', creditId)

    if (error) {
      throw new Error(`Failed to delete credit: ${error.message}`)
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return handleError(error)
  }
}

