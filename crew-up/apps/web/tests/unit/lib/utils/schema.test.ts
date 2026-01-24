import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Profile, Credit } from '@crew-up/shared'
import { generateProfileSchema } from '@/lib/utils/schema'

// Mock the url utility
vi.mock('@/lib/utils/url', () => ({
  getAbsoluteUrl: vi.fn((path: string) => `https://example.com${path}`),
}))

describe('Schema Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate Person and Service schemas for a profile', () => {
    const profile: Profile & { credits?: Credit[] } = {
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
      contact_phone: '555-1234',
      portfolio_url: null,
      website: 'https://johndoe.com',
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

    const schemas = generateProfileSchema(profile, 'john-doe-gaffer-nashville')

    expect(schemas).toHaveLength(2)

    // Person schema
    const personSchema = schemas[0] as any
    expect(personSchema['@context']).toBe('https://schema.org')
    expect(personSchema['@type']).toBe('Person')
    expect(personSchema.name).toBe('John Doe')
    expect(personSchema.jobTitle).toBe('Gaffer')
    expect(personSchema.address['@type']).toBe('PostalAddress')
    expect(personSchema.address.addressLocality).toBe('Nashville')
    expect(personSchema.address.addressRegion).toBe('TN')
    expect(personSchema.address.addressCountry).toBe('US')
    expect(personSchema.url).toBe('https://example.com/crew/john-doe-gaffer-nashville')
    expect(personSchema.image).toBe('https://example.com/photo.jpg')
    expect(personSchema.email).toBe('john@example.com')
    expect(personSchema.sameAs).toEqual(['https://johndoe.com'])

    // Service schema
    const serviceSchema = schemas[1] as any
    expect(serviceSchema['@context']).toBe('https://schema.org')
    expect(serviceSchema['@type']).toBe('Service')
    expect(serviceSchema.serviceType).toBe('Gaffer')
    expect(serviceSchema.areaServed['@type']).toBe('City')
    expect(serviceSchema.areaServed.name).toBe('Nashville')
    expect(serviceSchema.areaServed.addressRegion).toBe('TN')
    expect(serviceSchema.provider['@type']).toBe('Person')
    expect(serviceSchema.provider.name).toBe('John Doe')
  })

  it('should handle profile without photo', () => {
    const profile: Profile & { credits?: Credit[] } = {
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

    const schemas = generateProfileSchema(profile, 'jane-smith-ac-atlanta')
    const personSchema = schemas[0] as any

    expect(personSchema.image).toBeUndefined()
  })

  it('should include credits in Person schema (worksFor and knowsAbout)', () => {
    const profile: Profile & { credits?: Credit[] } = {
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
          profile_id: 'profile-3',
          project_title: 'Movie 1',
          role: 'Sound Mixer',
          project_type: 'feature_film',
          year: 2024,
          production_company: 'ABC Productions',
          director: 'John Director',
          display_order: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'credit-2',
          profile_id: 'profile-3',
          project_title: 'Movie 2',
          role: 'Sound Mixer',
          project_type: 'commercial',
          year: 2023,
          production_company: 'ABC Productions',
          director: null,
          display_order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'credit-3',
          profile_id: 'profile-3',
          project_title: 'Movie 3',
          role: 'Sound Mixer',
          project_type: 'documentary',
          year: 2022,
          production_company: 'XYZ Films',
          director: null,
          display_order: 2,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    }

    const schemas = generateProfileSchema(profile, 'sarah-martinez-sound-mixer-los-angeles')
    const personSchema = schemas[0] as any

    expect(personSchema.worksFor).toBeDefined()
    expect(personSchema.worksFor).toHaveLength(2) // ABC Productions and XYZ Films (deduplicated)
    expect(personSchema.worksFor[0]['@type']).toBe('Organization')
    expect(personSchema.worksFor[0].name).toBe('ABC Productions')
    expect(personSchema.knowsAbout).toBeDefined()
    expect(personSchema.knowsAbout).toHaveLength(3) // feature_film, commercial, documentary
    expect(personSchema.knowsAbout).toContain('feature_film')
    expect(personSchema.knowsAbout).toContain('commercial')
    expect(personSchema.knowsAbout).toContain('documentary')
  })

  it('should include additional markets in Service schema', () => {
    const profile: Profile & { credits?: Credit[] } = {
      id: 'profile-4',
      user_id: null,
      name: 'Bob Johnson',
      primary_role: 'DP',
      primary_location_city: 'New York',
      primary_location_state: 'NY',
      contact_email: 'bob@example.com',
      slug: 'bob-johnson-dp-new-york',
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
      additional_markets: [
        { city: 'Los Angeles', state: 'CA' },
        { city: 'Chicago', state: 'IL' },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      credits: [],
    }

    const schemas = generateProfileSchema(profile, 'bob-johnson-dp-new-york')
    const serviceSchema = schemas[1] as any

    expect(Array.isArray(serviceSchema.areaServed)).toBe(true)
    expect(serviceSchema.areaServed).toHaveLength(3) // Primary location + 2 additional markets
    expect(serviceSchema.areaServed[0].name).toBe('New York')
    expect(serviceSchema.areaServed[1].name).toBe('Los Angeles')
    expect(serviceSchema.areaServed[2].name).toBe('Chicago')
  })

  it('should handle social links in sameAs array', () => {
    const profile: Profile & { credits?: Credit[] } = {
      id: 'profile-5',
      user_id: null,
      name: 'Alice Brown',
      primary_role: 'Editor',
      primary_location_city: 'Austin',
      primary_location_state: 'TX',
      contact_email: 'alice@example.com',
      slug: 'alice-brown-editor-austin',
      is_claimed: false,
      claim_token: null,
      claim_token_expires_at: null,
      bio: null,
      photo_url: null,
      contact_phone: null,
      portfolio_url: 'https://aliceportfolio.com',
      website: 'https://alicebrown.com',
      instagram_url: 'https://instagram.com/alicebrown',
      vimeo_url: 'https://vimeo.com/alicebrown',
      union_status: null,
      years_experience: null,
      secondary_roles: null,
      additional_markets: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      credits: [],
    }

    const schemas = generateProfileSchema(profile, 'alice-brown-editor-austin')
    const personSchema = schemas[0] as any

    expect(personSchema.sameAs).toContain('https://alicebrown.com')
    expect(personSchema.sameAs).toContain('https://aliceportfolio.com')
    expect(personSchema.sameAs).toContain('https://instagram.com/alicebrown')
    expect(personSchema.sameAs).toContain('https://vimeo.com/alicebrown')
  })
})

