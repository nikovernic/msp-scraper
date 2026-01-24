import { notFound } from 'next/navigation'
import { claimService } from '@/lib/services/claimService'
import { ClaimForm } from '@/components/profile/ClaimForm'
import type { Metadata } from 'next'

interface PageProps {
  params: { token: string }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  // Validate token to get profile info for metadata
  const profile = await claimService.validateClaimToken(params.token)

  if (!profile) {
    return {
      title: 'Invalid Claim Token | Crew Up',
    }
  }

  return {
    title: `Claim Your Profile - ${profile.name} | Crew Up`,
    description: `Claim your Crew Up profile to manage your information and connect with producers.`,
    robots: 'noindex, nofollow', // Don't index claim pages
  }
}

export default async function ClaimVerificationPage({ params }: PageProps) {
  const { token } = params

  // Validate claim token
  const profile = await claimService.validateClaimToken(token)

  if (!profile) {
    // Token is invalid, expired, or profile already claimed
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          <div className="border rounded-lg p-6 bg-card">
            <h1 className="text-2xl font-bold mb-4">Invalid Claim Token</h1>
            <p className="text-muted-foreground mb-4">
              This claim token is invalid, has expired, or the profile has already been claimed.
            </p>
            <p className="text-muted-foreground">
              Please contact support or request a new claim invitation if you need to claim this profile.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // Check if token is expired (additional check for better UX)
  if (profile.claim_token_expires_at) {
    const expirationDate = new Date(profile.claim_token_expires_at)
    const now = new Date()
    if (expirationDate < now) {
      return (
        <main className="min-h-screen p-8">
          <div className="max-w-2xl mx-auto">
            <div className="border rounded-lg p-6 bg-card">
              <h1 className="text-2xl font-bold mb-4">Claim Token Expired</h1>
              <p className="text-muted-foreground mb-4">
                This claim token has expired. Claim tokens are valid for 30 days.
              </p>
              <p className="text-muted-foreground">
                Please request a new claim invitation to claim this profile.
              </p>
            </div>
          </div>
        </main>
      )
    }
  }

  // Check if already claimed (additional check)
  if (profile.is_claimed) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-2xl mx-auto">
          <div className="border rounded-lg p-6 bg-card">
            <h1 className="text-2xl font-bold mb-4">Profile Already Claimed</h1>
            <p className="text-muted-foreground mb-4">
              This profile has already been claimed.
            </p>
            <p className="text-muted-foreground">
              If you believe this is an error, please contact support.
            </p>
          </div>
        </div>
      </main>
    )
  }

  // Token is valid - show claim form
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        {/* Profile Information Display */}
        <div className="border rounded-lg p-6 bg-card mb-6">
          <h1 className="text-2xl font-bold mb-4">Verify Your Profile</h1>
          <p className="text-muted-foreground mb-4">
            Please verify that this is your profile before claiming:
          </p>
          <div className="space-y-2">
            <div>
              <span className="font-medium">Name:</span>{' '}
              <span>{profile.name}</span>
            </div>
            <div>
              <span className="font-medium">Role:</span>{' '}
              <span>{profile.primary_role}</span>
            </div>
            <div>
              <span className="font-medium">Location:</span>{' '}
              <span>
                {profile.primary_location_city}, {profile.primary_location_state}
              </span>
            </div>
            {profile.bio && (
              <div>
                <span className="font-medium">Bio:</span>{' '}
                <span>{profile.bio}</span>
              </div>
            )}
          </div>
        </div>

        {/* Claim Form */}
        <ClaimForm token={token} profileName={profile.name} />
      </div>
    </main>
  )
}

