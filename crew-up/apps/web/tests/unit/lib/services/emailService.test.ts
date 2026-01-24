import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EmailService } from '@/lib/services/emailService'
import type { Profile } from '@crew-up/shared'

// Use vi.hoisted() to define mocks that can be used in mock factories
const { mockResendSend, mockRender, mockConfig } = vi.hoisted(() => {
  return {
    mockResendSend: vi.fn(),
    mockRender: vi.fn(() => Promise.resolve('<html>Email HTML</html>')),
    mockConfig: {
      resendApiKey: 'test-api-key',
    },
  }
})

// Mock Resend
vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: {
      send: mockResendSend,
    },
  })),
}))

// Mock React Email render
vi.mock('@react-email/render', () => ({
  render: mockRender,
}))

// Mock email templates
vi.mock('@/emails/contact-notification', () => ({
  ContactNotificationEmail: vi.fn((props) => ({
    type: 'div',
    props: props,
    key: null,
    ref: null,
  })),
}))

vi.mock('@/emails/claim-invitation', () => ({
  ClaimInvitationEmail: vi.fn((props) => ({
    type: 'div',
    props: props,
    key: null,
    ref: null,
  })),
}))

// Mock URL utility
vi.mock('@/lib/utils/url', () => ({
  getAbsoluteUrl: vi.fn((path: string) => `https://crewup.com${path}`),
}))

// Mock config
vi.mock('@/lib/config', () => ({
  config: mockConfig,
}))

describe('EmailService', () => {
  let emailService: EmailService

  beforeEach(() => {
    emailService = new EmailService()
    vi.clearAllMocks()
    // Reset mockRender to default success behavior
    mockRender.mockResolvedValue('<html>Email HTML</html>')
    // Reset mock config
    mockConfig.resendApiKey = 'test-api-key'
  })

  describe('sendContactNotification', () => {
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

    it('should send contact notification email successfully', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      })

      await emailService.sendContactNotification({
        profile: mockProfile,
        producerName: 'John Producer',
        producerEmail: 'john@example.com',
        producerPhone: '555-1234',
        message: 'Interested in working together',
        shootDates: 'March 15-20, 2024',
      })

      expect(mockRender).toHaveBeenCalled()
      expect(mockResendSend).toHaveBeenCalledWith({
        from: 'Crew Up <noreply@crewup.com>',
        to: 'crew@example.com',
        subject: 'New Contact Inquiry from John Producer',
        html: '<html>Email HTML</html>',
      })
    })

    it('should handle optional fields', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      })

      await emailService.sendContactNotification({
        profile: mockProfile,
        producerName: 'Jane Producer',
        producerEmail: 'jane@example.com',
        message: 'Hello',
      })

      expect(mockResendSend).toHaveBeenCalled()
    })

    it('should throw error if RESEND_API_KEY is not set', async () => {
      mockConfig.resendApiKey = undefined
      const newService = new EmailService()

      await expect(
        newService.sendContactNotification({
          profile: mockProfile,
          producerName: 'John Producer',
          producerEmail: 'john@example.com',
          message: 'Hello',
        })
      ).rejects.toThrow('RESEND_API_KEY environment variable is not set')
    })

    it('should throw error if Resend API returns error', async () => {
      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key' },
      })

      await expect(
        emailService.sendContactNotification({
          profile: mockProfile,
          producerName: 'John Producer',
          producerEmail: 'john@example.com',
          message: 'Hello',
        })
      ).rejects.toThrow('Email service error: Failed to send email: Invalid API key')
    })

    it('should handle render errors', async () => {
      mockRender.mockRejectedValue(new Error('Render failed'))

      await expect(
        emailService.sendContactNotification({
          profile: mockProfile,
          producerName: 'John Producer',
          producerEmail: 'john@example.com',
          message: 'Hello',
        })
      ).rejects.toThrow('Email service error: Render failed')
    })
  })

  describe('sendClaimInvitation', () => {
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

    it('should send claim invitation email successfully', async () => {
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      })

      const claimToken = 'test-claim-token-123'

      await emailService.sendClaimInvitation(mockProfile, claimToken)

      expect(mockRender).toHaveBeenCalled()
      expect(mockResendSend).toHaveBeenCalledWith({
        from: 'Crew Up <noreply@crewup.com>',
        to: 'crew@example.com',
        subject: 'Claim Your Crew Up Profile',
        html: '<html>Email HTML</html>',
      })
    })

    it('should construct claim URL correctly', async () => {
      const { getAbsoluteUrl } = await import('@/lib/utils/url')
      mockResendSend.mockResolvedValue({
        data: { id: 'email-123' },
        error: null,
      })

      const claimToken = 'test-claim-token-456'

      await emailService.sendClaimInvitation(mockProfile, claimToken)

      expect(getAbsoluteUrl).toHaveBeenCalledWith(`/claim/${claimToken}`)
    })

    it('should throw error if RESEND_API_KEY is not set', async () => {
      mockConfig.resendApiKey = undefined
      const newService = new EmailService()

      await expect(
        newService.sendClaimInvitation(mockProfile, 'token-123')
      ).rejects.toThrow('RESEND_API_KEY environment variable is not set')
    })

    it('should throw error if Resend API returns error', async () => {
      // Ensure render succeeds for this test
      mockRender.mockResolvedValue('<html>Email HTML</html>')
      mockResendSend.mockResolvedValue({
        data: null,
        error: { message: 'Invalid API key' },
      })

      await expect(
        emailService.sendClaimInvitation(mockProfile, 'token-123')
      ).rejects.toThrow('Email service error: Failed to send email: Invalid API key')
    })

    it('should handle render errors', async () => {
      mockRender.mockRejectedValue(new Error('Render failed'))

      await expect(
        emailService.sendClaimInvitation(mockProfile, 'token-123')
      ).rejects.toThrow('Email service error: Render failed')
    })
  })
})
