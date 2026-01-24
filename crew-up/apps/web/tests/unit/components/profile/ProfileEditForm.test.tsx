import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import type { Profile, Credit } from '@crew-up/shared'

// Mock fetch
global.fetch = vi.fn()

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}))

const mockProfile: Profile & { credits?: Credit[] } = {
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

describe('ProfileEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render profile edit form with all fields', () => {
    render(<ProfileEditForm profile={mockProfile} />)

    expect(screen.getByText(/edit profile/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/primary role/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/city/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/state/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/contact email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/bio/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save profile/i })).toBeInTheDocument()
  })

  it('should populate form with existing profile data', () => {
    render(<ProfileEditForm profile={mockProfile} />)

    expect(screen.getByLabelText(/name/i)).toHaveValue('John Doe')
    expect(screen.getByLabelText(/primary role/i)).toHaveValue('Gaffer')
    expect(screen.getByLabelText(/city/i)).toHaveValue('Nashville')
    expect(screen.getByLabelText(/state/i)).toHaveValue('TN')
    expect(screen.getByLabelText(/contact email/i)).toHaveValue('john@example.com')
  })

  it('should show validation errors for required fields', async () => {
    const user = userEvent.setup()
    render(<ProfileEditForm profile={mockProfile} />)

    // Clear required fields
    await user.clear(screen.getByLabelText(/name/i))
    await user.clear(screen.getByLabelText(/primary role/i))
    await user.clear(screen.getByLabelText(/city/i))
    await user.clear(screen.getByLabelText(/state/i))
    await user.clear(screen.getByLabelText(/contact email/i))

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/primary role is required/i)).toBeInTheDocument()
      expect(screen.getByText(/city is required/i)).toBeInTheDocument()
      expect(screen.getByText(/state must be 2-letter code/i)).toBeInTheDocument()
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    const user = userEvent.setup()
    render(<ProfileEditForm profile={mockProfile} />)

    const emailInput = screen.getByLabelText(/contact email/i)
    await user.clear(emailInput)
    await user.type(emailInput, 'invalid-email')

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('should validate bio max length (250 chars)', async () => {
    const user = userEvent.setup()
    render(<ProfileEditForm profile={mockProfile} />)

    const bioInput = screen.getByLabelText(/bio/i)
    const longBio = 'a'.repeat(251)
    await user.type(bioInput, longBio)

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/bio must be 250 characters or less/i)).toBeInTheDocument()
    })
  })

  it('should validate URL format for portfolio_url', async () => {
    const user = userEvent.setup()
    render(<ProfileEditForm profile={mockProfile} />)

    const portfolioInput = screen.getByLabelText(/portfolio url/i)
    await user.type(portfolioInput, 'not-a-valid-url')

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid url format/i)).toBeInTheDocument()
    })
  })

  it('should submit form successfully', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.mocked(fetch)
    const updatedProfile = {
      ...mockProfile,
      bio: 'Updated bio',
    }

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => updatedProfile,
    } as Response)

    render(<ProfileEditForm profile={mockProfile} />)

    const bioInput = screen.getByLabelText(/bio/i)
    await user.type(bioInput, 'Updated bio')

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/profiles/me',
        expect.objectContaining({
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/profile updated successfully/i)).toBeInTheDocument()
    })
  })

  it('should handle API error response', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
        },
      }),
    } as Response)

    render(<ProfileEditForm profile={mockProfile} />)

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid request parameters/i)).toBeInTheDocument()
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.mocked(fetch)
    let resolvePromise: (value: Response) => void
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve
    })
    mockFetch.mockReturnValueOnce(pendingPromise)

    render(<ProfileEditForm profile={mockProfile} />)

    const submitButton = screen.getByRole('button', { name: /save profile/i })
    await user.click(submitButton)

    expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => mockProfile,
    } as Response)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /saving/i })).not.toBeInTheDocument()
    })
  })

  it('should display credits section', () => {
    const profileWithCredits = {
      ...mockProfile,
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

    render(<ProfileEditForm profile={profileWithCredits} />)

    expect(screen.getByText(/credits/i)).toBeInTheDocument()
    expect(screen.getByText(/movie 1/i)).toBeInTheDocument()
  })

  it('should allow adding secondary roles', async () => {
    const user = userEvent.setup()
    render(<ProfileEditForm profile={mockProfile} />)

    const addButton = screen.getByRole('button', { name: /add secondary role/i })
    await user.click(addButton)

    const secondaryRoleInputs = screen.getAllByPlaceholderText(/secondary role/i)
    expect(secondaryRoleInputs.length).toBeGreaterThan(0)
  })

  it('should allow adding additional markets', async () => {
    const user = userEvent.setup()
    render(<ProfileEditForm profile={mockProfile} />)

    const addButton = screen.getByRole('button', { name: /add market/i })
    await user.click(addButton)

    const cityInputs = screen.getAllByPlaceholderText(/city/i)
    const stateInputs = screen.getAllByPlaceholderText(/state/i)
    expect(cityInputs.length).toBeGreaterThan(0)
    expect(stateInputs.length).toBeGreaterThan(0)
  })
})

