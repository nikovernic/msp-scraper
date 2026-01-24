import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/admin/profiles/[id]/send-claim-invitation/route'
import { NextRequest, NextResponse } from 'next/server'
import type { Profile } from '@crew-up/shared'

// Mock dependencies
vi.mock('@/lib/middleware/auth', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/services/profileService', () => ({
  profileService: {
    getProfileById: vi.fn(),
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

import { requireAdmin } from '@/lib/middleware/auth'
import { profileService } from '@/lib/services/profileService'
import { claimService } from '@/lib/services/claimService'
import { emailService } from '@/lib/services/emailService'

describe('POST /api/admin/profiles/[id]/send-claim-invitation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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

  it('should send claim invitation successfully', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' },
    } as any)

    // Mock profile retrieval
    vi.mocked(profileService.getProfileById).mockResolvedValue(mockProfile)

    // Mock claim token generation
    vi.mocked(claimService.saveClaimToken).mockResolvedValue('test-token-123')

    // Mock email sending
    vi.mocked(emailService.sendClaimInvitation).mockResolvedValue(undefined)

    // Create request
    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/send-claim-invitation',
      {
        method: 'POST',
      }
    )

    // Call handler
    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    // Assertions
    expect(response.status).toBe(200)
    expect(data.message).toBe('Claim invitation sent successfully')
    expect(data.profileId).toBe('profile-1')
    expect(requireAdmin).toHaveBeenCalled()
    expect(profileService.getProfileById).toHaveBeenCalledWith('profile-1')
    expect(claimService.saveClaimToken).toHaveBeenCalledWith('profile-1')
    expect(emailService.sendClaimInvitation).toHaveBeenCalledWith(
      mockProfile,
      'test-token-123'
    )
  })

  it('should return 401 when not authenticated', async () => {
    // Mock unauthorized
    const unauthorizedResponse = NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
    vi.mocked(requireAdmin).mockResolvedValue(unauthorizedResponse as any)

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/send-claim-invitation',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, { params: { id: 'profile-1' } })

    expect(response.status).toBe(401)
    expect(profileService.getProfileById).not.toHaveBeenCalled()
  })

  it('should return 403 when not admin', async () => {
    // Mock forbidden (not admin)
    const forbiddenResponse = NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
    vi.mocked(requireAdmin).mockResolvedValue(forbiddenResponse as any)

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/send-claim-invitation',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, { params: { id: 'profile-1' } })

    expect(response.status).toBe(403)
    expect(profileService.getProfileById).not.toHaveBeenCalled()
  })

  it('should return 404 when profile not found', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' },
    } as any)

    // Mock profile not found
    vi.mocked(profileService.getProfileById).mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/send-claim-invitation',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe('NOT_FOUND')
    expect(data.error.message).toBe('Profile not found')
    expect(claimService.saveClaimToken).not.toHaveBeenCalled()
  })

  it('should return 400 when profile is already claimed', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' },
    } as any)

    // Mock claimed profile
    const claimedProfile: Profile = {
      ...mockProfile,
      is_claimed: true,
    }
    vi.mocked(profileService.getProfileById).mockResolvedValue(claimedProfile)

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/send-claim-invitation',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('BAD_REQUEST')
    expect(data.error.message).toBe('Profile is already claimed')
    expect(claimService.saveClaimToken).not.toHaveBeenCalled()
  })

  it('should return 400 for invalid profile ID', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' },
    } as any)

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles//send-claim-invitation',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, { params: { id: '' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(profileService.getProfileById).not.toHaveBeenCalled()
  })

  it('should still return success if email sending fails', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' },
    } as any)

    // Mock profile retrieval
    vi.mocked(profileService.getProfileById).mockResolvedValue(mockProfile)

    // Mock claim token generation
    vi.mocked(claimService.saveClaimToken).mockResolvedValue('test-token-123')

    // Mock email sending failure
    vi.mocked(emailService.sendClaimInvitation).mockRejectedValue(
      new Error('Email service error')
    )

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/send-claim-invitation',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    // Should still return success (token was saved)
    expect(response.status).toBe(200)
    expect(data.message).toBe('Claim invitation sent successfully')
    expect(claimService.saveClaimToken).toHaveBeenCalled()
  })

  it('should handle database errors gracefully', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: 'admin-1', role: 'admin' },
    } as any)

    // Mock database error
    vi.mocked(profileService.getProfileById).mockRejectedValue(
      new Error('Database connection error')
    )

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/send-claim-invitation',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
  })
})

