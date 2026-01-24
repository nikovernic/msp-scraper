import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireAdmin, requireAuthForPage, getAuthUser } from '@/lib/middleware/auth'

// Mock Supabase client
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
}

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
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

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedirect.mockClear()
  })

  describe('requireAuth', () => {
    it('should return user and supabase when authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = new NextRequest('http://localhost:3000/api/test')
      const result = await requireAuth(request)

      expect(result).toEqual({
        user: mockUser,
        supabase: mockSupabase,
      })
    })

    it('should return 401 response when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/test')
      const result = await requireAuth(request)

      expect(result).toBeInstanceOf(NextResponse)
      expect(result.status).toBe(401)
      const json = await result.json()
      expect(json.error).toBe('Unauthorized')
    })

    it('should return 401 response when error occurs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      })

      const request = new NextRequest('http://localhost:3000/api/test')
      const result = await requireAuth(request)

      expect(result).toBeInstanceOf(NextResponse)
      expect(result.status).toBe(401)
    })
  })

  describe('requireAdmin', () => {
    it('should return user and supabase when user is admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { role: 'admin' },
                error: null,
              })
            ),
          })),
        })),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/admin/test')
      const result = await requireAdmin(request)

      expect(result).toEqual({
        user: mockUser,
        supabase: mockSupabase,
      })
    })

    it('should return 403 response when user is not admin', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      mockSupabase.from.mockReturnValue({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { role: 'crew' },
                error: null,
              })
            ),
          })),
        })),
      } as any)

      const request = new NextRequest('http://localhost:3000/api/admin/test')
      const result = await requireAdmin(request)

      expect(result).toBeInstanceOf(NextResponse)
      expect(result.status).toBe(403)
      const json = await result.json()
      expect(json.error).toBe('Forbidden')
    })

    it('should return 401 response when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/admin/test')
      const result = await requireAdmin(request)

      expect(result).toBeInstanceOf(NextResponse)
      expect(result.status).toBe(401)
    })
  })

  describe('requireAuthForPage', () => {
    it('should return user and supabase when authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await requireAuthForPage()

      expect(result).toEqual({
        user: mockUser,
        supabase: mockSupabase,
      })
      expect(mockRedirect).not.toHaveBeenCalled()
    })

    it('should redirect to sign-in when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      try {
        await requireAuthForPage()
      } catch (error) {
        expect(mockRedirect).toHaveBeenCalledWith('/signin')
      }
    })

    it('should redirect to sign-in when error occurs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      })

      try {
        await requireAuthForPage()
      } catch (error) {
        expect(mockRedirect).toHaveBeenCalledWith('/signin')
      }
    })
  })

  describe('getAuthUser', () => {
    it('should return user and supabase when authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const result = await getAuthUser()

      expect(result).toEqual({
        user: mockUser,
        supabase: mockSupabase,
      })
    })

    it('should return null when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const result = await getAuthUser()

      expect(result).toBeNull()
    })

    it('should return null when error occurs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Auth error' },
      })

      const result = await getAuthUser()

      expect(result).toBeNull()
    })
  })
})
