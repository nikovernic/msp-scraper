import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@crew-up/shared'

export type ReminderType = '7day' | '14day'

export interface ProfileNeedingReminder {
  profile: Profile
  reminderType: ReminderType
}

export class ReminderService {
  /**
   * Get Supabase client (lazy initialization)
   */
  private get supabase() {
    return createClient()
  }

  /**
   * Calculate days since token was created
   * Tokens expire 30 days after creation, so: days_since_creation = 30 - days_until_expiration
   */
  calculateDaysSinceTokenCreation(
    expiresAt: string | null
  ): number | null {
    if (!expiresAt) return null

    const expirationDate = new Date(expiresAt)
    const now = new Date()
    const daysUntilExpiration =
      (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

    // If expired, return null
    if (daysUntilExpiration < 0) return null

    // Days since creation = 30 - days until expiration
    return 30 - daysUntilExpiration
  }

  /**
   * Get profiles needing 7-day reminders
   * Profiles where:
   * - Token was created ~7 days ago (expires in ~23 days)
   * - Not claimed
   * - Valid token exists
   * - Not expired (within 30 days)
   * - Haven't already received 7-day reminder
   */
  async getProfilesNeeding7DayReminder(): Promise<Profile[]> {
    const now = new Date()

    // Query profiles where:
    // - Not claimed
    // - Has claim token
    // - Token not expired (expires_at > now)
    // - Hasn't received 7-day reminder yet
    const { data: profiles, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('is_claimed', false)
      .not('claim_token', 'is', null)
      .not('claim_token_expires_at', 'is', null)
      .gt('claim_token_expires_at', now.toISOString())
      .is('reminder_sent_at_7days', null)

    if (error) {
      throw new Error(
        `Failed to fetch profiles needing 7-day reminder: ${error.message}`
      )
    }

    // Filter to profiles where token was created approximately 7 days ago
    // Allow 1 day tolerance (±1 day)
    const filteredProfiles = (profiles || []).filter((profile) => {
      if (!profile.claim_token_expires_at) return false

      const daysSinceCreation =
        this.calculateDaysSinceTokenCreation(profile.claim_token_expires_at)
      if (daysSinceCreation === null) return false

      // Check if created between 6 and 8 days ago (7 days ± 1 day tolerance)
      return daysSinceCreation >= 6 && daysSinceCreation <= 8
    })

    return filteredProfiles as Profile[]
  }

  /**
   * Get profiles needing 14-day reminders
   * Profiles where:
   * - Token was created ~14 days ago (expires in ~16 days)
   * - Not claimed
   * - Valid token exists
   * - Not expired (within 30 days)
   * - Haven't already received 14-day reminder
   */
  async getProfilesNeeding14DayReminder(): Promise<Profile[]> {
    const now = new Date()

    // Query profiles where:
    // - Not claimed
    // - Has claim token
    // - Token not expired (expires_at > now)
    // - Hasn't received 14-day reminder yet
    const { data: profiles, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('is_claimed', false)
      .not('claim_token', 'is', null)
      .not('claim_token_expires_at', 'is', null)
      .gt('claim_token_expires_at', now.toISOString())
      .is('reminder_sent_at_14days', null)

    if (error) {
      throw new Error(
        `Failed to fetch profiles needing 14-day reminder: ${error.message}`
      )
    }

    // Filter to profiles where token was created approximately 14 days ago
    // Allow 1 day tolerance (±1 day)
    const filteredProfiles = (profiles || []).filter((profile) => {
      if (!profile.claim_token_expires_at) return false

      const daysSinceCreation =
        this.calculateDaysSinceTokenCreation(profile.claim_token_expires_at)
      if (daysSinceCreation === null) return false

      // Check if created between 13 and 15 days ago (14 days ± 1 day tolerance)
      return daysSinceCreation >= 13 && daysSinceCreation <= 15
    })

    return filteredProfiles as Profile[]
  }

  /**
   * Get all profiles needing reminders (both 7-day and 14-day)
   */
  async getProfilesNeedingReminder(): Promise<ProfileNeedingReminder[]> {
    const [profiles7Day, profiles14Day] = await Promise.all([
      this.getProfilesNeeding7DayReminder(),
      this.getProfilesNeeding14DayReminder(),
    ])

    const result: ProfileNeedingReminder[] = []

    // Add 7-day reminders
    for (const profile of profiles7Day) {
      result.push({ profile, reminderType: '7day' })
    }

    // Add 14-day reminders
    for (const profile of profiles14Day) {
      result.push({ profile, reminderType: '14day' })
    }

    return result
  }

  /**
   * Record that a reminder was sent for a profile
   */
  async recordReminderSent(
    profileId: string,
    reminderType: ReminderType
  ): Promise<void> {
    const updateData: {
      reminder_sent_at_7days?: string
      reminder_sent_at_14days?: string
    } = {}

    if (reminderType === '7day') {
      updateData.reminder_sent_at_7days = new Date().toISOString()
    } else {
      updateData.reminder_sent_at_14days = new Date().toISOString()
    }

    const { error } = await this.supabase
      .from('profiles')
      .update(updateData)
      .eq('id', profileId)

    if (error) {
      throw new Error(
        `Failed to record reminder sent: ${error.message}`
      )
    }
  }
}

// Export singleton instance
export const reminderService = new ReminderService()

