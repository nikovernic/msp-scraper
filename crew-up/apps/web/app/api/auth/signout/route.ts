import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/services/authService'
import { handleError } from '@/lib/utils/errorHandler'

export async function POST(request: NextRequest) {
  try {
    // Sign out user (clears session)
    await authService.signOut()

    // Return success response with redirect to homepage
    return NextResponse.json(
      {
        message: 'Sign-out successful',
        redirectUrl: '/',
      },
      { status: 200 }
    )
  } catch (error) {
    return handleError(error)
  }
}

