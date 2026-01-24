/**
 * Schema.org JSON-LD generation utility
 * Generates structured data for SEO (Person and Service schemas)
 */

import type { Profile, Credit } from '@crew-up/shared'
import { getAbsoluteUrl } from './url'

/**
 * Generate JSON-LD schema markup for a crew profile
 * Returns an array of schema objects (Person and Service)
 */
export function generateProfileSchema(
  profile: Profile & { credits?: Credit[] },
  slug: string
): object[] {
  const profileUrl = getAbsoluteUrl(`/crew/${slug}`)
  const schemas: object[] = []

  // Person schema
  const personSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.primary_role,
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.primary_location_city,
      addressRegion: profile.primary_location_state,
      addressCountry: 'US',
    },
    url: profileUrl,
  }

  // Add image if available
  if (profile.photo_url) {
    personSchema.image = profile.photo_url
  }

  // Add email if available
  if (profile.contact_email) {
    personSchema.email = profile.contact_email
  }

  // Add website/portfolio/social links if available
  const socialLinks: string[] = []
  if (profile.website) socialLinks.push(profile.website)
  if (profile.portfolio_url) socialLinks.push(profile.portfolio_url)
  if (profile.instagram_url) socialLinks.push(profile.instagram_url)
  if (profile.vimeo_url) socialLinks.push(profile.vimeo_url)
  
  if (socialLinks.length > 0) {
    personSchema.sameAs = socialLinks
  }

  // Add worksFor and knowsAbout from credits if available (simplified)
  if (profile.credits && profile.credits.length > 0) {
    // Extract unique production companies
    const productionCompanies = profile.credits
      .map((credit) => credit.production_company)
      .filter((company): company is string => company !== null && company !== undefined)
    if (productionCompanies.length > 0) {
      personSchema.worksFor = productionCompanies
        .filter((company, index, self) => self.indexOf(company) === index)
        .map((company) => ({
          '@type': 'Organization',
          name: company,
        }))
    }

    // Extract project types as knowsAbout (skills/expertise)
    const projectTypes = profile.credits
      .map((credit) => credit.project_type)
      .filter((type, index, self) => self.indexOf(type) === index)
    if (projectTypes.length > 0) {
      personSchema.knowsAbout = projectTypes
    }
  }

  schemas.push(personSchema)

  // Service schema for crew services
  const serviceSchema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: profile.primary_role,
    areaServed: {
      '@type': 'City',
      name: profile.primary_location_city,
      addressRegion: profile.primary_location_state,
      addressCountry: 'US',
    },
    provider: {
      '@type': 'Person',
      name: profile.name,
      url: profileUrl,
    },
  }

  // Add additional markets if available
  if (profile.additional_markets && profile.additional_markets.length > 0) {
    serviceSchema.areaServed = [
      {
        '@type': 'City',
        name: profile.primary_location_city,
        addressRegion: profile.primary_location_state,
        addressCountry: 'US',
      },
      ...profile.additional_markets.map((market) => ({
        '@type': 'City',
        name: market.city,
        addressRegion: market.state,
        addressCountry: 'US',
      })),
    ]
  }

  schemas.push(serviceSchema)

  return schemas
}

