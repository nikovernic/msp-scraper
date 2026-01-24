import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import SignInPage from '@/app/(public)/signin/page'

// Mock auth service
vi.mock('@/lib/services/authService', () => ({
  authService: {
    getCurrentUser: vi.fn(),
  },
}))

// Mock SignInForm component
vi.mock('@/components/auth/SignInForm', () => ({
  SignInForm: () => <div data-testid="signin-form">Sign In Form</div>,
}))

// Mock Next.js redirect
const mockRedirect = vi.fn()
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation')
  return {
    ...actual,
    redirect: (url: string) => {
      mockRedirect(url)
      throw new Error(`Redirect to ${url}`)
    },
  }
})

import { authService } from '@/lib/services/authService'

describe('Sign In Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedirect.mockClear()
  })

  it('should display sign-in form for unauthenticated users', async () => {
    vi.mocked(authService.getCurrentUser).mockResolvedValue(null)

    const page = await SignInPage()
    const { container } = render(page)

    expect(screen.getByTestId('signin-form')).toBeInTheDocument()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('should redirect authenticated users to profile edit page', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    }

    vi.mocked(authService.getCurrentUser).mockResolvedValue(mockUser as any)

    try {
      await SignInPage()
    } catch (error) {
      // Redirect throws an error, which is expected
      expect(mockRedirect).toHaveBeenCalledWith('/crew/profile/edit')
    }
  })
})

