import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProfileEditPage from '@/app/(auth)/profile/edit/page'
import type { Profile, Credit } from '@crew-up/shared'

// Mock React cache
vi.mock('react', async () => {
  const actual = await vi.importActual('react')
  return {
    ...actual,
    cache: (fn: any) => fn,
  }
})

// Mock dependencies
vi.mock('@/lib/middleware/auth', () => ({
  requireAuthForPage: vi.fn(),
}))

vi.mock('@/lib/services/profileService', () => ({
  profileService: {
    getProfileByUserId: vi.fn(),
  },
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))

// Mock Next.js Image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} {...props} />
  },
}))

import { requireAuthForPage } from '@/lib/middleware/auth'
import { profileService } from '@/lib/services/profileService'
import { redirect } from 'next/navigation'

describe('Profile Edit Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render profile edit page with profile data', async () => {
    const mockUser = { id: 'user-1', email: 'user@example.com' }
    const mockProfile: Profile & { credits: Credit[] } = {
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
      bio: 'Experienced gaffer',
      photo_url: null,
      contact_phone: null,
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

    vi.mocked(requireAuthForPage).mockResolvedValue({
      user: mockUser,
      supabase: {} as any,
    })
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue(mockProfile)

    const Page = await ProfileEditPage()
    render(Page)

    expect(screen.getByText(/edit profile/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toHaveValue('John Doe')
    expect(screen.getByLabelText(/primary role/i)).toHaveValue('Gaffer')
    expect(screen.getByLabelText(/city/i)).toHaveValue('Nashville')
    expect(screen.getByLabelText(/state/i)).toHaveValue('TN')
    expect(profileService.getProfileByUserId).toHaveBeenCalledWith('user-1')
  })

  it('should redirect to home if profile not found', async () => {
    const mockUser = { id: 'user-1', email: 'user@example.com' }

    vi.mocked(requireAuthForPage).mockResolvedValue({
      user: mockUser,
      supabase: {} as any,
    })
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue(null)

    try {
      await ProfileEditPage()
      // Should not reach here
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('redirect:/')
    }

    expect(profileService.getProfileByUserId).toHaveBeenCalledWith('user-1')
    expect(redirect).toHaveBeenCalledWith('/')
  })

  it('should redirect to signin if not authenticated', async () => {
    vi.mocked(requireAuthForPage).mockImplementation(() => {
      redirect('/signin')
      return Promise.resolve({ user: null as any, supabase: {} as any })
    })

    try {
      await ProfileEditPage()
      // Should not reach here
      expect(true).toBe(false)
    } catch (error) {
      expect(error).toBeInstanceOf(Error)
      expect(error.message).toBe('redirect:/signin')
    }

    expect(profileService.getProfileByUserId).not.toHaveBeenCalled()
  })

  it('should render profile with credits', async () => {
    const mockUser = { id: 'user-1', email: 'user@example.com' }
    const mockProfile: Profile & { credits: Credit[] } = {
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
          project_title: 'Test Project',
          role: 'Gaffer',
          project_type: 'commercial',
          year: 2024,
          production_company: 'ABC Productions',
          director: null,
          display_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    }

    vi.mocked(requireAuthForPage).mockResolvedValue({
      user: mockUser,
      supabase: {} as any,
    })
    vi.mocked(profileService.getProfileByUserId).mockResolvedValue(mockProfile)

    const Page = await ProfileEditPage()
    render(Page)

    expect(screen.getByText(/credits/i)).toBeInTheDocument()
    expect(screen.getByText(/test project/i)).toBeInTheDocument()
  })
})

