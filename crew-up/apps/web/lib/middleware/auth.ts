import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { redirect } from 'next/navigation'

export async function requireAuth(request: NextRequest) {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return { user, supabase }
}

export async function requireAdmin(request: NextRequest) {
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth

  const { user, supabase } = auth

  const { data: userData, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (error || userData?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    )
  }

  return { user, supabase }
}

/**
 * Check authentication status for server components
 * Redirects to sign-in page if not authenticated
 * Returns user and supabase client if authenticated
 */
export async function requireAuthForPage() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/signin')
  }

  return { user, supabase }
}

/**
 * Check if user is authenticated (non-blocking)
 * Returns user if authenticated, null otherwise
 */
export async function getAuthUser() {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return { user, supabase }
}

