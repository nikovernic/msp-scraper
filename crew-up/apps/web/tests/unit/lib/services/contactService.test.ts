import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ContactService } from '@/lib/services/contactService'
import type { ContactInquiry, Profile } from '@crew-up/shared'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('ContactService', () => {
  let contactService: ContactService

  beforeEach(() => {
    contactService = new ContactService()
    vi.clearAllMocks()
  })

  describe('submitContactInquiry', () => {
    it('should submit contact inquiry successfully', async () => {
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

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: mockInquiry, error: null })
          ),
        })),
      }))

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      const result = await contactService.submitContactInquiry({
        profile_id: 'profile-1',
        producer_name: 'John Producer',
        producer_email: 'john@example.com',
        producer_phone: '555-1234',
        message: 'Interested in working together',
        shoot_dates: 'March 15-20, 2024',
      })

      expect(result).toEqual(mockInquiry)
      expect(mockSupabase.from).toHaveBeenCalledWith('contact_inquiries')
      expect(mockInsert).toHaveBeenCalledWith({
        profile_id: 'profile-1',
        producer_name: 'John Producer',
        producer_email: 'john@example.com',
        producer_phone: '555-1234',
        message: 'Interested in working together',
        shoot_dates: 'March 15-20, 2024',
      })
    })

    it('should handle optional fields as null', async () => {
      const mockInquiry: ContactInquiry = {
        id: 'inquiry-2',
        profile_id: 'profile-1',
        producer_name: 'Jane Producer',
        producer_email: 'jane@example.com',
        producer_phone: null,
        message: 'Hello',
        shoot_dates: null,
        created_at: new Date().toISOString(),
      }

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: mockInquiry, error: null })
          ),
        })),
      }))

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      const result = await contactService.submitContactInquiry({
        profile_id: 'profile-1',
        producer_name: 'Jane Producer',
        producer_email: 'jane@example.com',
        message: 'Hello',
      })

      expect(result).toEqual(mockInquiry)
      expect(mockInsert).toHaveBeenCalledWith({
        profile_id: 'profile-1',
        producer_name: 'Jane Producer',
        producer_email: 'jane@example.com',
        producer_phone: null,
        message: 'Hello',
        shoot_dates: null,
      })
    })

    it('should throw error on database error', async () => {
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: null,
              error: { message: 'Database error' },
            })
          ),
        })),
      }))

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      await expect(
        contactService.submitContactInquiry({
          profile_id: 'profile-1',
          producer_name: 'John Producer',
          producer_email: 'john@example.com',
          message: 'Hello',
        })
      ).rejects.toThrow('Failed to submit contact inquiry: Database error')
    })
  })

  describe('getProfileForNotification', () => {
    it('should fetch profile successfully', async () => {
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

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: mockProfile, error: null })
          ),
        })),
      }))

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      const result = await contactService.getProfileForNotification('profile-1')

      expect(result).toEqual(mockProfile)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockSelect).toHaveBeenCalledWith('id, name, contact_email, slug')
    })

    it('should return null if profile not found', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: null,
              error: { code: 'PGRST116', message: 'Not found' },
            })
          ),
        })),
      }))

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      const result = await contactService.getProfileForNotification('profile-999')

      expect(result).toBeNull()
    })

    it('should throw error on database error', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: null,
              error: { code: 'OTHER_ERROR', message: 'Database error' },
            })
          ),
        })),
      }))

      mockSupabase.from.mockReturnValue({
        select: mockSelect,
      })

      await expect(
        contactService.getProfileForNotification('profile-1')
      ).rejects.toThrow('Failed to fetch profile: Database error')
    })
  })
})

