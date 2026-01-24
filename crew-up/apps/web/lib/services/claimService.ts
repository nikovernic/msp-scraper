import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'
import type { Profile } from '@crew-up/shared'

export class ClaimService {
  /**
   * Get Supabase client (lazy initialization)
   */
  private get supabase() {
    return createClient()
  }

  /**
   * Generate a secure random claim token (32+ characters)
   * Uses cryptographically secure random bytes
   */
  generateClaimToken(): string {
    // Generate 32 random bytes (256 bits) and convert to base64url
    // Base64url encoding produces ~43 characters, which exceeds the 32+ char requirement
    const tokenBytes = randomBytes(32)
    // Convert to base64url (URL-safe base64)
    return tokenBytes
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  /**
   * Save claim token to profile with 30-day expiration
   * Handles uniqueness constraint violations by retrying with new token
   */
  async saveClaimToken(profileId: string): Promise<string> {
    const token = this.generateClaimToken()
    
    // Calculate expiration date (30 days from now)
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() + 30)

    // Attempt to save token (with retry logic for uniqueness violations)
    let attempts = 0
    const maxAttempts = 5
    let currentToken = token

    while (attempts < maxAttempts) {
      const { data, error } = await this.supabase
        .from('profiles')
        .update({
          claim_token: currentToken,
          claim_token_expires_at: expirationDate.toISOString(),
        })
        .eq('id', profileId)
        .select('claim_token')
        .single()

      if (error) {
        // Check if error is due to unique constraint violation
        if (error.code === '23505' || error.message.includes('unique')) {
          // Token collision - generate new token and retry
          attempts++
          if (attempts >= maxAttempts) {
            throw new Error(
              `Failed to generate unique claim token after ${maxAttempts} attempts`
            )
          }
          currentToken = this.generateClaimToken()
          continue
        }

        // Other database errors
        throw new Error(`Failed to save claim token: ${error.message}`)
      }

      // Success
      return currentToken
    }

    // Should never reach here, but TypeScript requires it
    throw new Error('Failed to save claim token: Maximum attempts exceeded')
  }

  /**
   * Validate claim token (check existence, expiration, and claim status)
   * Returns profile if token is valid, null if invalid/expired/already claimed
   */
  async validateClaimToken(token: string): Promise<Profile | null> {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('claim_token', token)
      .single()

    if (error || !profile) {
      // Token not found
      return null
    }

    // Check if already claimed
    if (profile.is_claimed) {
      return null
    }

    // Check if token is expired
    if (profile.claim_token_expires_at) {
      const expirationDate = new Date(profile.claim_token_expires_at)
      const now = new Date()
      if (expirationDate < now) {
        return null
      }
    }

    return profile as Profile
  }

  /**
   * Claim profile by linking it to a user account
   * Sets user_id, is_claimed = true, and clears claim token
   */
  async claimProfile(
    profileId: string,
    userId: string
  ): Promise<Profile> {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .update({
        user_id: userId,
        is_claimed: true,
        claim_token: null,
        claim_token_expires_at: null,
      })
      .eq('id', profileId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to claim profile: ${error.message}`)
    }

    return profile as Profile
  }
}

// Export singleton instance
export const claimService = new ClaimService()

