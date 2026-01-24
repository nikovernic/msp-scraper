import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProfilePage from '@/app/(public)/crew/[slug]/page'
import type { Profile, Credit } from '@crew-up/shared'

// Mock React cache
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    cache: (fn: any) => fn, // In tests, just return the function directly
  }
})

// Mock dependencies
vi.mock('@/lib/services/profileService', () => ({
  profileService: {
    getProfileBySlug: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('notFound')
  }),
}))

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} {...props} />
  },
}))

// Mock schema utility
vi.mock('@/lib/utils/schema', () => ({
  generateProfileSchema: vi.fn(() => []),
}))

// Mock url utility
vi.mock('@/lib/utils/url', () => ({
  getAbsoluteUrl: vi.fn((path: string) => `https://example.com${path}`),
}))

import { profileService } from '@/lib/services/profileService'
import { notFound } from 'next/navigation'

describe('Profile Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render profile page with profile data', async () => {
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
      credits: [
        {
          id: 'credit-1',
          profile_id: 'profile-1',
          project_title: 'Test Project',
          role: 'Gaffer',
          project_type: 'commercial',
          year: 2024,
          production_company: 'ABC Productions',
          director: 'John Director',
          display_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    }

    vi.mocked(profileService.getProfileBySlug).mockResolvedValue(mockProfile)

    const Page = await ProfilePage({ params: { slug: 'john-doe-gaffer-nashville' } })
    const { container } = render(Page)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Gaffer')).toBeInTheDocument()
    expect(screen.getByText('Nashville, TN')).toBeInTheDocument()
    expect(screen.getByText('Experienced gaffer with 10 years in the industry')).toBeInTheDocument()
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(profileService.getProfileBySlug).toHaveBeenCalledWith('john-doe-gaffer-nashville')
  })

  it('should call notFound when profile does not exist', async () => {
    vi.mocked(profileService.getProfileBySlug).mockResolvedValue(null)

    try {
      await ProfilePage({ params: { slug: 'non-existent-slug' } })
      // Should not reach here
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('notFound')
    }

    expect(profileService.getProfileBySlug).toHaveBeenCalledWith('non-existent-slug')
    expect(notFound).toHaveBeenCalled()
  })

  it('should render profile without credits', async () => {
    const mockProfile: Profile & { credits: Credit[] } = {
      id: 'profile-1',
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

    const Page = await ProfilePage({ params: { slug: 'jane-smith-ac-atlanta' } })
    render(Page)

    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('AC')).toBeInTheDocument()
    expect(screen.getByText('Atlanta, GA')).toBeInTheDocument()
    expect(screen.getByText('No credits available.')).toBeInTheDocument()
  })

  it('should render profile with multiple credits sorted by display_order', async () => {
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
          id: 'credit-2',
          profile_id: 'profile-1',
          project_title: 'Second Project',
          role: 'Gaffer',
          project_type: 'commercial',
          year: 2023,
          production_company: null,
          director: null,
          display_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'credit-1',
          profile_id: 'profile-1',
          project_title: 'First Project',
          role: 'Gaffer',
          project_type: 'feature_film',
          year: 2024,
          production_company: null,
          director: null,
          display_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    }

    vi.mocked(profileService.getProfileBySlug).mockResolvedValue(mockProfile)

    const Page = await ProfilePage({ params: { slug: 'john-doe-gaffer-nashville' } })
    const { container } = render(Page)

    const projectTitles = screen.getAllByText(/Project/)
    // Credits should be sorted by display_order (0 comes before 1)
    expect(projectTitles[0].textContent).toBe('First Project')
    expect(projectTitles[1].textContent).toBe('Second Project')
  })
})


