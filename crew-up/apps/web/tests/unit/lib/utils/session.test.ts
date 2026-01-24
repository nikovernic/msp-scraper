import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSession, requireAuth, getCurrentUser } from '@/lib/utils/session'
import type { User } from '@supabase/supabase-js'

// Mock Supabase client
const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
}

const mockSession = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: mockUser,
}

const mockSupabase = {
  auth: {
    getSession: vi.fn(),
    getUser: vi.fn(),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

// Mock Next.js redirect
const mockRedirect = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url)
    throw new Error(`Redirect to ${url}`)
  },
}))

describe('Session Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedirect.mockClear()
  })

  describe('getSession', () => {
    it('should return session when available', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const session = await getSession()

      expect(session).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: mockUser,
      })
    })

    it('should return null when no session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      const session = await getSession()

      expect(session).toBeNull()
    })

    it('should return null when error occurs', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      })

      const session = await getSession()

      expect(session).toBeNull()
    })
  })

  describe('requireAuth', () => {
    it('should return session when authenticated', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      const session = await requireAuth()

      expect(session).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: mockUser,
      })
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should redirect to sign-in when no session', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      try {
        await requireAuth()
      } catch (error) {
        expect(mockRedirect).toHaveBeenCalledWith('/signin')
      }
    })

    it('should redirect to sign-in when error occurs', async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' },
      })

      try {
        await requireAuth()
      } catch (error) {
        expect(mockRedirect).toHaveBeenCalledWith('/signin')
      }
    })
  })

  describe('getCurrentUser', () => {
    it('should return user when authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const user = await getCurrentUser()

      expect(user).toEqual(mockUser)
    })

    it('should return null when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const user = await getCurrentUser()

      expect(user).toBeNull()
    })

    it('should return null when error occurs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      })

      const user = await getCurrentUser()

      expect(user).toBeNull()
    })
  })
})

