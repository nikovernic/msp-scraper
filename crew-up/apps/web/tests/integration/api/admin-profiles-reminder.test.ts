import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/admin/profiles/[id]/send-claim-reminder/route'
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

vi.mock('@/lib/services/reminderProcessor', () => ({
  reminderProcessor: {
    sendReminderForProfile: vi.fn(),
  },
}))

import { requireAdmin } from '@/lib/middleware/auth'
import { profileService } from '@/lib/services/profileService'
import { reminderProcessor } from '@/lib/services/reminderProcessor'

describe('POST /api/admin/profiles/[id]/send-claim-reminder', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send reminder for valid profile', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: 'admin-1' },
      supabase: {} as any,
    })

    const now = new Date()
    const expirationDate = new Date(now)
    expirationDate.setDate(expirationDate.getDate() + 23)

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
      claim_token: 'token-123',
      claim_token_expires_at: expirationDate.toISOString(),
      reminder_sent_at_7days: null,
      reminder_sent_at_14days: null,
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

    vi.mocked(profileService.getProfileById).mockResolvedValue(mockProfile)
    vi.mocked(reminderProcessor.sendReminderForProfile).mockResolvedValue({
      reminderType: '7day',
    })

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/send-claim-reminder',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Claim reminder sent successfully')
    expect(data.profileId).toBe('profile-1')
    expect(data.reminderType).toBe('7day')
    expect(requireAdmin).toHaveBeenCalled()
    expect(profileService.getProfileById).toHaveBeenCalledWith('profile-1')
    expect(reminderProcessor.sendReminderForProfile).toHaveBeenCalledWith(mockProfile)
  })

  it('should return 404 if profile not found', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: 'admin-1' },
      supabase: {} as any,
    })

    vi.mocked(profileService.getProfileById).mockResolvedValue(null)

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/send-claim-reminder',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe('NOT_FOUND')
  })

  it('should return 400 if profile already claimed', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: 'admin-1' },
      supabase: {} as any,
    })

    const mockProfile: Profile = {
      id: 'profile-1',
      user_id: 'user-1',
      name: 'John Doe',
      primary_role: 'Gaffer',
      primary_location_city: 'Nashville',
      primary_location_state: 'TN',
      contact_email: 'john@example.com',
      slug: 'john-doe-gaffer-nashville',
      is_claimed: true, // Already claimed
      claim_token: 'token-123',
      claim_token_expires_at: new Date().toISOString(),
      reminder_sent_at_7days: null,
      reminder_sent_at_14days: null,
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

    vi.mocked(profileService.getProfileById).mockResolvedValue(mockProfile)

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/send-claim-reminder',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('BAD_REQUEST')
    expect(data.error.message).toContain('already claimed')
  })

  it('should return 400 if profile has no claim token', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: 'admin-1' },
      supabase: {} as any,
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
      claim_token: null, // No token
      claim_token_expires_at: null,
      reminder_sent_at_7days: null,
      reminder_sent_at_14days: null,
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

    vi.mocked(profileService.getProfileById).mockResolvedValue(mockProfile)

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/send-claim-reminder',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('BAD_REQUEST')
    expect(data.error.message).toContain('claim token')
  })

  it('should return 400 if reminder already sent', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: 'admin-1' },
      supabase: {} as any,
    })

    const now = new Date()
    const expirationDate = new Date(now)
    expirationDate.setDate(expirationDate.getDate() + 23)

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
      claim_token: 'token-123',
      claim_token_expires_at: expirationDate.toISOString(),
      reminder_sent_at_7days: new Date().toISOString(), // Already sent
      reminder_sent_at_14days: null,
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

    vi.mocked(profileService.getProfileById).mockResolvedValue(mockProfile)
    vi.mocked(reminderProcessor.sendReminderForProfile).mockRejectedValue(
      new Error('7-day reminder already sent for this profile')
    )

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/send-claim-reminder',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('BAD_REQUEST')
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(requireAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/send-claim-reminder',
      {
        method: 'POST',
      }
    )

    const response = await POST(request, { params: { id: 'profile-1' } })

    expect(response.status).toBe(401)
  })
})

