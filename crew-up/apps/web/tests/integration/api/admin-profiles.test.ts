import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/admin/profiles/route'
import { NextRequest, NextResponse } from 'next/server'
import type { Profile } from '@crew-up/shared'

// Mock dependencies
vi.mock('@/lib/middleware/auth', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/services/profileService', () => ({
  profileService: {
    createProfile: vi.fn(),
  },
}))

vi.mock('@/lib/services/claimService', () => ({
  claimService: {
    saveClaimToken: vi.fn(),
  },
}))

vi.mock('@/lib/services/emailService', () => ({
  emailService: {
    sendClaimInvitation: vi.fn(),
  },
}))

// Import actual error handler to test real behavior
import { handleError } from '@/lib/utils/errorHandler'

import { requireAdmin } from '@/lib/middleware/auth'
import { profileService } from '@/lib/services/profileService'
import { claimService } from '@/lib/services/claimService'
import { emailService } from '@/lib/services/emailService'
import { ZodError } from 'zod'

describe('POST /api/admin/profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a profile with valid data', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } } as any)

    // Mock profile creation
    const mockProfile: Profile = {
      id: 'profile-1',
      user_id: null,
      name: 'John Doe',
      primary_role: 'Gaffer',
      primary_location_city: 'Nashville',
      primary_location_state: 'TN',
      contact_email: 'john@example.com',
      slug: 'john-doe-gaffer-nashville',
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

    vi.mocked(profileService.createProfile).mockResolvedValue(mockProfile)

    // Mock claim token generation
    vi.mocked(claimService.saveClaimToken).mockResolvedValue('test-token-123')

    // Mock email sending
    vi.mocked(emailService.sendClaimInvitation).mockResolvedValue(undefined)

    // Create request
    const request = new NextRequest('http://localhost:3000/api/admin/profiles', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        primary_role: 'Gaffer',
        primary_location_city: 'Nashville',
        primary_location_state: 'TN',
        contact_email: 'john@example.com',
      }),
    })

    // Call handler
    const response = await POST(request)
    const data = await response.json()

    // Assertions
    expect(response.status).toBe(201)
    expect(data.id).toBe('profile-1')
    expect(data.name).toBe('John Doe')
    expect(data.slug).toBe('john-doe-gaffer-nashville')
    expect(requireAdmin).toHaveBeenCalled()
    expect(profileService.createProfile).toHaveBeenCalled()
    expect(claimService.saveClaimToken).toHaveBeenCalledWith('profile-1')
    expect(emailService.sendClaimInvitation).toHaveBeenCalledWith(
      mockProfile,
      'test-token-123'
    )
  })

  it('should return 401 when not authenticated', async () => {
    // Mock unauthorized - requireAdmin returns NextResponse for unauthorized
    const unauthorizedResponse = NextResponse.json(
      {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
          requestId: 'test-request-id',
        },
      },
      { status: 401 }
    )
    vi.mocked(requireAdmin).mockResolvedValue(unauthorizedResponse as any)

    const request = new NextRequest('http://localhost:3000/api/admin/profiles', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        primary_role: 'Gaffer',
        primary_location_city: 'Nashville',
        primary_location_state: 'TN',
        contact_email: 'john@example.com',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(profileService.createProfile).not.toHaveBeenCalled()
  })

  it('should return 400 for invalid data', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } } as any)

    const request = new NextRequest('http://localhost:3000/api/admin/profiles', {
      method: 'POST',
      body: JSON.stringify({
        // Missing required fields
        name: 'John Doe',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(profileService.createProfile).not.toHaveBeenCalled()
  })

  it('should return 400 for invalid email format', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } } as any)

    const request = new NextRequest('http://localhost:3000/api/admin/profiles', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        primary_role: 'Gaffer',
        primary_location_city: 'Nashville',
        primary_location_state: 'TN',
        contact_email: 'invalid-email', // Invalid email
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(profileService.createProfile).not.toHaveBeenCalled()
  })

  it('should still create profile if email sending fails', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } } as any)

    // Mock profile creation
    const mockProfile: Profile = {
      id: 'profile-1',
      user_id: null,
      name: 'John Doe',
      primary_role: 'Gaffer',
      primary_location_city: 'Nashville',
      primary_location_state: 'TN',
      contact_email: 'john@example.com',
      slug: 'john-doe-gaffer-nashville',
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

    vi.mocked(profileService.createProfile).mockResolvedValue(mockProfile)

    // Mock claim token generation (success)
    vi.mocked(claimService.saveClaimToken).mockResolvedValue('test-token-123')

    // Mock email sending failure
    vi.mocked(emailService.sendClaimInvitation).mockRejectedValue(
      new Error('Email service error')
    )

    const request = new NextRequest('http://localhost:3000/api/admin/profiles', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        primary_role: 'Gaffer',
        primary_location_city: 'Nashville',
        primary_location_state: 'TN',
        contact_email: 'john@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    // Profile should still be created successfully
    expect(response.status).toBe(201)
    expect(data.id).toBe('profile-1')
    expect(profileService.createProfile).toHaveBeenCalled()
    expect(claimService.saveClaimToken).toHaveBeenCalled()
  })

  it('should still create profile if token generation fails', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } } as any)

    // Mock profile creation
    const mockProfile: Profile = {
      id: 'profile-1',
      user_id: null,
      name: 'John Doe',
      primary_role: 'Gaffer',
      primary_location_city: 'Nashville',
      primary_location_state: 'TN',
      contact_email: 'john@example.com',
      slug: 'john-doe-gaffer-nashville',
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

    vi.mocked(profileService.createProfile).mockResolvedValue(mockProfile)

    // Mock claim token generation failure
    vi.mocked(claimService.saveClaimToken).mockRejectedValue(
      new Error('Database error')
    )

    const request = new NextRequest('http://localhost:3000/api/admin/profiles', {
      method: 'POST',
      body: JSON.stringify({
        name: 'John Doe',
        primary_role: 'Gaffer',
        primary_location_city: 'Nashville',
        primary_location_state: 'TN',
        contact_email: 'john@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    // Profile should still be created successfully
    expect(response.status).toBe(201)
    expect(data.id).toBe('profile-1')
    expect(profileService.createProfile).toHaveBeenCalled()
    expect(claimService.saveClaimToken).toHaveBeenCalled()
    expect(emailService.sendClaimInvitation).not.toHaveBeenCalled()
  })
})

