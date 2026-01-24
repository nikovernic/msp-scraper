import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/admin/profiles/[id]/credits/route'
import { PUT, DELETE } from '@/app/api/admin/profiles/[id]/credits/[creditId]/route'
import { NextRequest } from 'next/server'
import type { Credit } from '@crew-up/shared'

// Mock dependencies
vi.mock('@/lib/middleware/auth', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/services/profileService', () => ({
  profileService: {
    getProfileById: vi.fn(),
  },
}))

// Use vi.hoisted to create mocks before the mock factory
const { mockChain, mockSupabase } = vi.hoisted(() => {
  const mockChain = {
    insert: vi.fn(),
    update: vi.fn(),
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    delete: vi.fn(),
  }

  // Set up chain returns
  mockChain.insert.mockReturnValue(mockChain)
  mockChain.update.mockReturnValue(mockChain)
  mockChain.select.mockReturnValue(mockChain)
  mockChain.eq.mockReturnValue(mockChain)
  mockChain.delete.mockReturnValue(mockChain)

  const mockSupabase = {
    from: vi.fn(() => mockChain),
  }

  return { mockChain, mockSupabase }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

import { requireAdmin } from '@/lib/middleware/auth'
import { profileService } from '@/lib/services/profileService'

describe('POST /api/admin/profiles/[id]/credits', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a credit for valid profile', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } } as any)

    // Mock profile exists
    vi.mocked(profileService.getProfileById).mockResolvedValue({
      id: 'profile-1',
      name: 'John Doe',
    } as any)

    // Mock credit creation
    const mockCredit: Credit = {
      id: 'credit-1',
      profile_id: 'profile-1',
      project_title: 'Test Project',
      role: 'Gaffer',
      project_type: 'commercial',
      year: 2024,
      production_company: null,
      director: null,
      display_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    vi.mocked(mockChain.single).mockResolvedValueOnce({
      data: mockCredit,
      error: null,
    } as any)

    const request = new NextRequest('http://localhost:3000/api/admin/profiles/profile-1/credits', {
      method: 'POST',
      body: JSON.stringify({
        project_title: 'Test Project',
        role: 'Gaffer',
        project_type: 'commercial',
        year: 2024,
      }),
    })

    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('credit-1')
    expect(data.project_title).toBe('Test Project')
    expect(requireAdmin).toHaveBeenCalled()
    expect(profileService.getProfileById).toHaveBeenCalledWith('profile-1')
  })

  it('should return 404 when profile does not exist', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } } as any)
    vi.mocked(profileService.getProfileById).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/admin/profiles/invalid-id/credits', {
      method: 'POST',
      body: JSON.stringify({
        project_title: 'Test Project',
        role: 'Gaffer',
        project_type: 'commercial',
        year: 2024,
      }),
    })

    const response = await POST(request, { params: { id: 'invalid-id' } })

    expect(response.status).toBe(404)
  })
})

describe('PUT /api/admin/profiles/[id]/credits/[creditId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update a credit', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } } as any)
    vi.mocked(profileService.getProfileById).mockResolvedValue({
      id: 'profile-1',
      name: 'John Doe',
    } as any)

    const mockCredit: Credit = {
      id: 'credit-1',
      profile_id: 'profile-1',
      project_title: 'Updated Project',
      role: 'Gaffer',
      project_type: 'commercial',
      year: 2024,
      production_company: null,
      director: null,
      display_order: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    // Mock credit fetch (for verification)
    vi.mocked(mockChain.single).mockResolvedValueOnce({
      data: { id: 'credit-1', profile_id: 'profile-1' },
      error: null,
    } as any)
    // Mock credit update
    vi.mocked(mockChain.single).mockResolvedValueOnce({
      data: mockCredit,
      error: null,
    } as any)

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/credits/credit-1',
      {
        method: 'PUT',
        body: JSON.stringify({
          project_title: 'Updated Project',
        }),
      }
    )

    const response = await PUT(request, { params: { id: 'profile-1', creditId: 'credit-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.project_title).toBe('Updated Project')
  })
})

describe('DELETE /api/admin/profiles/[id]/credits/[creditId]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should delete a credit', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } } as any)
    vi.mocked(profileService.getProfileById).mockResolvedValue({
      id: 'profile-1',
      name: 'John Doe',
    } as any)

    // Mock credit fetch (for verification)
    vi.mocked(mockChain.single).mockResolvedValueOnce({
      data: { id: 'credit-1', profile_id: 'profile-1' },
      error: null,
    } as any)

    const request = new NextRequest(
      'http://localhost:3000/api/admin/profiles/profile-1/credits/credit-1',
      {
        method: 'DELETE',
      }
    )

    const response = await DELETE(request, { params: { id: 'profile-1', creditId: 'credit-1' } })

    expect(response.status).toBe(204)
  })
})
