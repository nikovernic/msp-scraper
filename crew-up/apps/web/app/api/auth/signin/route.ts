import { NextRequest, NextResponse } from 'next/server'
import { authService } from '@/lib/services/authService'
import { handleError } from '@/lib/utils/errorHandler'
import { z } from 'zod'

// Zod schema for sign-in request
const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedData = signInSchema.parse(body)

    const { email, password } = validatedData

    // Authenticate user with Supabase Auth
    try {
      const result = await authService.signIn({ email, password })

      // Session is automatically created by Supabase Auth
      // Return success response with redirect URL
      return NextResponse.json(
        {
          message: 'Sign-in successful',
          user: {
            id: result.user.id,
            email: result.user.email,
          },
          redirectUrl: '/crew/profile/edit', // TODO: Update when edit page is created (Story 6.4)
        },
        { status: 200 }
      )
    } catch (error) {
      // Handle auth service errors
      if (error instanceof Error) {
        if (error.message === 'INVALID_CREDENTIALS') {
          return NextResponse.json(
            {
              error: {
                code: 'INVALID_CREDENTIALS',
                message: 'Invalid email or password',
                timestamp: new Date().toISOString(),
                requestId: crypto.randomUUID(),
              },
            },
            { status: 401 }
          )
        }

        if (error.message === 'EMAIL_NOT_CONFIRMED') {
          return NextResponse.json(
            {
              error: {
                code: 'EMAIL_NOT_CONFIRMED',
                message: 'Please confirm your email address before signing in',
                timestamp: new Date().toISOString(),
                requestId: crypto.randomUUID(),
              },
            },
            { status: 401 }
          )
        }

        // Check if account not found (user doesn't exist)
        if (error.message.includes('not found') || error.message.includes('does not exist')) {
          return NextResponse.json(
            {
              error: {
                code: 'ACCOUNT_NOT_FOUND',
                message: 'Invalid email or password',
                timestamp: new Date().toISOString(),
                requestId: crypto.randomUUID(),
              },
            },
            { status: 404 }
          )
        }
      }

      // Re-throw to be handled by handleError
      throw error
    }
  } catch (error) {
    return handleError(error)
  }
}

