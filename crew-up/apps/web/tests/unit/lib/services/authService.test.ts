import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthService } from '@/lib/services/authService'
import type { User } from '@supabase/supabase-js'

// Mock Supabase client
const mockAuth = {
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  getSession: vi.fn(),
}

const mockSupabase = {
  auth: mockAuth,
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('AuthService', () => {
  let authService: AuthService

  beforeEach(() => {
    authService = new AuthService()
    vi.clearAllMocks()
  })

  it('should create auth service instance', () => {
    expect(authService).toBeInstanceOf(AuthService)
  })

  it('should have signIn method', () => {
    expect(typeof authService.signIn).toBe('function')
  })

  it('should have signOut method', () => {
    expect(typeof authService.signOut).toBe('function')
  })

  it('should have getCurrentUser method', () => {
    expect(typeof authService.getCurrentUser).toBe('function')
  })

  it('should have getSession method', () => {
    expect(typeof authService.getSession).toBe('function')
  })

  describe('signIn', () => {
    it('should sign in user with valid credentials', async () => {
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

      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: mockUser,
          session: mockSession,
        },
        error: null,
      })

      const result = await authService.signIn({
        email: 'test@example.com',
        password: 'password123',
      })

      expect(result.user).toEqual(mockUser)
      expect(result.session.access_token).toBe('access-token')
      expect(result.session.refresh_token).toBe('refresh-token')
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })

    it('should throw INVALID_CREDENTIALS error for invalid credentials', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      })

      await expect(
        authService.signIn({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
      ).rejects.toThrow('INVALID_CREDENTIALS')
    })

    it('should throw error for email not confirmed', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Email not confirmed' },
      })

      await expect(
        authService.signIn({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('EMAIL_NOT_CONFIRMED')
    })

    it('should throw error when no user or session returned', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: null,
      })

      await expect(
        authService.signIn({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Authentication failed: No user or session returned')
    })

    it('should throw error for other auth errors', async () => {
      mockAuth.signInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Network error' },
      })

      await expect(
        authService.signIn({
          email: 'test@example.com',
          password: 'password123',
        })
      ).rejects.toThrow('Authentication failed: Network error')
    })
  })

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      mockAuth.signOut.mockResolvedValueOnce({
        error: null,
      })

      await authService.signOut()

      expect(mockAuth.signOut).toHaveBeenCalled()
    })

    it('should throw error when sign out fails', async () => {
      mockAuth.signOut.mockResolvedValueOnce({
        error: { message: 'Sign out failed' },
      })

      await expect(authService.signOut()).rejects.toThrow(
        'Sign out failed: Sign out failed'
      )
    })
  })

  describe('getCurrentUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      }

      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      })

      const user = await authService.getCurrentUser()

      expect(user).toEqual(mockUser)
      expect(mockAuth.getUser).toHaveBeenCalled()
    })

    it('should return null when not authenticated', async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'JWT expired' },
      })

      const user = await authService.getCurrentUser()

      expect(user).toBeNull()
    })

    it('should return null when error occurs', async () => {
      mockAuth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: { message: 'Session expired' },
      })

      const user = await authService.getCurrentUser()

      expect(user).toBeNull()
    })
  })

  describe('getSession', () => {
    it('should return session when available', async () => {
      const mockSession = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        expires_at: Date.now() + 3600000,
        token_type: 'bearer',
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      }

      mockAuth.getSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      })

      const session = await authService.getSession()

      expect(session).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      })
      expect(mockAuth.getSession).toHaveBeenCalled()
    })

    it('should return null when no session', async () => {
      mockAuth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      })

      const session = await authService.getSession()

      expect(session).toBeNull()
    })

    it('should return null when error occurs', async () => {
      mockAuth.getSession.mockResolvedValueOnce({
        data: { session: null },
        error: { message: 'Session error' },
      })

      const session = await authService.getSession()

      expect(session).toBeNull()
    })
  })
})

