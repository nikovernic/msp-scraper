import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { claimService } from '@/lib/services/claimService'
import { handleError } from '@/lib/utils/errorHandler'
import { z } from 'zod'

// Zod schema for claim request
const claimSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one lowercase letter, one uppercase letter, and one number'
    ),
})

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validatedData = claimSchema.parse(body)

    const { token, email, password } = validatedData

    // Validate claim token
    const profile = await claimService.validateClaimToken(token)

    if (!profile) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid, expired, or already used claim token',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 404 }
      )
    }

    // Check if token is expired
    if (profile.claim_token_expires_at) {
      const expirationDate = new Date(profile.claim_token_expires_at)
      const now = new Date()
      if (expirationDate < now) {
        return NextResponse.json(
          {
            error: {
              code: 'EXPIRED_TOKEN',
              message: 'Claim token has expired',
              timestamp: new Date().toISOString(),
              requestId: crypto.randomUUID(),
            },
          },
          { status: 400 }
        )
      }
    }

    // Check if profile is already claimed
    if (profile.is_claimed) {
      return NextResponse.json(
        {
          error: {
            code: 'ALREADY_CLAIMED',
            message: 'Profile has already been claimed',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createClient()

    // Create Supabase Auth user account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined, // Don't require email confirmation for claim flow
        data: {
          role: 'crew', // Set default role
        },
      },
    })

    if (authError) {
      // Check if email already exists
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return NextResponse.json(
          {
            error: {
              code: 'EMAIL_EXISTS',
              message: 'An account with this email already exists',
              timestamp: new Date().toISOString(),
              requestId: crypto.randomUUID(),
            },
          },
          { status: 400 }
        )
      }

      throw new Error(`Failed to create user account: ${authError.message}`)
    }

    if (!authData.user) {
      throw new Error('Failed to create user account: No user returned')
    }

    const userId = authData.user.id

    // Create user record in users table with role
    const { error: userError } = await supabase.from('users').insert({
      id: userId,
      email,
      role: 'crew',
    })

    if (userError) {
      // If user record creation fails, try to clean up auth user
      // Note: We can't easily delete auth users, but the user record is what matters for our app
      console.error('Failed to create user record:', userError)
      throw new Error(`Failed to create user record: ${userError.message}`)
    }

    // Claim profile: link to user account and invalidate token
    await claimService.claimProfile(profile.id, userId)

    // Return success response
    return NextResponse.json(
      {
        message: 'Profile claimed successfully',
        profileId: profile.id,
        userId,
        redirectUrl: `/crew/${profile.slug}/edit`, // TODO: Update when edit page is created
      },
      { status: 200 }
    )
  } catch (error) {
    return handleError(error)
  }
}

