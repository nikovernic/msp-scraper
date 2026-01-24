import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import type { Profile } from '@crew-up/shared'

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} {...props} />
  },
}))

describe('ProfileHeader', () => {
  const baseProfile: Profile = {
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
  }

  it('should render profile name and role', () => {
    render(<ProfileHeader profile={baseProfile} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Gaffer')).toBeInTheDocument()
  })

  it('should render location', () => {
    render(<ProfileHeader profile={baseProfile} />)

    expect(screen.getByText('Nashville, TN')).toBeInTheDocument()
  })

  it('should render profile photo when photo_url is provided', () => {
    const profileWithPhoto = {
      ...baseProfile,
      photo_url: 'https://example.com/photo.jpg',
    }

    render(<ProfileHeader profile={profileWithPhoto} />)

    const image = screen.getByAltText('John Doe')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', 'https://example.com/photo.jpg')
  })

  it('should not render photo when photo_url is null', () => {
    render(<ProfileHeader profile={baseProfile} />)

    const image = screen.queryByAltText('John Doe')
    expect(image).not.toBeInTheDocument()
  })

  it('should render bio when provided', () => {
    const profileWithBio = {
      ...baseProfile,
      bio: 'Experienced gaffer with 10 years in the industry',
    }

    render(<ProfileHeader profile={profileWithBio} />)

    expect(screen.getByText('Experienced gaffer with 10 years in the industry')).toBeInTheDocument()
  })

  it('should render contact email link', () => {
    render(<ProfileHeader profile={baseProfile} />)

    const emailLink = screen.getByText('john@example.com')
    expect(emailLink).toBeInTheDocument()
    expect(emailLink).toHaveAttribute('href', 'mailto:john@example.com')
  })

  it('should render contact phone link when provided', () => {
    const profileWithPhone = {
      ...baseProfile,
      contact_phone: '555-1234',
    }

    render(<ProfileHeader profile={profileWithPhone} />)

    const phoneLink = screen.getByText('555-1234')
    expect(phoneLink).toBeInTheDocument()
    expect(phoneLink).toHaveAttribute('href', 'tel:555-1234')
  })

  it('should render website link when provided', () => {
    const profileWithWebsite = {
      ...baseProfile,
      website: 'https://johndoe.com',
    }

    render(<ProfileHeader profile={profileWithWebsite} />)

    const websiteLink = screen.getByText('Website')
    expect(websiteLink).toBeInTheDocument()
    expect(websiteLink).toHaveAttribute('href', 'https://johndoe.com')
    expect(websiteLink).toHaveAttribute('target', '_blank')
    expect(websiteLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('should render portfolio link when provided', () => {
    const profileWithPortfolio = {
      ...baseProfile,
      portfolio_url: 'https://portfolio.com/johndoe',
    }

    render(<ProfileHeader profile={profileWithPortfolio} />)

    const portfolioLink = screen.getByText('Portfolio')
    expect(portfolioLink).toBeInTheDocument()
    expect(portfolioLink).toHaveAttribute('href', 'https://portfolio.com/johndoe')
  })

  it('should render Instagram link when provided', () => {
    const profileWithInstagram = {
      ...baseProfile,
      instagram_url: 'https://instagram.com/johndoe',
    }

    render(<ProfileHeader profile={profileWithInstagram} />)

    const instagramLink = screen.getByText('Instagram')
    expect(instagramLink).toBeInTheDocument()
    expect(instagramLink).toHaveAttribute('href', 'https://instagram.com/johndoe')
  })

  it('should render Vimeo link when provided', () => {
    const profileWithVimeo = {
      ...baseProfile,
      vimeo_url: 'https://vimeo.com/johndoe',
    }

    render(<ProfileHeader profile={profileWithVimeo} />)

    const vimeoLink = screen.getByText('Vimeo')
    expect(vimeoLink).toBeInTheDocument()
    expect(vimeoLink).toHaveAttribute('href', 'https://vimeo.com/johndoe')
  })

  it('should render union status when provided', () => {
    const profileWithUnion = {
      ...baseProfile,
      union_status: 'union',
    }

    render(<ProfileHeader profile={profileWithUnion} />)

    expect(screen.getByText(/Union Status: union/i)).toBeInTheDocument()
  })

  it('should render years of experience when provided', () => {
    const profileWithExperience = {
      ...baseProfile,
      years_experience: 10,
    }

    render(<ProfileHeader profile={profileWithExperience} />)

    expect(screen.getByText(/Experience: 10 years/i)).toBeInTheDocument()
  })

  it('should render all optional fields when provided', () => {
    const fullProfile: Profile = {
      ...baseProfile,
      photo_url: 'https://example.com/photo.jpg',
      bio: 'Experienced gaffer',
      contact_phone: '555-1234',
      website: 'https://johndoe.com',
      portfolio_url: 'https://portfolio.com/johndoe',
      instagram_url: 'https://instagram.com/johndoe',
      vimeo_url: 'https://vimeo.com/johndoe',
      union_status: 'union',
      years_experience: 10,
    }

    render(<ProfileHeader profile={fullProfile} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('Gaffer')).toBeInTheDocument()
    expect(screen.getByText('Nashville, TN')).toBeInTheDocument()
    expect(screen.getByText('Experienced gaffer')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('555-1234')).toBeInTheDocument()
    expect(screen.getByText('Website')).toBeInTheDocument()
    expect(screen.getByText('Portfolio')).toBeInTheDocument()
    expect(screen.getByText('Instagram')).toBeInTheDocument()
    expect(screen.getByText('Vimeo')).toBeInTheDocument()
    expect(screen.getByText(/Union Status: union/i)).toBeInTheDocument()
    expect(screen.getByText(/Experience: 10 years/i)).toBeInTheDocument()
  })
})
