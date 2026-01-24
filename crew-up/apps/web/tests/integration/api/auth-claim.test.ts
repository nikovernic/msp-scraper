import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/auth/claim/route'
import { NextRequest } from 'next/server'
import type { Profile } from '@crew-up/shared'

// Mock dependencies
vi.mock('@/lib/services/claimService', () => ({
  claimService: {
    validateClaimToken: vi.fn(),
    claimProfile: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { claimService } from '@/lib/services/claimService'
import { createClient } from '@/lib/supabase/server'

describe('POST /api/auth/claim', () => {
  const mockSupabase = {
    auth: {
      signUp: vi.fn(),
    },
    from: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createClient).mockReturnValue(mockSupabase as any)
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
    claim_token: 'valid-token-123',
    claim_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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

  it('should claim profile successfully', async () => {
    // Mock token validation
    vi.mocked(claimService.validateClaimToken).mockResolvedValue(mockProfile)

    // Mock Supabase Auth signUp
    mockSupabase.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'john@example.com',
        },
      },
      error: null,
    })

    // Mock user record creation
    mockSupabase.from.mockReturnValue({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    } as any)

    // Mock profile claiming
    vi.mocked(claimService.claimProfile).mockResolvedValue({
      ...mockProfile,
      user_id: 'user-123',
      is_claimed: true,
    })

    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token-123',
        email: 'john@example.com',
        password: 'SecurePass123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Profile claimed successfully')
    expect(data.profileId).toBe('profile-1')
    expect(data.userId).toBe('user-123')
    expect(claimService.validateClaimToken).toHaveBeenCalledWith('valid-token-123')
    expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'john@example.com',
      password: 'SecurePass123',
      options: {
        emailRedirectTo: undefined,
        data: {
          role: 'crew',
        },
      },
    })
    expect(claimService.claimProfile).toHaveBeenCalledWith('profile-1', 'user-123')
  })

  it('should return 404 for invalid token', async () => {
    vi.mocked(claimService.validateClaimToken).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({
        token: 'invalid-token',
        email: 'john@example.com',
        password: 'SecurePass123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe('INVALID_TOKEN')
    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('should return 400 for expired token', async () => {
    const expiredProfile = {
      ...mockProfile,
      claim_token_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    }
    vi.mocked(claimService.validateClaimToken).mockResolvedValue(expiredProfile)

    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({
        token: 'expired-token',
        email: 'john@example.com',
        password: 'SecurePass123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('EXPIRED_TOKEN')
    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('should return 400 for already claimed profile', async () => {
    const claimedProfile = {
      ...mockProfile,
      is_claimed: true,
      user_id: 'user-456',
    }
    vi.mocked(claimService.validateClaimToken).mockResolvedValue(claimedProfile)

    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({
        token: 'used-token',
        email: 'john@example.com',
        password: 'SecurePass123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('ALREADY_CLAIMED')
    expect(mockSupabase.auth.signUp).not.toHaveBeenCalled()
  })

  it('should return 400 for email already exists', async () => {
    vi.mocked(claimService.validateClaimToken).mockResolvedValue(mockProfile)

    mockSupabase.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    })

    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token-123',
        email: 'existing@example.com',
        password: 'SecurePass123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('EMAIL_EXISTS')
    expect(claimService.claimProfile).not.toHaveBeenCalled()
  })

  it('should return 400 for invalid email format', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token-123',
        email: 'invalid-email',
        password: 'SecurePass123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(claimService.validateClaimToken).not.toHaveBeenCalled()
  })

  it('should return 400 for weak password', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token-123',
        email: 'john@example.com',
        password: 'weak',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(claimService.validateClaimToken).not.toHaveBeenCalled()
  })

  it('should return 400 for password without complexity requirements', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token-123',
        email: 'john@example.com',
        password: 'alllowercase123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should handle database errors gracefully', async () => {
    vi.mocked(claimService.validateClaimToken).mockResolvedValue(mockProfile)

    mockSupabase.auth.signUp.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'john@example.com',
        },
      },
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      insert: vi.fn(() =>
        Promise.resolve({
          error: { message: 'Database error' },
        })
      ),
    } as any)

    const request = new NextRequest('http://localhost:3000/api/auth/claim', {
      method: 'POST',
      body: JSON.stringify({
        token: 'valid-token-123',
        email: 'john@example.com',
        password: 'SecurePass123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
  })
})

