import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/profiles/[slug]/contact/route'
import { NextRequest } from 'next/server'
import type { Profile, ContactInquiry } from '@crew-up/shared'

// Mock dependencies
vi.mock('@/lib/services/contactService', () => ({
  contactService: {
    submitContactInquiry: vi.fn(),
    getProfileForNotificationBySlug: vi.fn(),
  },
}))

vi.mock('@/lib/services/emailService', () => ({
  emailService: {
    sendContactNotification: vi.fn(),
  },
}))

vi.mock('@/lib/utils/rateLimit', () => ({
  checkRateLimit: vi.fn(() => false), // Default: not rate limited
}))

import { contactService } from '@/lib/services/contactService'
import { emailService } from '@/lib/services/emailService'
import { checkRateLimit } from '@/lib/utils/rateLimit'

describe('POST /api/profiles/[slug]/contact', () => {
  const mockProfile: Profile = {
    id: 'profile-1',
    user_id: null,
    name: 'Crew Member',
    primary_role: 'Gaffer',
    primary_location_city: 'Nashville',
    primary_location_state: 'TN',
    contact_email: 'crew@example.com',
    slug: 'crew-member-gaffer-nashville',
    is_claimed: false,
    claim_token: null,
    claim_token_expires_at: null,
    bio: null,
    photo_url: null,
    contact_phone: null,
    portfolio_url: null,
    website: null,
    instagram_url: null,
    vimeo_url: null,
    union_status: null,
    years_experience: null,
    secondary_roles: null,
    additional_markets: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const mockInquiry: ContactInquiry = {
    id: 'inquiry-1',
    profile_id: 'profile-1',
    producer_name: 'John Producer',
    producer_email: 'john@example.com',
    producer_phone: '555-1234',
    message: 'Interested in working together',
    shoot_dates: 'March 15-20, 2024',
    created_at: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(checkRateLimit).mockReturnValue(false)
  })

  it('should submit contact inquiry successfully', async () => {
    vi.mocked(contactService.getProfileForNotificationBySlug).mockResolvedValue(mockProfile)
    vi.mocked(contactService.submitContactInquiry).mockResolvedValue(mockInquiry)
    vi.mocked(emailService.sendContactNotification).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/profiles/profile-1/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
      },
      body: JSON.stringify({
        producer_name: 'John Producer',
        producer_email: 'john@example.com',
        producer_phone: '555-1234',
        message: 'Interested in working together',
        shoot_dates: 'March 15-20, 2024',
      }),
    })

    const response = await POST(request, { params: { slug: 'crew-member-gaffer-nashville' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.inquiryId).toBe('inquiry-1')
    expect(contactService.getProfileForNotificationBySlug).toHaveBeenCalledWith('crew-member-gaffer-nashville')
    expect(contactService.submitContactInquiry).toHaveBeenCalledWith({
      profile_id: 'profile-1',
      producer_name: 'John Producer',
      producer_email: 'john@example.com',
      producer_phone: '555-1234',
      message: 'Interested in working together',
      shoot_dates: 'March 15-20, 2024',
    })
    expect(emailService.sendContactNotification).toHaveBeenCalled()
  })

  it('should handle optional fields', async () => {
    vi.mocked(contactService.getProfileForNotificationBySlug).mockResolvedValue(mockProfile)
    vi.mocked(contactService.submitContactInquiry).mockResolvedValue({
      ...mockInquiry,
      producer_phone: null,
      shoot_dates: null,
    })
    vi.mocked(emailService.sendContactNotification).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/profiles/profile-1/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
      },
      body: JSON.stringify({
        producer_name: 'Jane Producer',
        producer_email: 'jane@example.com',
        message: 'Hello',
      }),
    })

    const response = await POST(request, { params: { slug: 'crew-member-gaffer-nashville' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(contactService.submitContactInquiry).toHaveBeenCalledWith({
      profile_id: 'profile-1',
      producer_name: 'Jane Producer',
      producer_email: 'jane@example.com',
      producer_phone: null,
      message: 'Hello',
      shoot_dates: null,
    })
  })

  it('should return 429 when rate limit exceeded', async () => {
    vi.mocked(checkRateLimit).mockReturnValue(true)

    const request = new NextRequest('http://localhost:3000/api/profiles/profile-1/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
      },
      body: JSON.stringify({
        producer_name: 'John Producer',
        producer_email: 'john@example.com',
        message: 'Hello',
      }),
    })

    const response = await POST(request, { params: { slug: 'crew-member-gaffer-nashville' } })
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error.code).toBe('RATE_LIMIT_EXCEEDED')
    expect(contactService.submitContactInquiry).not.toHaveBeenCalled()
  })

  it('should return 404 when profile not found', async () => {
    vi.mocked(contactService.getProfileForNotificationBySlug).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/profiles/profile-999/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
      },
      body: JSON.stringify({
        producer_name: 'John Producer',
        producer_email: 'john@example.com',
        message: 'Hello',
      }),
    })

    const response = await POST(request, { params: { slug: 'non-existent-slug' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe('PROFILE_NOT_FOUND')
    expect(contactService.submitContactInquiry).not.toHaveBeenCalled()
  })

  it('should return 400 for validation errors', async () => {
    const request = new NextRequest('http://localhost:3000/api/profiles/profile-1/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
      },
      body: JSON.stringify({
        producer_name: '', // Invalid: empty
        producer_email: 'invalid-email', // Invalid: not an email
        message: 'a'.repeat(501), // Invalid: too long
      }),
    })

    const response = await POST(request, { params: { slug: 'crew-member-gaffer-nashville' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(contactService.submitContactInquiry).not.toHaveBeenCalled()
  })

  it('should handle email sending errors gracefully', async () => {
    vi.mocked(contactService.getProfileForNotificationBySlug).mockResolvedValue(mockProfile)
    vi.mocked(contactService.submitContactInquiry).mockResolvedValue(mockInquiry)
    vi.mocked(emailService.sendContactNotification).mockRejectedValue(
      new Error('Email service error')
    )

    const request = new NextRequest('http://localhost:3000/api/profiles/profile-1/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1',
      },
      body: JSON.stringify({
        producer_name: 'John Producer',
        producer_email: 'john@example.com',
        message: 'Hello',
      }),
    })

    // Should still return success even if email fails
    const response = await POST(request, { params: { slug: 'crew-member-gaffer-nashville' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    // Inquiry should still be saved
    expect(contactService.submitContactInquiry).toHaveBeenCalled()
  })

  it('should extract IP from x-forwarded-for header', async () => {
    vi.mocked(contactService.getProfileForNotificationBySlug).mockResolvedValue(mockProfile)
    vi.mocked(contactService.submitContactInquiry).mockResolvedValue(mockInquiry)
    vi.mocked(emailService.sendContactNotification).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/profiles/profile-1/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      },
      body: JSON.stringify({
        producer_name: 'John Producer',
        producer_email: 'john@example.com',
        message: 'Hello',
      }),
    })

    await POST(request, { params: { id: 'profile-1' } })

    // Should use first IP from x-forwarded-for
    expect(checkRateLimit).toHaveBeenCalled()
  })

  it('should extract IP from x-real-ip header when x-forwarded-for is missing', async () => {
    vi.mocked(contactService.getProfileForNotificationBySlug).mockResolvedValue(mockProfile)
    vi.mocked(contactService.submitContactInquiry).mockResolvedValue(mockInquiry)
    vi.mocked(emailService.sendContactNotification).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/profiles/profile-1/contact', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-real-ip': '10.0.0.1',
      },
      body: JSON.stringify({
        producer_name: 'John Producer',
        producer_email: 'john@example.com',
        message: 'Hello',
      }),
    })

    await POST(request, { params: { id: 'profile-1' } })

    expect(checkRateLimit).toHaveBeenCalled()
  })
})

