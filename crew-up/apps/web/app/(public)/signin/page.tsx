import { redirect } from 'next/navigation'
import { authService } from '@/lib/services/authService'
import { SignInForm } from '@/components/auth/SignInForm'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | Crew Up',
  description: 'Sign in to your Crew Up account to manage your profile.',
  robots: 'noindex, nofollow', // Don't index sign-in page
}

export default async function SignInPage() {
  // Check if user is already authenticated
  const user = await authService.getCurrentUser()

  if (user) {
    // Redirect authenticated users to profile edit page
    redirect('/crew/profile/edit')
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto">
        <SignInForm />
      </div>
    </main>
  )
}

