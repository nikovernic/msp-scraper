import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { contactService } from '@/lib/services/contactService'
import { emailService } from '@/lib/services/emailService'
import { handleError } from '@/lib/utils/errorHandler'
import { checkRateLimit } from '@/lib/utils/rateLimit'

// Zod schema for contact form validation
const contactFormSchema = z.object({
  producer_name: z.string().min(1, 'Producer name is required'),
  producer_email: z.string().email('Invalid email address'),
  producer_phone: z.string().optional().nullable(),
  message: z.string().min(1, 'Message is required').max(500, 'Message must be 500 characters or less'),
  shoot_dates: z.string().optional().nullable(),
})

/**
 * Extract client IP from request headers
 */
function getClientIp(request: NextRequest): string {
  // Check x-forwarded-for header (Vercel/proxy)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim()
  }

  // Check x-real-ip header
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback to connection remote address (may not work in serverless)
  return request.ip || 'unknown'
}

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug

    // Extract client IP for rate limiting
    const clientIp = getClientIp(request)

    // Check rate limit: 5 submissions per hour per IP
    if (checkRateLimit(clientIp, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many contact form submissions. Please try again later.',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = contactFormSchema.parse(body)

    // Verify profile exists and get profile ID
    const profile = await contactService.getProfileForNotificationBySlug(slug)
    if (!profile) {
      return NextResponse.json(
        {
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'Profile not found',
            timestamp: new Date().toISOString(),
            requestId: crypto.randomUUID(),
          },
        },
        { status: 404 }
      )
    }

    // Submit contact inquiry to database
    const inquiry = await contactService.submitContactInquiry({
      profile_id: profile.id,
      producer_name: validatedData.producer_name,
      producer_email: validatedData.producer_email,
      producer_phone: validatedData.producer_phone || null,
      message: validatedData.message,
      shoot_dates: validatedData.shoot_dates || null,
    })

    // Send email notification (don't fail the request if email fails)
    try {
      await emailService.sendContactNotification({
        profile,
        producerName: validatedData.producer_name,
        producerEmail: validatedData.producer_email,
        producerPhone: validatedData.producer_phone || null,
        message: validatedData.message,
        shootDates: validatedData.shoot_dates || null,
      })
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('Failed to send contact notification email:', emailError)
      // Inquiry is still saved, so we return success
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: 'Contact inquiry submitted successfully',
        inquiryId: inquiry.id,
      },
      { status: 200 }
    )
  } catch (error) {
    return handleError(error)
  }
}

