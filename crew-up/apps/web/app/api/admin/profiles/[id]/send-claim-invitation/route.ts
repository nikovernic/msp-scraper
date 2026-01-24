import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/middleware/auth'
import { profileService } from '@/lib/services/profileService'
import { claimService } from '@/lib/services/claimService'
import { emailService } from '@/lib/services/emailService'
import { handleError } from '@/lib/utils/errorHandler'

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

    // Check if profile is already claimed
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

    // Generate and save claim token
    const claimToken = await claimService.saveClaimToken(profileId)

    // Send claim invitation email
    // If email fails, token is still saved (graceful degradation)
    try {
      await emailService.sendClaimInvitation(profile, claimToken)
    } catch (emailError) {
      // Log error but don't fail the request
      console.error('Failed to send claim invitation email:', emailError)
      // Token is still saved, so we can return success
      // Admin can manually resend email if needed
    }

    return NextResponse.json(
      {
        message: 'Claim invitation sent successfully',
        profileId: profile.id,
      },
      { status: 200 }
    )
  } catch (error) {
    return handleError(error)
  }
}

