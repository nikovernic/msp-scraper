import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export interface Session {
  access_token: string
  refresh_token: string
  user: User
}

/**
 * Get the current session
 * Returns session if available, null otherwise
 */
export async function getSession(): Promise<Session | null> {
  const supabase = createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session) {
    return null
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: session.user,
  }
}

/**
 * Require authentication for protected routes (server components)
 * Redirects to sign-in page if not authenticated
 * Returns session if authenticated
 */
export async function requireAuth(): Promise<Session> {
  const supabase = createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session) {
    redirect('/signin')
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    user: session.user,
  }
}

/**
 * Get the current authenticated user
 * Returns user if authenticated, null otherwise
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

