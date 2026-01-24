import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ProfileService } from '@/lib/services/profileService'
import type { Profile } from '@crew-up/shared'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('ProfileService', () => {
  let profileService: ProfileService

  beforeEach(() => {
    profileService = new ProfileService()
    vi.clearAllMocks()
  })

  it('should create profile service instance', () => {
    expect(profileService).toBeInstanceOf(ProfileService)
  })

  it('should have createProfile method', () => {
    expect(typeof profileService.createProfile).toBe('function')
  })

  it('should have getProfileBySlug method', () => {
    expect(typeof profileService.getProfileBySlug).toBe('function')
  })

  it('should have updateProfile method', () => {
    expect(typeof profileService.updateProfile).toBe('function')
  })

  it('should have deleteProfile method', () => {
    expect(typeof profileService.deleteProfile).toBe('function')
  })

  it('should have searchProfiles method', () => {
    expect(typeof profileService.searchProfiles).toBe('function')
  })

  it('should have getProfileByUserId method', () => {
    expect(typeof profileService.getProfileByUserId).toBe('function')
  })

  it('should have updateProfileForUser method', () => {
    expect(typeof profileService.updateProfileForUser).toBe('function')
  })

  describe('searchProfiles', () => {
    it('should search profiles with text query', async () => {
      const mockProfiles: Profile[] = [
        {
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
        },
      ]

      // Mock count RPC
      mockSupabase.rpc.mockImplementationOnce(() =>
        Promise.resolve({ data: 1, error: null })
      )

      // Mock search RPC
      mockSupabase.rpc.mockImplementationOnce(() =>
        Promise.resolve({ data: mockProfiles, error: null })
      )

      // Mock credits query
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve({ data: [], error: null })
              ),
            })),
          })),
        })),
      }))
      mockSupabase.from = mockFrom

      const result = await profileService.searchProfiles('gaffer')

      expect(result.total).toBe(1)
      expect(result.profiles).toHaveLength(1)
      expect(result.profiles[0].name).toBe('John Doe')
      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_profiles_count', {
        search_text: 'gaffer',
        filter_role: null,
        filter_city: null,
        filter_state: null,
        filter_years_min: null,
        filter_years_max: null,
      })
      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_profiles', {
        search_text: 'gaffer',
        filter_role: null,
        filter_city: null,
        filter_state: null,
        filter_years_min: null,
        filter_years_max: null,
        result_limit: 20,
        result_offset: 0,
      })
    })

    it('should apply filters correctly', async () => {
      mockSupabase.rpc.mockImplementationOnce(() =>
        Promise.resolve({ data: 5, error: null })
      )
      mockSupabase.rpc.mockImplementationOnce(() =>
        Promise.resolve({ data: [], error: null })
      )

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve({ data: [], error: null })
              ),
            })),
          })),
        })),
      }))
      mockSupabase.from = mockFrom

      await profileService.searchProfiles(
        'gaffer',
        {
          role: 'Gaffer',
          city: 'Nashville',
          state: 'TN',
          years_experience_min: 5,
          years_experience_max: 15,
        },
        2,
        10
      )

      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_profiles', {
        search_text: 'gaffer',
        filter_role: 'Gaffer',
        filter_city: 'Nashville',
        filter_state: 'TN',
        filter_years_min: 5,
        filter_years_max: 15,
        result_limit: 10,
        result_offset: 10, // (page 2 - 1) * 10
      })
    })

    it('should handle pagination correctly', async () => {
      mockSupabase.rpc.mockImplementationOnce(() =>
        Promise.resolve({ data: 50, error: null })
      )
      mockSupabase.rpc.mockImplementationOnce(() =>
        Promise.resolve({ data: [], error: null })
      )

      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve({ data: [], error: null })
              ),
            })),
          })),
        })),
      }))
      mockSupabase.from = mockFrom

      const result = await profileService.searchProfiles(undefined, undefined, 3, 20)

      expect(result.total).toBe(50)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_profiles', {
        search_text: null,
        filter_role: null,
        filter_city: null,
        filter_state: null,
        filter_years_min: null,
        filter_years_max: null,
        result_limit: 20,
        result_offset: 40, // (page 3 - 1) * 20
      })
    })

    it('should fetch top 3 credits for each profile', async () => {
      const mockProfiles: Profile[] = [
        {
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
        },
      ]

      const mockCredits = [
        {
          id: 'credit-1',
          profile_id: 'profile-1',
          project_title: 'Movie 1',
          role: 'Gaffer',
          project_type: 'feature_film' as const,
          year: 2023,
          production_company: null,
          director: null,
          display_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      mockSupabase.rpc.mockImplementationOnce(() =>
        Promise.resolve({ data: 1, error: null })
      )
      mockSupabase.rpc.mockImplementationOnce(() =>
        Promise.resolve({ data: mockProfiles, error: null })
      )

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() =>
              Promise.resolve({ data: mockCredits, error: null })
            ),
          })),
        })),
      }))

      const mockFrom = vi.fn(() => ({
        select: mockSelect,
      }))
      mockSupabase.from = mockFrom

      const result = await profileService.searchProfiles('gaffer')

      expect(result.profiles[0].credits).toHaveLength(1)
      expect(result.profiles[0].credits[0].project_title).toBe('Movie 1')
      expect(mockFrom).toHaveBeenCalledWith('credits')
      expect(mockSelect).toHaveBeenCalled()
    })

    it('should handle RPC errors', async () => {
      mockSupabase.rpc.mockImplementationOnce(() =>
        Promise.resolve({
          data: null,
          error: { message: 'Database error' },
        })
      )

      await expect(
        profileService.searchProfiles('gaffer')
      ).rejects.toThrow('Failed to count search results: Database error')
    })

    it('should normalize pagination limits', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn(() =>
                Promise.resolve({ data: [], error: null })
              ),
            })),
          })),
        })),
      }))
      mockSupabase.from = mockFrom

      // Test limit normalization (0 -> 1)
      mockSupabase.rpc.mockImplementationOnce(() =>
        Promise.resolve({ data: 0, error: null })
      )
      mockSupabase.rpc.mockImplementationOnce(() =>
        Promise.resolve({ data: [], error: null })
      )

      await profileService.searchProfiles(undefined, undefined, 1, 0)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_profiles', expect.objectContaining({ result_limit: 1 }))

      // Test limit normalization (150 -> 100)
      mockSupabase.rpc.mockImplementationOnce(() =>
        Promise.resolve({ data: 0, error: null })
      )
      mockSupabase.rpc.mockImplementationOnce(() =>
        Promise.resolve({ data: [], error: null })
      )

      await profileService.searchProfiles(undefined, undefined, 1, 150)
      expect(mockSupabase.rpc).toHaveBeenCalledWith('search_profiles', expect.objectContaining({ result_limit: 100 }))
    })
  })

  describe('getProfileByUserId', () => {
    it('should get profile by user_id with credits', async () => {
      const mockProfile = {
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
        credits: [
          {
            id: 'credit-1',
            profile_id: 'profile-1',
            project_title: 'Movie 1',
            role: 'Gaffer',
            project_type: 'feature_film' as const,
            year: 2023,
            production_company: null,
            director: null,
            display_order: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      }

      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockProfile, error: null })),
        })),
      }))

      const mockFrom = vi.fn(() => ({
        select: mockSelect,
      }))
      mockSupabase.from = mockFrom

      const result = await profileService.getProfileByUserId('user-1')

      expect(result).toBeTruthy()
      expect(result?.id).toBe('profile-1')
      expect(result?.credits).toHaveLength(1)
      expect(mockFrom).toHaveBeenCalledWith('profiles')
      expect(mockSelect).toHaveBeenCalled()
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

      const mockFrom = vi.fn(() => ({
        select: mockSelect,
      }))
      mockSupabase.from = mockFrom

      const result = await profileService.getProfileByUserId('user-1')

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

      const mockFrom = vi.fn(() => ({
        select: mockSelect,
      }))
      mockSupabase.from = mockFrom

      await expect(
        profileService.getProfileByUserId('user-1')
      ).rejects.toThrow('Failed to fetch profile: Database error')
    })
  })

  describe('updateProfileForUser', () => {
    it('should update profile for user', async () => {
      const mockProfile = {
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
        credits: [],
      }

      const updatedProfile = {
        ...mockProfile,
        bio: 'Updated bio',
      }

      // Mock getProfileByUserId (first call)
      const mockSelectForGet = vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockProfile, error: null })),
        })),
      }))

      // Mock updateProfile chain: .update().eq().select().single()
      const mockSingle = vi.fn(() => Promise.resolve({ data: updatedProfile, error: null }))
      const mockSelectForUpdate = vi.fn(() => ({ single: mockSingle }))
      const mockEq = vi.fn(() => ({ select: mockSelectForUpdate }))
      const mockUpdate = vi.fn(() => ({ eq: mockEq }))

      // Mock from() to return different chains based on call
      let callCount = 0
      mockSupabase.from = vi.fn(() => {
        callCount++
        if (callCount === 1) {
          // First call: getProfileByUserId - needs select().eq().single()
          return { select: mockSelectForGet }
        } else {
          // Second call: updateProfile - needs update().eq().select().single()
          return { update: mockUpdate }
        }
      })

      const result = await profileService.updateProfileForUser('user-1', {
        bio: 'Updated bio',
      })

      expect(result.bio).toBe('Updated bio')
    })

    it('should throw error if profile not found for user', async () => {
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

      mockSupabase.from = vi.fn(() => ({
        select: mockSelect,
      }))

      await expect(
        profileService.updateProfileForUser('user-1', { bio: 'Updated bio' })
      ).rejects.toThrow('Profile not found for user')
    })
  })

  // Note: Full integration tests require Supabase setup
  // These are placeholder tests to verify method exports
})
