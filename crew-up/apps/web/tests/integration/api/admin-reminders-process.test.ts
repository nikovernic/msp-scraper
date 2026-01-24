import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/admin/reminders/process/route'
import { NextRequest, NextResponse } from 'next/server'

// Mock dependencies
vi.mock('@/lib/middleware/auth', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/services/reminderProcessor', () => ({
  reminderProcessor: {
    processReminders: vi.fn(),
  },
}))

import { requireAdmin } from '@/lib/middleware/auth'
import { reminderProcessor } from '@/lib/services/reminderProcessor'

describe('POST /api/admin/reminders/process', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should process reminders successfully', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: 'admin-1' },
      supabase: {} as any,
    })

    // Mock reminder processing
    vi.mocked(reminderProcessor.processReminders).mockResolvedValue({
      totalProcessed: 5,
      successful: 4,
      failed: 1,
      errors: [{ profileId: 'profile-1', error: 'Email send failed' }],
    })

    // Create request
    const request = new NextRequest('http://localhost:3000/api/admin/reminders/process', {
      method: 'POST',
    })

    // Call handler
    const response = await POST(request)
    const data = await response.json()

    // Assertions
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.result.totalProcessed).toBe(5)
    expect(data.result.successful).toBe(4)
    expect(data.result.failed).toBe(1)
    expect(requireAdmin).toHaveBeenCalled()
    expect(reminderProcessor.processReminders).toHaveBeenCalled()
  })

  it('should return 401 if not authenticated', async () => {
    // Mock authentication failure
    vi.mocked(requireAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    )

    const request = new NextRequest('http://localhost:3000/api/admin/reminders/process', {
      method: 'POST',
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
    expect(reminderProcessor.processReminders).not.toHaveBeenCalled()
  })

  it('should return 403 if not admin', async () => {
    // Mock non-admin user
    vi.mocked(requireAdmin).mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    )

    const request = new NextRequest('http://localhost:3000/api/admin/reminders/process', {
      method: 'POST',
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
    expect(reminderProcessor.processReminders).not.toHaveBeenCalled()
  })

  it('should handle processing errors', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({
      user: { id: 'admin-1' },
      supabase: {} as any,
    })

    // Mock processing error
    vi.mocked(reminderProcessor.processReminders).mockRejectedValue(
      new Error('Database error')
    )

    const request = new NextRequest('http://localhost:3000/api/admin/reminders/process', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })
})

