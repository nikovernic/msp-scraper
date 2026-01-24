import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ClaimService } from '@/lib/services/claimService'

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase),
}))

describe('ClaimService', () => {
  let claimService: ClaimService

  beforeEach(() => {
    claimService = new ClaimService()
    vi.clearAllMocks()
  })

  it('should create claim service instance', () => {
    expect(claimService).toBeInstanceOf(ClaimService)
  })

  it('should have generateClaimToken method', () => {
    expect(typeof claimService.generateClaimToken).toBe('function')
  })

  it('should have saveClaimToken method', () => {
    expect(typeof claimService.saveClaimToken).toBe('function')
  })

  describe('generateClaimToken', () => {
    it('should generate a token with 32+ characters', () => {
      const token = claimService.generateClaimToken()
      expect(token.length).toBeGreaterThanOrEqual(32)
    })

    it('should generate unique tokens', () => {
      const token1 = claimService.generateClaimToken()
      const token2 = claimService.generateClaimToken()
      expect(token1).not.toBe(token2)
    })

    it('should generate URL-safe tokens (no +, /, or = characters)', () => {
      const token = claimService.generateClaimToken()
      expect(token).not.toContain('+')
      expect(token).not.toContain('/')
      expect(token).not.toContain('=')
    })

    it('should generate tokens with consistent length', () => {
      const tokens = Array.from({ length: 10 }, () =>
        claimService.generateClaimToken()
      )
      const lengths = tokens.map((t) => t.length)
      const uniqueLengths = new Set(lengths)
      // All tokens should have the same length (base64url encoding of 32 bytes = 43 chars)
      expect(uniqueLengths.size).toBe(1)
      expect(lengths[0]).toBe(43) // 32 bytes * 4/3 base64 ratio, rounded up
    })
  })

  describe('saveClaimToken', () => {
    it('should save token with 30-day expiration', async () => {
      const profileId = 'profile-123'
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: { claim_token: 'test-token-123' },
                error: null,
              })
            ),
          })),
        })),
      }))

      mockSupabase.from = vi.fn(() => ({
        update: mockUpdate,
      }))

      const token = await claimService.saveClaimToken(profileId)

      expect(token).toBeDefined()
      expect(token.length).toBeGreaterThanOrEqual(32)
      expect(mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          claim_token: expect.any(String),
          claim_token_expires_at: expect.any(String),
        })
      )

      // Verify expiration date is approximately 30 days from now
      const updateCall = mockUpdate.mock.calls[0][0]
      const expirationDate = new Date(updateCall.claim_token_expires_at)
      const now = new Date()
      const daysDiff =
        (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      expect(daysDiff).toBeCloseTo(30, 0) // Within 1 day tolerance
    })

    it('should retry with new token on uniqueness constraint violation', async () => {
      const profileId = 'profile-123'
      let attemptCount = 0

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => {
              attemptCount++
              if (attemptCount === 1) {
                // First attempt: uniqueness violation
                return Promise.resolve({
                  data: null,
                  error: { code: '23505', message: 'duplicate key value' },
                })
              }
              // Second attempt: success
              return Promise.resolve({
                data: { claim_token: 'new-token-456' },
                error: null,
              })
            }),
          })),
        })),
      }))

      mockSupabase.from = vi.fn(() => ({
        update: mockUpdate,
      }))

      const token = await claimService.saveClaimToken(profileId)

      expect(token).toBeDefined()
      expect(mockUpdate).toHaveBeenCalledTimes(2) // Retried once
    })

    it('should throw error after max retry attempts', async () => {
      const profileId = 'profile-123'

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { code: '23505', message: 'duplicate key value' },
              })
            ),
          })),
        })),
      }))

      mockSupabase.from = vi.fn(() => ({
        update: mockUpdate,
      }))

      await expect(claimService.saveClaimToken(profileId)).rejects.toThrow(
        'Failed to generate unique claim token after 5 attempts'
      )

      expect(mockUpdate).toHaveBeenCalledTimes(5) // Max attempts
    })

    it('should throw error on other database errors', async () => {
      const profileId = 'profile-123'

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: 'Database connection error' },
              })
            ),
          })),
        })),
      }))

      mockSupabase.from = vi.fn(() => ({
        update: mockUpdate,
      }))

      await expect(claimService.saveClaimToken(profileId)).rejects.toThrow(
        'Failed to save claim token: Database connection error'
      )
    })

    it('should update correct profile by ID', async () => {
      const profileId = 'profile-123'

      const mockEq = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: { claim_token: 'test-token' },
              error: null,
            })
          ),
        })),
      }))

      const mockUpdate = vi.fn(() => ({
        eq: mockEq,
      }))

      mockSupabase.from = vi.fn(() => ({
        update: mockUpdate,
      }))

      await claimService.saveClaimToken(profileId)

      expect(mockEq).toHaveBeenCalledWith('id', profileId)
    })
  })

  describe('validateClaimToken', () => {
    it('should return profile for valid token', async () => {
      const mockProfile = {
        id: 'profile-123',
        claim_token: 'valid-token',
        claim_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_claimed: false,
        user_id: null,
      }

      const mockEq = vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: mockProfile,
            error: null,
          })
        ),
      }))

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: mockEq,
        })),
      }))

      const result = await claimService.validateClaimToken('valid-token')

      expect(result).toEqual(mockProfile)
      expect(mockEq).toHaveBeenCalledWith('claim_token', 'valid-token')
    })

    it('should return null for non-existent token', async () => {
      const mockEq = vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: { code: 'PGRST116', message: 'Not found' },
          })
        ),
      }))

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: mockEq,
        })),
      }))

      const result = await claimService.validateClaimToken('invalid-token')

      expect(result).toBeNull()
    })

    it('should return null for already claimed profile', async () => {
      const mockProfile = {
        id: 'profile-123',
        claim_token: 'valid-token',
        claim_token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_claimed: true,
        user_id: 'user-123',
      }

      const mockEq = vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: mockProfile,
            error: null,
          })
        ),
      }))

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: mockEq,
        })),
      }))

      const result = await claimService.validateClaimToken('valid-token')

      expect(result).toBeNull()
    })

    it('should return null for expired token', async () => {
      const mockProfile = {
        id: 'profile-123',
        claim_token: 'expired-token',
        claim_token_expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        is_claimed: false,
        user_id: null,
      }

      const mockEq = vi.fn(() => ({
        single: vi.fn(() =>
          Promise.resolve({
            data: mockProfile,
            error: null,
          })
        ),
      }))

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: mockEq,
        })),
      }))

      const result = await claimService.validateClaimToken('expired-token')

      expect(result).toBeNull()
    })
  })

  describe('claimProfile', () => {
    it('should claim profile and link to user account', async () => {
      const profileId = 'profile-123'
      const userId = 'user-456'
      const mockClaimedProfile = {
        id: profileId,
        user_id: userId,
        is_claimed: true,
        claim_token: null,
        claim_token_expires_at: null,
      }

      const mockEq = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: mockClaimedProfile,
              error: null,
            })
          ),
        })),
      }))

      const mockUpdate = vi.fn(() => ({
        eq: mockEq,
      }))

      mockSupabase.from = vi.fn(() => ({
        update: mockUpdate,
      }))

      const result = await claimService.claimProfile(profileId, userId)

      expect(result).toEqual(mockClaimedProfile)
      expect(mockUpdate).toHaveBeenCalledWith({
        user_id: userId,
        is_claimed: true,
        claim_token: null,
        claim_token_expires_at: null,
      })
      expect(mockEq).toHaveBeenCalledWith('id', profileId)
    })

    it('should throw error on database failure', async () => {
      const mockEq = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: null,
              error: { message: 'Database error' },
            })
          ),
        })),
      }))

      const mockUpdate = vi.fn(() => ({
        eq: mockEq,
      }))

      mockSupabase.from = vi.fn(() => ({
        update: mockUpdate,
      }))

      await expect(
        claimService.claimProfile('profile-123', 'user-456')
      ).rejects.toThrow('Failed to claim profile: Database error')
    })
  })
})

