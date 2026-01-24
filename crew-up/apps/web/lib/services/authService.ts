import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export interface SignInCredentials {
  email: string
  password: string
}

export interface AuthResult {
  user: User
  session: {
    access_token: string
    refresh_token: string
  }
}

export class AuthService {
  /**
   * Get Supabase client (lazy initialization)
   */
  private get supabase() {
    return createClient()
  }

  /**
   * Sign in user with email and password
   */
  async signIn(credentials: SignInCredentials): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })

    if (error) {
      // Map Supabase auth errors to application errors
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('INVALID_CREDENTIALS')
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('EMAIL_NOT_CONFIRMED')
      }
      throw new Error(`Authentication failed: ${error.message}`)
    }

    if (!data.user || !data.session) {
      throw new Error('Authentication failed: No user or session returned')
    }

    return {
      user: data.user,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    }
  }

  /**
   * Sign out the current user
   */
  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut()

    if (error) {
      throw new Error(`Sign out failed: ${error.message}`)
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser()

    if (error) {
      // If error is "JWT expired" or similar, user is not authenticated
      return null
    }

    return user
  }

  /**
   * Get the current session
   */
  async getSession(): Promise<{ access_token: string; refresh_token: string } | null> {
    const {
      data: { session },
      error,
    } = await this.supabase.auth.getSession()

    if (error || !session) {
      return null
    }

    return {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }
  }
}

// Export singleton instance
export const authService = new AuthService()

