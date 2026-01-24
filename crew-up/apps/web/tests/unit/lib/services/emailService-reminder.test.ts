import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EmailService } from '@/lib/services/emailService'
import type { Profile } from '@crew-up/shared'

// Mock Resend
const mockResend = {
  emails: {
    send: vi.fn(),
  },
}

vi.mock('resend', () => ({
  Resend: vi.fn(() => mockResend),
}))

// Mock React Email render
vi.mock('@react-email/render', () => ({
  render: vi.fn(() => Promise.resolve('<html>Email HTML</html>')),
}))

// Mock config
vi.mock('@/lib/config', () => ({
  config: {
    resendApiKey: 'test-api-key',
  },
}))

// Mock URL utility
vi.mock('@/lib/utils/url', () => ({
  getAbsoluteUrl: vi.fn((path: string) => `https://crewup.com${path}`),
}))

describe('EmailService - Reminder Emails', () => {
  let emailService: EmailService

  beforeEach(() => {
    emailService = new EmailService()
    vi.clearAllMocks()
  })

  describe('sendClaimReminder', () => {
    it('should send 7-day reminder email', async () => {
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

      mockResend.emails.send.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      })

      await emailService.sendClaimReminder(mockProfile, 'token-123', '7day')

      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: 'Crew Up <noreply@crewup.com>',
        to: 'john@example.com',
        subject: 'Reminder: Claim Your Crew Up Profile',
        html: '<html>Email HTML</html>',
      })
    })

    it('should send 14-day reminder email', async () => {
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

      mockResend.emails.send.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      })

      await emailService.sendClaimReminder(mockProfile, 'token-123', '14day')

      expect(mockResend.emails.send).toHaveBeenCalled()
    })

    it('should handle email send errors', async () => {
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

      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'Email send failed' },
      })

      await expect(
        emailService.sendClaimReminder(mockProfile, 'token-123', '7day')
      ).rejects.toThrow('Email service error')
    })
  })
})

