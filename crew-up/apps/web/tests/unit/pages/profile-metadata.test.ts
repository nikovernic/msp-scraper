import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Profile, Credit } from '@crew-up/shared'

// Mock React cache
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    cache: (fn: any) => fn, // In tests, just return the function directly
  }
})

// Mock the url utility
vi.mock('@/lib/utils/url', () => ({
  getAbsoluteUrl: vi.fn((path: string) => `https://example.com${path}`),
}))

// Mock the profile service
vi.mock('@/lib/services/profileService', () => ({
  profileService: {
    getProfileBySlug: vi.fn(),
  },
}))

import { generateMetadata } from '@/app/(public)/crew/[slug]/page'
import { profileService } from '@/lib/services/profileService'
import { getAbsoluteUrl } from '@/lib/utils/url'

describe('Profile Page Metadata Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate metadata with profile photo', async () => {
    const mockProfile: Profile & { credits: Credit[] } = {
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
      bio: 'Experienced gaffer with 10 years in the industry',
      photo_url: 'https://example.com/photo.jpg',
      contact_phone: '555-1234',
      portfolio_url: null,
      website: null,
      instagram_url: null,
      vimeo_url: null,
      union_status: 'union',
      years_experience: 10,
      secondary_roles: null,
      additional_markets: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      credits: [],
    }

    vi.mocked(profileService.getProfileBySlug).mockResolvedValue(mockProfile)

    const metadata = await generateMetadata({ params: { slug: 'john-doe-gaffer-nashville' } })

    expect(metadata.title).toBe('John Doe - Gaffer in Nashville, TN | Crew Up')
    expect(metadata.description).toBe('Experienced gaffer with 10 years in the industry')
    expect(metadata.alternates?.canonical).toBe('https://example.com/crew/john-doe-gaffer-nashville')
    expect(metadata.openGraph?.title).toBe('John Doe - Gaffer')
    expect(metadata.openGraph?.description).toBe('Experienced gaffer with 10 years in the industry')
    expect(metadata.openGraph?.url).toBe('https://example.com/crew/john-doe-gaffer-nashville')
    expect(metadata.openGraph?.siteName).toBe('Crew Up')
    expect(metadata.openGraph?.type).toBe('profile')
    expect(metadata.openGraph?.images).toBeDefined()
    expect(metadata.openGraph?.images?.[0]?.url).toBe('https://example.com/photo.jpg')
    expect(metadata.twitter?.card).toBe('summary_large_image')
    expect(metadata.twitter?.title).toBe('John Doe - Gaffer')
    expect(metadata.twitter?.images?.[0]).toBe('https://example.com/photo.jpg')
    expect(getAbsoluteUrl).toHaveBeenCalledWith('/crew/john-doe-gaffer-nashville')
  })

  it('should generate metadata without profile photo', async () => {
    const mockProfile: Profile & { credits: Credit[] } = {
      id: 'profile-2',
      user_id: null,
      name: 'Jane Smith',
      primary_role: 'AC',
      primary_location_city: 'Atlanta',
      primary_location_state: 'GA',
      contact_email: 'jane@example.com',
      slug: 'jane-smith-ac-atlanta',
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
      credits: [],
    }

    vi.mocked(profileService.getProfileBySlug).mockResolvedValue(mockProfile)

    const metadata = await generateMetadata({ params: { slug: 'jane-smith-ac-atlanta' } })

    expect(metadata.title).toBe('Jane Smith - AC in Atlanta, GA | Crew Up')
    expect(metadata.description).toBe('Jane Smith is a AC based in Atlanta, GA.')
    expect(metadata.alternates?.canonical).toBe('https://example.com/crew/jane-smith-ac-atlanta')
    expect(metadata.openGraph?.title).toBe('Jane Smith - AC')
    expect(metadata.openGraph?.description).toBe('Jane Smith is a AC based in Atlanta, GA.')
    expect(metadata.openGraph?.url).toBe('https://example.com/crew/jane-smith-ac-atlanta')
    expect(metadata.openGraph?.siteName).toBe('Crew Up')
    expect(metadata.openGraph?.type).toBe('profile')
    // Should not have images if photo_url is null
    expect(metadata.openGraph?.images).toBeUndefined()
    expect(metadata.twitter?.card).toBe('summary_large_image')
    expect(metadata.twitter?.title).toBe('Jane Smith - AC')
    expect(metadata.twitter?.images).toBeUndefined()
  })

  it('should generate metadata with target keywords in title', async () => {
    const mockProfile: Profile & { credits: Credit[] } = {
      id: 'profile-3',
      user_id: null,
      name: 'Sarah Martinez',
      primary_role: 'Sound Mixer',
      primary_location_city: 'Los Angeles',
      primary_location_state: 'CA',
      contact_email: 'sarah@example.com',
      slug: 'sarah-martinez-sound-mixer-los-angeles',
      is_claimed: false,
      claim_token: null,
      claim_token_expires_at: null,
      bio: 'Professional sound mixer',
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

    vi.mocked(profileService.getProfileBySlug).mockResolvedValue(mockProfile)

    const metadata = await generateMetadata({ params: { slug: 'sarah-martinez-sound-mixer-los-angeles' } })

    // Title should include "[name] - [role] in [city], [state]" format
    expect(metadata.title).toBe('Sarah Martinez - Sound Mixer in Los Angeles, CA | Crew Up')
  })

  it('should return not found metadata when profile does not exist', async () => {
    vi.mocked(profileService.getProfileBySlug).mockResolvedValue(null)

    const metadata = await generateMetadata({ params: { slug: 'non-existent' } })

    expect(metadata.title).toBe('Profile Not Found')
  })
})

