import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClaimForm } from '@/components/profile/ClaimForm'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock fetch
global.fetch = vi.fn()

describe('ClaimForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPush.mockClear()
  })

  it('should render form with email and password fields', () => {
    render(<ClaimForm token="test-token-123" profileName="John Doe" />)

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /claim profile/i })).toBeInTheDocument()
  })

  it('should display profile name', () => {
    render(<ClaimForm token="test-token-123" profileName="John Doe" />)

    expect(screen.getByText(/john doe/i)).toBeInTheDocument()
  })

  it('should validate email format', async () => {
    const user = userEvent.setup()
    render(<ClaimForm token="test-token-123" profileName="John Doe" />)

    const emailInput = screen.getByLabelText(/email address/i)
    const submitButton = screen.getByRole('button', { name: /claim profile/i })

    await user.type(emailInput, 'invalid-email')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument()
    })
  })

  it('should validate password length', async () => {
    const user = userEvent.setup()
    render(<ClaimForm token="test-token-123" profileName="John Doe" />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password/i)
    const submitButton = screen.getByRole('button', { name: /claim profile/i })

    await user.type(emailInput, 'john@example.com')
    await user.type(passwordInput, 'short')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/password must be at least 8 characters/i)
      ).toBeInTheDocument()
    })
  })

  it('should validate password complexity', async () => {
    const user = userEvent.setup()
    render(<ClaimForm token="test-token-123" profileName="John Doe" />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password/i)
    const submitButton = screen.getByRole('button', { name: /claim profile/i })

    await user.type(emailInput, 'john@example.com')
    await user.type(passwordInput, 'alllowercase123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(
          /password must contain at least one lowercase letter, one uppercase letter, and one number/i
        )
      ).toBeInTheDocument()
    })
  })

  it('should submit form with valid data', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'Profile claimed successfully',
        profileId: 'profile-1',
        userId: 'user-123',
        redirectUrl: '/crew/john-doe-gaffer-nashville/edit',
      }),
    } as Response)

    render(<ClaimForm token="test-token-123" profileName="John Doe" />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password/i)
    const submitButton = screen.getByRole('button', { name: /claim profile/i })

    await user.type(emailInput, 'john@example.com')
    await user.type(passwordInput, 'SecurePass123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: 'test-token-123',
          email: 'john@example.com',
          password: 'SecurePass123',
        }),
      })
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/crew/john-doe-gaffer-nashville/edit')
    })
  })

  it('should display error message for invalid token', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired claim token',
        },
      }),
    } as Response)

    render(<ClaimForm token="invalid-token" profileName="John Doe" />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password/i)
    const submitButton = screen.getByRole('button', { name: /claim profile/i })

    await user.type(emailInput, 'john@example.com')
    await user.type(passwordInput, 'SecurePass123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/invalid or expired claim token/i)
      ).toBeInTheDocument()
    })
  })

  it('should display error message for expired token', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: {
          code: 'EXPIRED_TOKEN',
          message: 'This claim token has expired',
        },
      }),
    } as Response)

    render(<ClaimForm token="expired-token" profileName="John Doe" />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password/i)
    const submitButton = screen.getByRole('button', { name: /claim profile/i })

    await user.type(emailInput, 'john@example.com')
    await user.type(passwordInput, 'SecurePass123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/this claim token has expired/i)
      ).toBeInTheDocument()
    })
  })

  it('should display error message for email already exists', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: {
          code: 'EMAIL_EXISTS',
          message: 'An account with this email already exists',
        },
      }),
    } as Response)

    render(<ClaimForm token="test-token-123" profileName="John Doe" />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password/i)
    const submitButton = screen.getByRole('button', { name: /claim profile/i })

    await user.type(emailInput, 'existing@example.com')
    await user.type(passwordInput, 'SecurePass123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/an account with this email already exists/i)
      ).toBeInTheDocument()
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: async () => ({
                message: 'Success',
                redirectUrl: '/edit',
              }),
            } as Response)
          }, 100)
        })
    )

    render(<ClaimForm token="test-token-123" profileName="John Doe" />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password/i)
    const submitButton = screen.getByRole('button', { name: /claim profile/i })

    await user.type(emailInput, 'john@example.com')
    await user.type(passwordInput, 'SecurePass123')
    await user.click(submitButton)

    expect(screen.getByRole('button', { name: /claiming profile/i })).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('should handle network errors', async () => {
    const user = userEvent.setup()
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    render(<ClaimForm token="test-token-123" profileName="John Doe" />)

    const emailInput = screen.getByLabelText(/email address/i)
    const passwordInput = screen.getByLabelText(/^password/i)
    const submitButton = screen.getByRole('button', { name: /claim profile/i })

    await user.type(emailInput, 'john@example.com')
    await user.type(passwordInput, 'SecurePass123')
    await user.click(submitButton)

    await waitFor(() => {
      expect(
        screen.getByText(/an error occurred. please try again later/i)
      ).toBeInTheDocument()
    })
  })
})

