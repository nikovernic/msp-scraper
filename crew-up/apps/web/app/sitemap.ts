import { MetadataRoute } from 'next'
import { profileService } from '@/lib/services/profileService'
import { getBaseUrl } from '@/lib/utils/url'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseUrl()

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]

  // Fetch all profile slugs
  try {
    const profiles = await profileService.getAllProfileSlugs()

    const profilePages: MetadataRoute.Sitemap = profiles.map((profile) => ({
      url: `${baseUrl}/crew/${profile.slug}`,
      lastModified: new Date(profile.updated_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    }))

    return [...staticPages, ...profilePages]
  } catch (error) {
    // If there's an error fetching profiles, return at least static pages
    console.error('Error generating sitemap:', error)
    return staticPages
  }
}

