import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import SearchPage from '@/app/(public)/search/page'
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
    searchProfiles: vi.fn(),
  },
}))

vi.mock('@/lib/services/searchService', () => ({
  buildSearchQuery: vi.fn(),
}))

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} {...props} />
  },
}))

// Mock url utility
vi.mock('@/lib/utils/url', () => ({
  getAbsoluteUrl: vi.fn((path: string) => `https://example.com${path}`),
}))

// Mock SearchFilters component (client component)
vi.mock('@/components/search/SearchFilters', () => ({
  SearchFilters: () => <div data-testid="search-filters">Search Filters</div>,
}))

import { profileService } from '@/lib/services/profileService'
import { buildSearchQuery } from '@/lib/services/searchService'

describe('Search Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

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
    bio: 'Experienced gaffer',
    photo_url: 'https://example.com/photo.jpg',
    contact_phone: null,
    portfolio_url: null,
    website: null,
    instagram_url: null,
    vimeo_url: null,
    union_status: null,
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
        production_company: null,
        director: null,
        display_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  }

  it('should render search results with profiles', async () => {
    vi.mocked(buildSearchQuery).mockReturnValue({
      textQuery: 'gaffer',
      filters: {},
      pagination: { page: 1, limit: 20 },
    })

    vi.mocked(profileService.searchProfiles).mockResolvedValue({
      profiles: [mockProfile],
      total: 1,
    })

    const Page = await SearchPage({
      searchParams: { q: 'gaffer' },
    })
    render(Page)

    expect(screen.getByText('Search Results for "gaffer"')).toBeInTheDocument()
    expect(screen.getByText('Found 1 result')).toBeInTheDocument()
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    // Gaffer appears in role and credit, so check for the role paragraph specifically
    const roleElements = screen.getAllByText('Gaffer')
    expect(roleElements.length).toBeGreaterThan(0)
    expect(screen.getByText('Nashville, TN')).toBeInTheDocument()
    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByTestId('search-filters')).toBeInTheDocument()
  })

  it('should render "No results found" when search returns empty', async () => {
    vi.mocked(buildSearchQuery).mockReturnValue({
      textQuery: 'nonexistent',
      filters: {},
      pagination: { page: 1, limit: 20 },
    })

    vi.mocked(profileService.searchProfiles).mockResolvedValue({
      profiles: [],
      total: 0,
    })

    const Page = await SearchPage({
      searchParams: { q: 'nonexistent' },
    })
    render(Page)

    expect(screen.getByText('Search Results for "nonexistent"')).toBeInTheDocument()
    expect(
      screen.getByText(
        'No results found. Try adjusting your search criteria.'
      )
    ).toBeInTheDocument()
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument()
  })

  it('should render search page without query', async () => {
    vi.mocked(buildSearchQuery).mockReturnValue({
      textQuery: undefined,
      filters: {},
      pagination: { page: 1, limit: 20 },
    })

    vi.mocked(profileService.searchProfiles).mockResolvedValue({
      profiles: [],
      total: 0,
    })

    const Page = await SearchPage({
      searchParams: {},
    })
    render(Page)

    expect(screen.getByText('Search Crew')).toBeInTheDocument()
  })

  it('should display pagination controls when totalPages > 1', async () => {
    const mockProfiles = Array.from({ length: 2 }, (_, i) => ({
      ...mockProfile,
      id: `profile-${i + 1}`,
      slug: `profile-${i + 1}`,
    }))

    vi.mocked(buildSearchQuery).mockReturnValue({
      textQuery: 'gaffer',
      filters: {},
      pagination: { page: 1, limit: 20 },
    })

    vi.mocked(profileService.searchProfiles).mockResolvedValue({
      profiles: mockProfiles,
      total: 45, // Should result in 3 pages (45 / 20 = 2.25, ceil = 3)
    })

    const Page = await SearchPage({
      searchParams: { q: 'gaffer', page: '1' },
    })
    render(Page)

    // Should show pagination controls
    expect(screen.getByLabelText('Pagination')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
  })

  it('should not display pagination controls when totalPages <= 1', async () => {
    vi.mocked(buildSearchQuery).mockReturnValue({
      textQuery: 'gaffer',
      filters: {},
      pagination: { page: 1, limit: 20 },
    })

    vi.mocked(profileService.searchProfiles).mockResolvedValue({
      profiles: [mockProfile],
      total: 1,
    })

    const Page = await SearchPage({
      searchParams: { q: 'gaffer' },
    })
    render(Page)

    expect(screen.queryByLabelText('Pagination')).not.toBeInTheDocument()
  })

  it('should handle filters in search params', async () => {
    vi.mocked(buildSearchQuery).mockReturnValue({
      textQuery: 'gaffer',
      filters: { role: 'Gaffer', city: 'Nashville' },
      pagination: { page: 1, limit: 20 },
    })

    vi.mocked(profileService.searchProfiles).mockResolvedValue({
      profiles: [mockProfile],
      total: 1,
    })

    const Page = await SearchPage({
      searchParams: {
        q: 'gaffer',
        role: 'Gaffer',
        city: 'Nashville',
      },
    })
    render(Page)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(profileService.searchProfiles).toHaveBeenCalled()
  })

  it('should display multiple results count correctly', async () => {
    const mockProfiles = Array.from({ length: 3 }, (_, i) => ({
      ...mockProfile,
      id: `profile-${i + 1}`,
      slug: `profile-${i + 1}`,
    }))

    vi.mocked(buildSearchQuery).mockReturnValue({
      textQuery: 'gaffer',
      filters: {},
      pagination: { page: 1, limit: 20 },
    })

    vi.mocked(profileService.searchProfiles).mockResolvedValue({
      profiles: mockProfiles,
      total: 3,
    })

    const Page = await SearchPage({
      searchParams: { q: 'gaffer' },
    })
    render(Page)

    expect(screen.getByText('Found 3 results')).toBeInTheDocument()
  })

  it('should render ProfileCard links correctly', async () => {
    vi.mocked(buildSearchQuery).mockReturnValue({
      textQuery: 'gaffer',
      filters: {},
      pagination: { page: 1, limit: 20 },
    })

    vi.mocked(profileService.searchProfiles).mockResolvedValue({
      profiles: [mockProfile],
      total: 1,
    })

    const Page = await SearchPage({
      searchParams: { q: 'gaffer' },
    })
    render(Page)

    const viewProfileLink = screen.getByText('View Profile')
    expect(viewProfileLink).toBeInTheDocument()
    expect(viewProfileLink.closest('a')).toHaveAttribute(
      'href',
      '/crew/john-doe-gaffer-nashville'
    )
  })
})

