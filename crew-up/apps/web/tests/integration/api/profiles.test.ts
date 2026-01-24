import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/profiles/route'
import { NextRequest } from 'next/server'
import type { Profile, Credit } from '@crew-up/shared'

// Mock dependencies
vi.mock('@/lib/services/profileService', () => ({
  profileService: {
    searchProfiles: vi.fn(),
  },
}))

import { profileService } from '@/lib/services/profileService'

describe('GET /api/profiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return search results with pagination', async () => {
    const mockProfiles: Array<Profile & { credits: Credit[] }> = [
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
        credits: [],
      },
    ]

    vi.mocked(profileService.searchProfiles).mockResolvedValue({
      profiles: mockProfiles,
      total: 1,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/profiles?q=gaffer&page=1&limit=20'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.profiles).toHaveLength(1)
    expect(data.profiles[0].name).toBe('John Doe')
    expect(data.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    })
    expect(profileService.searchProfiles).toHaveBeenCalledWith(
      'gaffer',
      {},
      1,
      20
    )
  })

  it('should parse query parameters correctly', async () => {
    vi.mocked(profileService.searchProfiles).mockResolvedValue({
      profiles: [],
      total: 0,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/profiles?q=AC+in+Nashville&role=Gaffer&city=Nashville&state=TN&years_experience_min=5&years_experience_max=15&page=2&limit=10'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(profileService.searchProfiles).toHaveBeenCalledWith(
      'AC in Nashville',
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
    expect(data.pagination.page).toBe(2)
    expect(data.pagination.limit).toBe(10)
  })

  it('should use default pagination values', async () => {
    vi.mocked(profileService.searchProfiles).mockResolvedValue({
      profiles: [],
      total: 0,
    })

    const request = new NextRequest('http://localhost:3000/api/profiles')

    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(profileService.searchProfiles).toHaveBeenCalledWith(
      undefined,
      {},
      1,
      20
    )
  })

  it('should handle empty search results', async () => {
    vi.mocked(profileService.searchProfiles).mockResolvedValue({
      profiles: [],
      total: 0,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/profiles?q=nonexistent'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.profiles).toHaveLength(0)
    expect(data.pagination.total).toBe(0)
    expect(data.pagination.totalPages).toBe(0)
  })

  it('should calculate totalPages correctly', async () => {
    vi.mocked(profileService.searchProfiles).mockResolvedValue({
      profiles: [],
      total: 45,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/profiles?page=1&limit=20'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.pagination.total).toBe(45)
    expect(data.pagination.totalPages).toBe(3) // Math.ceil(45/20) = 3
  })

  it('should return 400 for invalid state code (not 2 characters)', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/profiles?state=TENNESSEE'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(profileService.searchProfiles).not.toHaveBeenCalled()
  })

  it('should return 400 for invalid page number (less than 1)', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/profiles?page=0'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should return 400 for invalid limit (greater than 100)', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/profiles?limit=150'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should return 500 when search service throws error', async () => {
    vi.mocked(profileService.searchProfiles).mockRejectedValue(
      new Error('Database error')
    )

    const request = new NextRequest('http://localhost:3000/api/profiles?q=gaffer')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
  })

  it('should handle filters without search query', async () => {
    vi.mocked(profileService.searchProfiles).mockResolvedValue({
      profiles: [],
      total: 0,
    })

    const request = new NextRequest(
      'http://localhost:3000/api/profiles?role=Gaffer&city=Nashville'
    )

    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(profileService.searchProfiles).toHaveBeenCalledWith(
      undefined,
      {
        role: 'Gaffer',
        city: 'Nashville',
      },
      1,
      20
    )
  })
})

