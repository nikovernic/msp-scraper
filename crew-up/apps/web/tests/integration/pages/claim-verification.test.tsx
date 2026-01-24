import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ClaimVerificationPage from '@/app/(public)/claim/[token]/page'
import type { Profile } from '@crew-up/shared'

// Mock claim service
vi.mock('@/lib/services/claimService', () => ({
  claimService: {
    validateClaimToken: vi.fn(),
  },
}))

// Mock ClaimForm component
vi.mock('@/components/profile/ClaimForm', () => ({
  ClaimForm: ({ token, profileName }: { token: string; profileName: string }) => (
    <div data-testid="claim-form">
      <p>Claim Form for {profileName}</p>
      <p>Token: {token}</p>
    </div>
  ),
}))

import { claimService } from '@/lib/services/claimService'

describe('Claim Verification Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockProfile: Profile = {
    id: 'profile-1',
    user_id: null,
    name: 'John Doe',
    primary_role: 'Gaffer',
    primary_location_city: 'Nashville',
    primary_location_state: 'TN',
    contact_email: 'john@example.com',
    slug: 'john-doe-gaffer-nashville',
    is_claimed: false,
    claim_token: 'valid-token-123',
    claim_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    bio: 'Experienced gaffer',
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

  it('should display profile information and claim form for valid token', async () => {
    vi.mocked(claimService.validateClaimToken).mockResolvedValue(mockProfile)

    const page = await ClaimVerificationPage({ params: { token: 'valid-token-123' } })
    const { container } = render(page)

    expect(screen.getByText(/verify your profile/i)).toBeInTheDocument()
    expect(screen.getAllByText(/john doe/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/gaffer/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/nashville, tn/i)).toBeInTheDocument()
    expect(screen.getByText(/experienced gaffer/i)).toBeInTheDocument()
    expect(screen.getByTestId('claim-form')).toBeInTheDocument()
  })

  it('should display invalid token message for non-existent token', async () => {
    vi.mocked(claimService.validateClaimToken).mockResolvedValue(null)

    const page = await ClaimVerificationPage({ params: { token: 'invalid-token' } })
    const { container } = render(page)

    expect(screen.getByText(/invalid claim token/i)).toBeInTheDocument()
    expect(screen.getByText(/this claim token is invalid, has expired, or the profile has already been claimed/i)).toBeInTheDocument()
    expect(screen.queryByTestId('claim-form')).not.toBeInTheDocument()
  })

  it('should display expired token message for expired token', async () => {
    const expiredProfile = {
      ...mockProfile,
      claim_token_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    }
    vi.mocked(claimService.validateClaimToken).mockResolvedValue(expiredProfile)

    const page = await ClaimVerificationPage({ params: { token: 'expired-token' } })
    const { container } = render(page)

    expect(screen.getByText(/claim token expired/i)).toBeInTheDocument()
    expect(screen.getByText(/this claim token has expired/i)).toBeInTheDocument()
    expect(screen.queryByTestId('claim-form')).not.toBeInTheDocument()
  })

  it('should display already claimed message for claimed profile', async () => {
    const claimedProfile = {
      ...mockProfile,
      is_claimed: true,
      user_id: 'user-123',
    }
    vi.mocked(claimService.validateClaimToken).mockResolvedValue(claimedProfile)

    const page = await ClaimVerificationPage({ params: { token: 'used-token' } })
    const { container } = render(page)

    expect(screen.getByText(/profile already claimed/i)).toBeInTheDocument()
    expect(screen.getByText(/this profile has already been claimed/i)).toBeInTheDocument()
    expect(screen.queryByTestId('claim-form')).not.toBeInTheDocument()
  })

  it('should display profile without bio if bio is null', async () => {
    const profileWithoutBio = {
      ...mockProfile,
      bio: null,
    }
    vi.mocked(claimService.validateClaimToken).mockResolvedValue(profileWithoutBio)

    const page = await ClaimVerificationPage({ params: { token: 'valid-token-123' } })
    const { container } = render(page)

    expect(screen.getAllByText(/john doe/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/bio:/i)).not.toBeInTheDocument()
  })
})

