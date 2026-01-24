import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/auth/signout/route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/services/authService', () => ({
  authService: {
    signOut: vi.fn(),
  },
}))

import { authService } from '@/lib/services/authService'

describe('POST /api/auth/signout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should sign out user successfully', async () => {
    vi.mocked(authService.signOut).mockResolvedValue(undefined)

    const request = new NextRequest('http://localhost:3000/api/auth/signout', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Sign-out successful')
    expect(data.redirectUrl).toBe('/')
    expect(authService.signOut).toHaveBeenCalled()
  })

  it('should handle sign out errors gracefully', async () => {
    vi.mocked(authService.signOut).mockRejectedValue(
      new Error('Sign out failed')
    )

    const request = new NextRequest('http://localhost:3000/api/auth/signout', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
  })
})

