import { NextRequest, NextResponse } from 'next/server'
import { profileService } from '@/lib/services/profileService'
import { handleError } from '@/lib/utils/errorHandler'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const profile = await profileService.getProfileBySlug(slug)

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

    return NextResponse.json(profile)
  } catch (error) {
    return handleError(error)
  }
}



