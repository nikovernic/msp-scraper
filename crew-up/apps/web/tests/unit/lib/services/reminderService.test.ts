import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReminderService } from '@/lib/services/reminderService'
import type { Profile } from '@crew-up/shared'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('ReminderService', () => {
  let reminderService: ReminderService

  beforeEach(() => {
    reminderService = new ReminderService()
    vi.clearAllMocks()
  })

  describe('calculateDaysSinceTokenCreation', () => {
    it('should calculate days since token creation correctly', () => {
      const now = new Date()
      const expirationDate = new Date(now)
      expirationDate.setDate(expirationDate.getDate() + 23) // 23 days from now = created 7 days ago

      const days = reminderService.calculateDaysSinceTokenCreation(
        expirationDate.toISOString()
      )
      expect(days).toBeCloseTo(7, 0)
    })

    it('should return null for expired tokens', () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1) // 1 day ago (expired)

      const days = reminderService.calculateDaysSinceTokenCreation(
        pastDate.toISOString()
      )
      expect(days).toBeNull()
    })

    it('should return null for null expiration', () => {
      const days = reminderService.calculateDaysSinceTokenCreation(null)
      expect(days).toBeNull()
    })
  })

  describe('getProfilesNeeding7DayReminder', () => {
    it('should find profiles needing 7-day reminder', async () => {
      const now = new Date()
      const expirationDate = new Date(now)
      expirationDate.setDate(expirationDate.getDate() + 23) // Created 7 days ago

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

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.select.mockReturnValue(mockQuery)
      mockQuery.eq.mockReturnValue(mockQuery)
      mockQuery.not.mockReturnValue(mockQuery)
      mockQuery.gt.mockReturnValue(mockQuery)
      mockQuery.is.mockResolvedValue({ data: [mockProfile], error: null })

      const result = await reminderService.getProfilesNeeding7DayReminder()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('profile-1')
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
    })

    it('should filter out profiles that already received 7-day reminder', async () => {
      // The query filters out profiles with reminder_sent_at_7days set, so they won't be returned
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.select.mockReturnValue(mockQuery)
      mockQuery.eq.mockReturnValue(mockQuery)
      mockQuery.not.mockReturnValue(mockQuery)
      mockQuery.gt.mockReturnValue(mockQuery)
      mockQuery.is.mockResolvedValue({ data: [], error: null }) // Query filters them out

      const result = await reminderService.getProfilesNeeding7DayReminder()

      // Should be filtered out because reminder already sent (query filters them)
      expect(result).toHaveLength(0)
    })

    it('should filter out expired tokens', async () => {
      // The query filters out expired tokens with .gt('claim_token_expires_at', now), so they won't be returned
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        is: vi.fn().mockResolvedValue({ data: [], error: null }), // Query filters out expired
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.select.mockReturnValue(mockQuery)
      mockQuery.eq.mockReturnValue(mockQuery)
      mockQuery.not.mockReturnValue(mockQuery)
      mockQuery.gt.mockReturnValue(mockQuery)

      const result = await reminderService.getProfilesNeeding7DayReminder()

      expect(result).toHaveLength(0)
    })
  })

  describe('getProfilesNeeding14DayReminder', () => {
    it('should find profiles needing 14-day reminder', async () => {
      const now = new Date()
      const expirationDate = new Date(now)
      expirationDate.setDate(expirationDate.getDate() + 16) // Created 14 days ago

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
        reminder_sent_at_7days: new Date().toISOString(),
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

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.select.mockReturnValue(mockQuery)
      mockQuery.eq.mockReturnValue(mockQuery)
      mockQuery.not.mockReturnValue(mockQuery)
      mockQuery.gt.mockReturnValue(mockQuery)
      mockQuery.is.mockResolvedValue({ data: [mockProfile], error: null })

      const result = await reminderService.getProfilesNeeding14DayReminder()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('profile-1')
    })
  })

  describe('recordReminderSent', () => {
    it('should record 7-day reminder sent', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      await reminderService.recordReminderSent('profile-1', '7day')

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          reminder_sent_at_7days: expect.any(String),
        })
      )
    })

    it('should record 14-day reminder sent', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      await reminderService.recordReminderSent('profile-1', '14day')

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          reminder_sent_at_14days: expect.any(String),
        })
      )
    })
  })
})

