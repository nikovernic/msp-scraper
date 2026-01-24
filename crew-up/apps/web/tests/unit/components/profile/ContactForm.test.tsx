import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactForm } from '@/components/profile/ContactForm'

// Mock fetch
global.fetch = vi.fn()

describe('ContactForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render contact form with all fields', () => {
    render(<ContactForm profileSlug="crew-member-gaffer-nashville" />)

    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/your phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/shoot dates/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument()
  })

  it('should show validation errors for required fields', async () => {
    const user = userEvent.setup()
    render(<ContactForm profileSlug="crew-member-gaffer-nashville" />)

    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/producer name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/message is required/i)).toBeInTheDocument()
    })
  })

  it('should validate email format', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockClear()
    
    render(<ContactForm profileSlug="crew-member-gaffer-nashville" />)

    // Fill required fields first
    await user.type(screen.getByLabelText(/your name/i), 'John Producer')
    
    // Enter invalid email
    const emailInput = screen.getByLabelText(/your email/i)
    await user.clear(emailInput)
    await user.type(emailInput, 'invalid-email')
    
    await user.type(screen.getByLabelText(/message/i), 'Hello')
    
    // Submit form to trigger validation
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)

    // React Hook Form should prevent submission when validation fails
    // Wait a bit to ensure validation has run
    await waitFor(() => {
      // Form should not have submitted (no fetch call)
      expect(mockFetch).not.toHaveBeenCalled()
    }, { timeout: 1000 })

    // Check for error message - it should appear after form validation
    await waitFor(() => {
      const errorElement = screen.queryByText(/invalid email address/i) ||
                          document.getElementById('producer_email-error')
      expect(errorElement).toBeTruthy()
    }, { timeout: 2000 })
  })

  it('should validate message length (max 500 chars)', async () => {
    const user = userEvent.setup()
    render(<ContactForm profileSlug="crew-member-gaffer-nashville" />)

    const messageInput = screen.getByLabelText(/message/i)
    const longMessage = 'a'.repeat(501)
    await user.type(messageInput, longMessage)
    
    // Submit form to trigger validation
    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/message must be 500 characters or less/i)).toBeInTheDocument()
    })
  })

  it('should submit form successfully', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Contact inquiry submitted successfully',
        inquiryId: 'inquiry-123',
      }),
    } as Response)

    render(<ContactForm profileSlug="crew-member-gaffer-nashville" />)

    await user.type(screen.getByLabelText(/your name/i), 'John Producer')
    await user.type(screen.getByLabelText(/your email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/message/i), 'Interested in working together')

    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/profiles/crew-member-gaffer-nashville/contact',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            producer_name: 'John Producer',
            producer_email: 'john@example.com',
            producer_phone: '',
            message: 'Interested in working together',
            shoot_dates: '',
          }),
        })
      )
    })

    await waitFor(() => {
      expect(screen.getByText(/your message has been sent successfully/i)).toBeInTheDocument()
    })

    // Form should be reset
    expect(screen.getByLabelText(/your name/i)).toHaveValue('')
  })

  it('should handle API error response', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request parameters',
        },
      }),
    } as Response)

    render(<ContactForm profileSlug="crew-member-gaffer-nashville" />)

    await user.type(screen.getByLabelText(/your name/i), 'John Producer')
    await user.type(screen.getByLabelText(/your email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/message/i), 'Hello')

    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/invalid request parameters/i)).toBeInTheDocument()
    })
  })

  it('should handle network errors', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(<ContactForm profileSlug="crew-member-gaffer-nashville" />)

    await user.type(screen.getByLabelText(/your name/i), 'John Producer')
    await user.type(screen.getByLabelText(/your email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/message/i), 'Hello')

    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/an error occurred. please try again later/i)).toBeInTheDocument()
    })
  })

  it('should show loading state during submission', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.mocked(fetch)
    let resolvePromise: (value: Response) => void
    const pendingPromise = new Promise<Response>((resolve) => {
      resolvePromise = resolve
    })
    mockFetch.mockReturnValueOnce(pendingPromise)

    render(<ContactForm profileSlug="crew-member-gaffer-nashville" />)

    await user.type(screen.getByLabelText(/your name/i), 'John Producer')
    await user.type(screen.getByLabelText(/your email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/message/i), 'Hello')

    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)

    expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument()
    expect(submitButton).toBeDisabled()

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /sending/i })).not.toBeInTheDocument()
    })
  })

  it('should submit with optional fields', async () => {
    const user = userEvent.setup()
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)

    render(<ContactForm profileSlug="crew-member-gaffer-nashville" />)

    await user.type(screen.getByLabelText(/your name/i), 'John Producer')
    await user.type(screen.getByLabelText(/your email/i), 'john@example.com')
    await user.type(screen.getByLabelText(/your phone/i), '555-1234')
    await user.type(screen.getByLabelText(/message/i), 'Hello')
    await user.type(screen.getByLabelText(/shoot dates/i), 'March 15-20, 2024')

    const submitButton = screen.getByRole('button', { name: /send message/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/profiles/crew-member-gaffer-nashville/contact',
        expect.objectContaining({
          body: JSON.stringify({
            producer_name: 'John Producer',
            producer_email: 'john@example.com',
            producer_phone: '555-1234',
            message: 'Hello',
            shoot_dates: 'March 15-20, 2024',
          }),
        })
      )
    })
  })
})

