import Image from 'next/image'
import Link from 'next/link'
import type { Profile, Credit } from '@crew-up/shared'

interface ProfileCardProps {
  profile: Profile & { credits: Credit[] }
}

export function ProfileCard({ profile }: ProfileCardProps) {
  // Get top 3 credits (already sorted by display_order from service)
  const topCredits = profile.credits.slice(0, 3)

  return (
    <article className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
      <div className="flex gap-4">
        {/* Profile Photo */}
        {profile.photo_url ? (
          <div className="flex-shrink-0">
            <Image
              src={profile.photo_url}
              alt={profile.name}
              width={80}
              height={80}
              className="rounded-full object-cover"
              sizes="80px"
            />
          </div>
        ) : (
          <div className="flex-shrink-0 w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <span className="text-2xl font-bold text-muted-foreground">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Profile Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold mb-1">{profile.name}</h3>
          <p className="text-muted-foreground mb-1">{profile.primary_role}</p>
          <p className="text-sm text-muted-foreground mb-3">
            {profile.primary_location_city}, {profile.primary_location_state}
          </p>

          {/* Top 3 Credits */}
          {topCredits.length > 0 && (
            <div className="space-y-1 mb-3">
              {topCredits.map((credit) => (
                <div key={credit.id} className="text-sm text-muted-foreground">
                  <span className="font-medium">{credit.project_title}</span>
                  {' • '}
                  <span>{credit.role}</span>
                  {' • '}
                  <span>{credit.year}</span>
                </div>
              ))}
            </div>
          )}

          {/* View Profile Link */}
          <Link
            href={`/crew/${profile.slug}`}
            className="text-primary hover:underline text-sm font-medium"
          >
            View Profile
          </Link>
        </div>
      </div>
    </article>
  )
}

