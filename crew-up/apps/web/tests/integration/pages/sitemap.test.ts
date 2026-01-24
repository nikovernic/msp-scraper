import { describe, it, expect, vi, beforeEach } from 'vitest'
import sitemap from '@/app/sitemap'
import { profileService } from '@/lib/services/profileService'

// Mock dependencies
vi.mock('@/lib/services/profileService', () => ({
  profileService: {
    getAllProfileSlugs: vi.fn(),
  },
}))

vi.mock('@/lib/utils/url', () => ({
  getBaseUrl: vi.fn(() => 'https://example.com'),
}))

describe('Sitemap Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate sitemap with static pages and profile pages', async () => {
    const mockProfiles = [
      { slug: 'john-doe-gaffer-nashville', updated_at: '2024-01-15T00:00:00Z' },
      { slug: 'jane-smith-ac-atlanta', updated_at: '2024-01-20T00:00:00Z' },
    ]

    vi.mocked(profileService.getAllProfileSlugs).mockResolvedValue(mockProfiles)

    const result = await sitemap()

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)

    // Should include static pages
    const homePage = result.find((entry) => entry.url === 'https://example.com')
    expect(homePage).toBeDefined()
    expect(homePage?.priority).toBe(1)
    expect(homePage?.changeFrequency).toBe('weekly')

    const aboutPage = result.find((entry) => entry.url === 'https://example.com/about')
    expect(aboutPage).toBeDefined()
    expect(aboutPage?.priority).toBe(0.5)
    expect(aboutPage?.changeFrequency).toBe('monthly')

    // Should include profile pages
    const profile1 = result.find(
      (entry) => entry.url === 'https://example.com/crew/john-doe-gaffer-nashville'
    )
    expect(profile1).toBeDefined()
    expect(profile1?.priority).toBe(0.8)
    expect(profile1?.changeFrequency).toBe('weekly')
    expect(profile1?.lastModified).toEqual(new Date('2024-01-15T00:00:00Z'))

    const profile2 = result.find(
      (entry) => entry.url === 'https://example.com/crew/jane-smith-ac-atlanta'
    )
    expect(profile2).toBeDefined()
    expect(profile2?.priority).toBe(0.8)
    expect(profile2?.changeFrequency).toBe('weekly')
    expect(profile2?.lastModified).toEqual(new Date('2024-01-20T00:00:00Z'))
  })

  it('should return static pages even if profile fetch fails', async () => {
    vi.mocked(profileService.getAllProfileSlugs).mockRejectedValue(
      new Error('Database error')
    )

    const result = await sitemap()

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBeGreaterThan(0)

    // Should include at least static pages
    const homePage = result.find((entry) => entry.url === 'https://example.com')
    expect(homePage).toBeDefined()
    expect(homePage?.priority).toBe(1)
  })

  it('should generate sitemap with correct URL format for profile pages', async () => {
    const mockProfiles = [
      { slug: 'test-slug', updated_at: '2024-01-01T00:00:00Z' },
    ]

    vi.mocked(profileService.getAllProfileSlugs).mockResolvedValue(mockProfiles)

    const result = await sitemap()

    const profilePage = result.find(
      (entry) => entry.url === 'https://example.com/crew/test-slug'
    )
    expect(profilePage).toBeDefined()
    expect(profilePage?.url).toMatch(/^https:\/\/example\.com\/crew\/test-slug$/)
  })

  it('should handle empty profile list', async () => {
    vi.mocked(profileService.getAllProfileSlugs).mockResolvedValue([])

    const result = await sitemap()

    expect(result).toBeDefined()
    expect(Array.isArray(result)).toBe(true)

    // Should still include static pages
    const homePage = result.find((entry) => entry.url === 'https://example.com')
    expect(homePage).toBeDefined()

    // Should not have any profile pages
    const profilePages = result.filter((entry) =>
      entry.url.includes('/crew/')
    )
    expect(profilePages.length).toBe(0)
  })
})

