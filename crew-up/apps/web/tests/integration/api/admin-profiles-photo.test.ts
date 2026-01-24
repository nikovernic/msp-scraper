import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/admin/profiles/[id]/photo/route'
import { NextRequest } from 'next/server'
import type { Profile } from '@crew-up/shared'

// Mock dependencies
vi.mock('@/lib/middleware/auth', () => ({
  requireAdmin: vi.fn(),
}))

vi.mock('@/lib/services/profileService', () => ({
  profileService: {
    getProfileById: vi.fn(),
    updateProfile: vi.fn(),
  },
}))

// Use vi.hoisted to create mocks before the mock factory
const { mockStorage, mockSupabase } = vi.hoisted(() => {
  const mockStorage = {
    upload: vi.fn(),
    getPublicUrl: vi.fn(),
  }

  const mockSupabase = {
    from: vi.fn(() => ({
      storage: {
        from: vi.fn(() => mockStorage),
      },
    })),
    storage: {
      from: vi.fn(() => mockStorage),
    },
  }

  return { mockStorage, mockSupabase }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

import { requireAdmin } from '@/lib/middleware/auth'
import { profileService } from '@/lib/services/profileService'

describe('POST /api/admin/profiles/[id]/photo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should upload photo with valid image file', async () => {
    // Mock admin authentication
    vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } } as any)

    // Mock profile exists
    const mockProfile: Profile = {
      id: 'profile-1',
      name: 'John Doe',
      primary_role: 'Gaffer',
      primary_location_city: 'Nashville',
      primary_location_state: 'TN',
      contact_email: 'john@example.com',
      slug: 'john-doe-gaffer-nashville',
      is_claimed: false,
      claim_token: null,
      claim_token_expires_at: null,
      bio: null,
      photo_url: null,
      contact_phone: null,
      portfolio_url: null,
      website: null,
      instagram_url: null,
      vimeo_url: null,
      union_status: null,
      years_experience: null,
      secondary_roles: null,
      additional_markets: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    vi.mocked(profileService.getProfileById).mockResolvedValue(mockProfile)

    // Mock storage upload
    vi.mocked(mockStorage.upload).mockResolvedValue({
      data: { path: 'profiles/profile-1/uuid.jpg' },
      error: null,
    })

    // Mock public URL
    vi.mocked(mockStorage.getPublicUrl).mockReturnValue({
      data: { publicUrl: 'https://storage.supabase.co/profile-photos/profiles/profile-1/uuid.jpg' },
    })

    // Mock profile update
    const updatedProfile = { ...mockProfile, photo_url: 'https://storage.supabase.co/profile-photos/profiles/profile-1/uuid.jpg' }
    vi.mocked(profileService.updateProfile).mockResolvedValue(updatedProfile as Profile)

    // Create a valid JPEG image buffer (magic bytes: FF D8 FF)
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
    const blob = new Blob([jpegBuffer], { type: 'image/jpeg' })
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' })
    
    // Mock arrayBuffer() method for the file - create ArrayBuffer from buffer
    const arrayBuffer = jpegBuffer.buffer.slice(jpegBuffer.byteOffset, jpegBuffer.byteOffset + jpegBuffer.byteLength)
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(arrayBuffer),
      writable: true,
    })

    const formData = new FormData()
    formData.append('photo', file)

    const request = new NextRequest('http://localhost:3000/api/admin/profiles/profile-1/photo', {
      method: 'POST',
      body: formData,
    })

    // Mock formData() method since NextRequest doesn't handle it properly in test environment
    vi.spyOn(request, 'formData').mockResolvedValue(formData)

    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.photo_url).toBe('https://storage.supabase.co/profile-photos/profiles/profile-1/uuid.jpg')
    expect(mockStorage.upload).toHaveBeenCalled()
    expect(profileService.updateProfile).toHaveBeenCalled()
  })

  it('should return 400 when file exceeds size limit', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } } as any)
    vi.mocked(profileService.getProfileById).mockResolvedValue({
      id: 'profile-1',
      name: 'John Doe',
    } as any)

    // Create a file that exceeds 5MB
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024) // 6MB
    const blob = new Blob([largeBuffer], { type: 'image/jpeg' })
    const file = new File([blob], 'large-photo.jpg', { type: 'image/jpeg' })

    const formData = new FormData()
    formData.append('photo', file)

    const request = new NextRequest('http://localhost:3000/api/admin/profiles/profile-1/photo', {
      method: 'POST',
      body: formData,
    })

    // Mock formData() method since NextRequest doesn't handle it properly in test environment
    vi.spyOn(request, 'formData').mockResolvedValue(formData)

    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toContain('5MB')
  })

  it('should return 400 for invalid file type', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } } as any)
    vi.mocked(profileService.getProfileById).mockResolvedValue({
      id: 'profile-1',
      name: 'John Doe',
    } as any)

    // Create a PDF file (not an image)
    const pdfBuffer = Buffer.from('%PDF-1.4')
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
    const file = new File([blob], 'document.pdf', { type: 'application/pdf' })

    const formData = new FormData()
    formData.append('photo', file)

    const request = new NextRequest('http://localhost:3000/api/admin/profiles/profile-1/photo', {
      method: 'POST',
      body: formData,
    })

    // Mock formData() method since NextRequest doesn't handle it properly in test environment
    vi.spyOn(request, 'formData').mockResolvedValue(formData)

    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toContain('Invalid file type')
  })

  it('should return 400 for invalid image (wrong magic bytes)', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } } as any)
    vi.mocked(profileService.getProfileById).mockResolvedValue({
      id: 'profile-1',
      name: 'John Doe',
    } as any)

    // Create a file with .jpg extension but wrong magic bytes
    const fakeImageBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00])
    const blob = new Blob([fakeImageBuffer], { type: 'image/jpeg' })
    const file = new File([blob], 'fake.jpg', { type: 'image/jpeg' })
    
    // Mock arrayBuffer() method for the file - create ArrayBuffer from buffer
    const arrayBuffer = fakeImageBuffer.buffer.slice(fakeImageBuffer.byteOffset, fakeImageBuffer.byteOffset + fakeImageBuffer.byteLength)
    Object.defineProperty(file, 'arrayBuffer', {
      value: vi.fn().mockResolvedValue(arrayBuffer),
      writable: true,
    })

    const formData = new FormData()
    formData.append('photo', file)

    const request = new NextRequest('http://localhost:3000/api/admin/profiles/profile-1/photo', {
      method: 'POST',
      body: formData,
    })

    // Mock formData() method since NextRequest doesn't handle it properly in test environment
    vi.spyOn(request, 'formData').mockResolvedValue(formData)

    const response = await POST(request, { params: { id: 'profile-1' } })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toContain('not a valid image')
  })
})
