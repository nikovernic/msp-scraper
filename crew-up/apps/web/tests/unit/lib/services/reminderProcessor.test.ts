import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReminderProcessor } from '@/lib/services/reminderProcessor'
import type { Profile } from '@crew-up/shared'

// Mock dependencies
vi.mock('@/lib/services/reminderService', () => ({
  reminderService: {
    getProfilesNeedingReminder: vi.fn(),
    recordReminderSent: vi.fn(),
    calculateDaysSinceTokenCreation: vi.fn(),
  },
}))

vi.mock('@/lib/services/emailService', () => ({
  emailService: {
    sendClaimReminder: vi.fn(),
  },
}))

import { reminderService } from '@/lib/services/reminderService'
import { emailService } from '@/lib/services/emailService'

describe('ReminderProcessor', () => {
  let reminderProcessor: ReminderProcessor

  beforeEach(() => {
    reminderProcessor = new ReminderProcessor()
    vi.clearAllMocks()
  })

  describe('processReminders', () => {
    it('should process reminders for eligible profiles', async () => {
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

      vi.mocked(reminderService.getProfilesNeedingReminder).mockResolvedValue([
        { profile: mockProfile, reminderType: '7day' },
      ])
      vi.mocked(emailService.sendClaimReminder).mockResolvedValue(undefined)
      vi.mocked(reminderService.recordReminderSent).mockResolvedValue(undefined)

      const result = await reminderProcessor.processReminders()

      expect(result.totalProcessed).toBe(1)
      expect(result.successful).toBe(1)
      expect(result.failed).toBe(0)
      expect(emailService.sendClaimReminder).toHaveBeenCalledWith(
        mockProfile,
        'token-123',
        '7day'
      )
      expect(reminderService.recordReminderSent).toHaveBeenCalledWith(
        'profile-1',
        '7day'
      )
    })

    it('should handle errors gracefully and continue processing', async () => {
      const now = new Date()
      const expirationDate = new Date(now)
      expirationDate.setDate(expirationDate.getDate() + 23)

      const mockProfile1: Profile = {
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

      const mockProfile2: Profile = {
        id: 'profile-2',
        user_id: null,
        name: 'Jane Smith',
        primary_role: 'DP',
        primary_location_city: 'Los Angeles',
        primary_location_state: 'CA',
        contact_email: 'jane@example.com',
        slug: 'jane-smith-dp-los-angeles',
        is_claimed: false,
        claim_token: 'token-456',
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

      vi.mocked(reminderService.getProfilesNeedingReminder).mockResolvedValue([
        { profile: mockProfile1, reminderType: '7day' },
        { profile: mockProfile2, reminderType: '7day' },
      ])

      // First profile fails, second succeeds
      vi.mocked(emailService.sendClaimReminder)
        .mockRejectedValueOnce(new Error('Email send failed'))
        .mockResolvedValueOnce(undefined)

      vi.mocked(reminderService.recordReminderSent).mockResolvedValue(undefined)

      const result = await reminderProcessor.processReminders()

      expect(result.totalProcessed).toBe(2)
      expect(result.successful).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].profileId).toBe('profile-1')
    })
  })

  describe('sendReminderForProfile', () => {
    it('should send 7-day reminder for eligible profile', async () => {
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

      vi.mocked(reminderService.calculateDaysSinceTokenCreation).mockReturnValue(7)
      vi.mocked(emailService.sendClaimReminder).mockResolvedValue(undefined)
      vi.mocked(reminderService.recordReminderSent).mockResolvedValue(undefined)

      const result = await reminderProcessor.sendReminderForProfile(mockProfile)

      expect(result.reminderType).toBe('7day')
      expect(emailService.sendClaimReminder).toHaveBeenCalledWith(
        mockProfile,
        'token-123',
        '7day'
      )
    })

    it('should throw error for already claimed profile', async () => {
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

      await expect(
        reminderProcessor.sendReminderForProfile(mockProfile)
      ).rejects.toThrow('Profile is already claimed')
    })

    it('should throw error for expired token', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)

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
        claim_token_expires_at: pastDate.toISOString(),
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

      await expect(
        reminderProcessor.sendReminderForProfile(mockProfile)
      ).rejects.toThrow('Claim token has expired')
    })
  })
})

