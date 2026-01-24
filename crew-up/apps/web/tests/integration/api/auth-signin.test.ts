import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/auth/signin/route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/services/authService', () => ({
  authService: {
    signIn: vi.fn(),
  },
}))

import { authService } from '@/lib/services/authService'

describe('POST /api/auth/signin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should sign in user successfully with valid credentials', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    }

    const mockAuthResult = {
      user: {
        id: 'user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      },
      session: {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      },
    }

    vi.mocked(authService.signIn).mockResolvedValue(mockAuthResult)

    const request = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Sign-in successful')
    expect(data.user).toEqual(mockUser)
    expect(data.redirectUrl).toBe('/crew/profile/edit')
    expect(authService.signIn).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })

  it('should return 401 for invalid credentials', async () => {
    vi.mocked(authService.signIn).mockRejectedValue(
      new Error('INVALID_CREDENTIALS')
    )

    const request = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error.code).toBe('INVALID_CREDENTIALS')
    expect(data.error.message).toBe('Invalid email or password')
  })

  it('should return 401 for unconfirmed email', async () => {
    vi.mocked(authService.signIn).mockRejectedValue(
      new Error('EMAIL_NOT_CONFIRMED')
    )

    const request = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error.code).toBe('EMAIL_NOT_CONFIRMED')
    expect(data.error.message).toBe(
      'Please confirm your email address before signing in'
    )
  })

  it('should return 404 for account not found', async () => {
    vi.mocked(authService.signIn).mockRejectedValue(
      new Error('User does not exist')
    )

    const request = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'nonexistent@example.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error.code).toBe('ACCOUNT_NOT_FOUND')
    expect(data.error.message).toBe('Invalid email or password')
  })

  it('should return 400 for invalid email format', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(authService.signIn).not.toHaveBeenCalled()
  })

  it('should return 400 for empty password', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: '',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(authService.signIn).not.toHaveBeenCalled()
  })

  it('should return 400 for missing email', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(authService.signIn).not.toHaveBeenCalled()
  })

  it('should return 400 for missing password', async () => {
    const request = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(authService.signIn).not.toHaveBeenCalled()
  })

  it('should handle other auth errors gracefully', async () => {
    vi.mocked(authService.signIn).mockRejectedValue(
      new Error('Network error')
    )

    const request = new NextRequest('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
  })
})

