import Image from 'next/image'
import type { Profile } from '@crew-up/shared'

interface ProfileHeaderProps {
  profile: Profile
}

export function ProfileHeader({ profile }: ProfileHeaderProps) {
  return (
    <div className="border-b pb-8 mb-8">
      <div className="flex flex-col md:flex-row gap-6">
        {profile.photo_url && (
          <div className="flex-shrink-0">
            <Image
              src={profile.photo_url}
              alt={profile.name}
              width={200}
              height={200}
              className="rounded-lg object-cover"
              priority
              sizes="(max-width: 768px) 100vw, 200px"
            />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-4xl font-bold mb-2">{profile.name}</h1>
          <p className="text-xl text-muted-foreground mb-4">
            {profile.primary_role}
          </p>
          <p className="text-lg mb-4">
            {profile.primary_location_city}, {profile.primary_location_state}
          </p>
          {profile.bio && (
            <p className="text-muted-foreground mb-4">{profile.bio}</p>
          )}
          <div className="flex flex-wrap gap-4 text-sm">
            {profile.contact_email && (
              <a
                href={`mailto:${profile.contact_email}`}
                className="text-primary hover:underline"
              >
                {profile.contact_email}
              </a>
            )}
            {profile.contact_phone && (
              <a
                href={`tel:${profile.contact_phone}`}
                className="text-primary hover:underline"
              >
                {profile.contact_phone}
              </a>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Website
              </a>
            )}
            {profile.portfolio_url && (
              <a
                href={profile.portfolio_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Portfolio
              </a>
            )}
            {profile.instagram_url && (
              <a
                href={profile.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Instagram
              </a>
            )}
            {profile.vimeo_url && (
              <a
                href={profile.vimeo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Vimeo
              </a>
            )}
          </div>
          {profile.union_status && (
            <p className="text-sm text-muted-foreground mt-4">
              Union Status: {profile.union_status}
            </p>
          )}
          {profile.years_experience && (
            <p className="text-sm text-muted-foreground">
              Experience: {profile.years_experience} years
            </p>
          )}
        </div>
      </div>
    </div>
  )
}


