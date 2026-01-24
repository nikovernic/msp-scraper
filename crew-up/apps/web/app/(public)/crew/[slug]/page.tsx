import { notFound } from 'next/navigation'
import { cache } from 'react'
import { profileService } from '@/lib/services/profileService'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { CreditsList } from '@/components/profile/CreditsList'
import { ContactForm } from '@/components/profile/ContactForm'
import type { Metadata } from 'next'
import { getAbsoluteUrl } from '@/lib/utils/url'
import { generateProfileSchema } from '@/lib/utils/schema'

interface PageProps {
  params: { slug: string }
}

// Use React cache to deduplicate requests between generateMetadata and the component
const getCachedProfile = cache(async (slug: string) => {
  return await profileService.getProfileBySlug(slug)
})

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const profile = await getCachedProfile(params.slug)

  if (!profile) {
    return {
      title: 'Profile Not Found',
    }
  }

  const profileUrl = getAbsoluteUrl(`/crew/${params.slug}`)
  const title = `${profile.name} - ${profile.primary_role} in ${profile.primary_location_city}, ${profile.primary_location_state} | Crew Up`
  const description = profile.bio || `${profile.name} is a ${profile.primary_role} based in ${profile.primary_location_city}, ${profile.primary_location_state}.`

  // Use profile photo for OG image if available
  const ogImage = profile.photo_url

  const metadata: Metadata = {
    title,
    description,
    alternates: {
      canonical: profileUrl,
    },
    openGraph: {
      title: `${profile.name} - ${profile.primary_role}`,
      description,
      url: profileUrl,
      siteName: 'Crew Up',
      type: 'profile',
      ...(ogImage && {
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: `${profile.name} - ${profile.primary_role}`,
          },
        ],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${profile.name} - ${profile.primary_role}`,
      description,
      ...(ogImage && { images: [ogImage] }),
    },
  }

  return metadata
}

export default async function ProfilePage({ params }: PageProps) {
  const profile = await getCachedProfile(params.slug)

  if (!profile) {
    notFound()
  }

  const schemas = generateProfileSchema(profile, params.slug)

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <ProfileHeader profile={profile} />
          <CreditsList credits={profile.credits} />
          <div className="mt-8">
            <ContactForm profileSlug={profile.slug} />
          </div>
        </div>
      </main>
    </>
  )
}


