import { requireAuthForPage } from '@/lib/middleware/auth'
import { profileService } from '@/lib/services/profileService'
import { ProfileEditForm } from '@/components/profile/ProfileEditForm'
import { redirect } from 'next/navigation'

export default async function ProfileEditPage() {
  // Check authentication and redirect if not authenticated
  const auth = await requireAuthForPage()
  const { user } = auth

  // Get profile for authenticated user
  const profile = await profileService.getProfileByUserId(user.id)

  if (!profile) {
    // If user doesn't have a profile, redirect to home
    redirect('/')
  }

  return <ProfileEditForm profile={profile} />
}

