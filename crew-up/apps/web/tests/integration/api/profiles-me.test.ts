import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '@/app/api/profiles/me/route'
import { NextRequest } from 'next/server'
import type { Profile } from '@crew-up/shared'

// Mock dependencies
vi.mock('@/lib/middleware/auth', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('@/lib/services/profileService', () => ({
  profileService: {
    updateProfileForUser: vi.fn(),
  },
}))

import { requireAuth } from '@/lib/middleware/auth'
import { profileService } from '@/lib/services/profileService'

describe('PUT /api/profiles/me', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update profile successfully', async () => {
    const mockUser = { id: 'user-1', email: 'user@example.com' }
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser, supabase: {} as any })

    const updatedProfile: Profile = {
      id: 'profile-1',
      user_id: 'user-1',
      name: 'John Doe',
      primary_role: 'Gaffer',
      primary_location_city: 'Nashville',
      primary_location_state: 'TN',
      contact_email: 'john@example.com',
      slug: 'john-doe-gaffer-nashville',
      is_claimed: true,
      claim_token: null,
      claim_token_expires_at: null,
      bio: 'Updated bio',
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

    vi.mocked(profileService.updateProfileForUser).mockResolvedValue(updatedProfile)

    const request = new NextRequest('http://localhost:3000/api/profiles/me', {
      method: 'PUT',
      body: JSON.stringify({
        bio: 'Updated bio',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.bio).toBe('Updated bio')
    expect(profileService.updateProfileForUser).toHaveBeenCalledWith('user-1', {
      bio: 'Updated bio',
    })
  })

  it('should return 401 if not authenticated', async () => {
    const { NextResponse } = await import('next/server')
    const errorResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    vi.mocked(requireAuth).mockResolvedValue(errorResponse)

    const request = new NextRequest('http://localhost:3000/api/profiles/me', {
      method: 'PUT',
      body: JSON.stringify({
        bio: 'Updated bio',
      }),
    })

    const response = await PUT(request)

    expect(response.status).toBe(401)
    expect(profileService.updateProfileForUser).not.toHaveBeenCalled()
  })

  it('should return 400 for invalid email format', async () => {
    const mockUser = { id: 'user-1', email: 'user@example.com' }
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser, supabase: {} as any })

    const request = new NextRequest('http://localhost:3000/api/profiles/me', {
      method: 'PUT',
      body: JSON.stringify({
        contact_email: 'invalid-email',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(profileService.updateProfileForUser).not.toHaveBeenCalled()
  })

  it('should return 400 for bio exceeding 250 characters', async () => {
    const mockUser = { id: 'user-1', email: 'user@example.com' }
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser, supabase: {} as any })

    const longBio = 'a'.repeat(251)

    const request = new NextRequest('http://localhost:3000/api/profiles/me', {
      method: 'PUT',
      body: JSON.stringify({
        bio: longBio,
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(profileService.updateProfileForUser).not.toHaveBeenCalled()
  })

  it('should return 400 for invalid URL format', async () => {
    const mockUser = { id: 'user-1', email: 'user@example.com' }
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser, supabase: {} as any })

    const request = new NextRequest('http://localhost:3000/api/profiles/me', {
      method: 'PUT',
      body: JSON.stringify({
        portfolio_url: 'not-a-valid-url',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(profileService.updateProfileForUser).not.toHaveBeenCalled()
  })

  it('should return 400 for invalid state code (not 2 characters)', async () => {
    const mockUser = { id: 'user-1', email: 'user@example.com' }
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser, supabase: {} as any })

    const request = new NextRequest('http://localhost:3000/api/profiles/me', {
      method: 'PUT',
      body: JSON.stringify({
        primary_location_state: 'TENNESSEE',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(profileService.updateProfileForUser).not.toHaveBeenCalled()
  })

  it('should handle all profile fields', async () => {
    const mockUser = { id: 'user-1', email: 'user@example.com' }
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser, supabase: {} as any })

    const updatedProfile: Profile = {
      id: 'profile-1',
      user_id: 'user-1',
      name: 'John Doe',
      primary_role: 'Gaffer',
      primary_location_city: 'Nashville',
      primary_location_state: 'TN',
      contact_email: 'john@example.com',
      slug: 'john-doe-gaffer-nashville',
      is_claimed: true,
      claim_token: null,
      claim_token_expires_at: null,
      bio: 'Updated bio',
      photo_url: 'https://example.com/photo.jpg',
      contact_phone: '555-1234',
      portfolio_url: 'https://example.com/portfolio',
      website: 'https://example.com',
      instagram_url: 'https://instagram.com/johndoe',
      vimeo_url: 'https://vimeo.com/johndoe',
      union_status: 'union',
      years_experience: 10,
      secondary_roles: ['Key Grip'],
      additional_markets: [{ city: 'Atlanta', state: 'GA' }],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    vi.mocked(profileService.updateProfileForUser).mockResolvedValue(updatedProfile)

    const request = new NextRequest('http://localhost:3000/api/profiles/me', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'John Doe',
        primary_role: 'Gaffer',
        primary_location_city: 'Nashville',
        primary_location_state: 'TN',
        contact_email: 'john@example.com',
        bio: 'Updated bio',
        photo_url: 'https://example.com/photo.jpg',
        contact_phone: '555-1234',
        portfolio_url: 'https://example.com/portfolio',
        website: 'https://example.com',
        instagram_url: 'https://instagram.com/johndoe',
        vimeo_url: 'https://vimeo.com/johndoe',
        union_status: 'union',
        years_experience: 10,
        secondary_roles: ['Key Grip'],
        additional_markets: [{ city: 'Atlanta', state: 'GA' }],
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.name).toBe('John Doe')
    expect(data.bio).toBe('Updated bio')
    expect(data.union_status).toBe('union')
    expect(data.years_experience).toBe(10)
    expect(data.secondary_roles).toEqual(['Key Grip'])
    expect(data.additional_markets).toEqual([{ city: 'Atlanta', state: 'GA' }])
  })

  it('should return 500 when service throws error', async () => {
    const mockUser = { id: 'user-1', email: 'user@example.com' }
    vi.mocked(requireAuth).mockResolvedValue({ user: mockUser, supabase: {} as any })

    vi.mocked(profileService.updateProfileForUser).mockRejectedValue(
      new Error('Database error')
    )

    const request = new NextRequest('http://localhost:3000/api/profiles/me', {
      method: 'PUT',
      body: JSON.stringify({
        bio: 'Updated bio',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
  })
})

