import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware/auth'
import { profileService } from '@/lib/services/profileService'
import { reminderProcessor } from '@/lib/services/reminderProcessor'
import { handleError } from '@/lib/utils/errorHandler'

/**
 * POST /api/admin/profiles/[id]/send-claim-reminder
 * Manually send a claim reminder email for a specific profile
 * Admin-only endpoint
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check admin authentication
    const auth = await requireAdmin(request)
    if (auth instanceof NextResponse) return auth

    const profileId = params.id

    // Validate profile ID format (UUID)
    if (!profileId || typeof profileId !== 'string') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid profile ID',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 400 }
      )
    }

    // Get profile
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

    // Validate profile is eligible for reminder
    if (profile.is_claimed) {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Profile is already claimed',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 400 }
      )
    }

    if (!profile.claim_token) {
      return NextResponse.json(
        {
          error: {
            code: 'BAD_REQUEST',
            message: 'Profile does not have a claim token',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 400 }
      )
    }

    // Send reminder
    try {
      const { reminderType } = await reminderProcessor.sendReminderForProfile(
        profile
      )

      return NextResponse.json(
        {
          message: 'Claim reminder sent successfully',
          profileId: profile.id,
          reminderType,
        },
        { status: 200 }
      )
    } catch (error) {
      // Handle specific validation errors
      if (error instanceof Error) {
        if (
          error.message.includes('expired') ||
          error.message.includes('already sent') ||
          error.message.includes('not in a reminder window')
        ) {
          return NextResponse.json(
            {
              error: {
                code: 'BAD_REQUEST',
                message: error.message,
                timestamp: new Date().toISOString(),
                requestId: crypto.randomUUID(),
              },
            },
            { status: 400 }
          )
        }
      }
      throw error
    }
  } catch (error) {
    return handleError(error)
  }
}

