import { reminderService } from './reminderService'
import { emailService } from './emailService'
import type { Profile } from '@crew-up/shared'

export interface ReminderProcessingResult {
  totalProcessed: number
  successful: number
  failed: number
  errors: Array<{ profileId: string; error: string }>
}

export class ReminderProcessor {
  /**
   * Process and send reminders for all eligible profiles
   * Handles errors gracefully - continues processing other profiles if one fails
   */
  async processReminders(): Promise<ReminderProcessingResult> {
    const result: ReminderProcessingResult = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      errors: [],
    }

    try {
      // Get all profiles needing reminders
      const profilesNeedingReminders =
        await reminderService.getProfilesNeedingReminder()

      result.totalProcessed = profilesNeedingReminders.length

      // Process each profile
      for (const { profile, reminderType } of profilesNeedingReminders) {
        try {
          // Validate profile has required data
          if (!profile.claim_token) {
            throw new Error('Profile missing claim token')
          }

          // Send reminder email
          await emailService.sendClaimReminder(
            profile,
            profile.claim_token,
            reminderType
          )

          // Record that reminder was sent
          await reminderService.recordReminderSent(
            profile.id,
            reminderType
          )

          result.successful++
        } catch (error) {
          result.failed++
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error'
          result.errors.push({
            profileId: profile.id,
            error: errorMessage,
          })

          // Log error but continue processing
          console.error(
            `Failed to send reminder for profile ${profile.id}:`,
            errorMessage
          )
        }
      }
    } catch (error) {
      // Log critical error
      console.error('Failed to process reminders:', error)
      throw error
    }

    return result
  }

  /**
   * Send reminder for a specific profile
   * Used by manual reminder endpoint
   */
  async sendReminderForProfile(
    profile: Profile
  ): Promise<{ reminderType: '7day' | '14day' }> {
    if (!profile.claim_token) {
      throw new Error('Profile does not have a claim token')
    }

    if (profile.is_claimed) {
      throw new Error('Profile is already claimed')
    }

    if (!profile.claim_token_expires_at) {
      throw new Error('Profile claim token has no expiration date')
    }

    // Check if token is expired
    const expirationDate = new Date(profile.claim_token_expires_at)
    const now = new Date()
    if (expirationDate < now) {
      throw new Error('Claim token has expired')
    }

    // Determine reminder type based on token age
    const daysSinceCreation =
      reminderService.calculateDaysSinceTokenCreation(
        profile.claim_token_expires_at
      )

    if (daysSinceCreation === null) {
      throw new Error('Unable to determine token age')
    }

    let reminderType: '7day' | '14day'
    if (daysSinceCreation >= 6 && daysSinceCreation <= 8) {
      // 7-day reminder window
      if (profile.reminder_sent_at_7days) {
        throw new Error('7-day reminder already sent for this profile')
      }
      reminderType = '7day'
    } else if (daysSinceCreation >= 13 && daysSinceCreation <= 15) {
      // 14-day reminder window
      if (profile.reminder_sent_at_14days) {
        throw new Error('14-day reminder already sent for this profile')
      }
      reminderType = '14day'
    } else {
      throw new Error(
        `Profile is not in a reminder window (token age: ${daysSinceCreation} days)`
      )
    }

    // Send reminder email
    await emailService.sendClaimReminder(
      profile,
      profile.claim_token,
      reminderType
    )

    // Record that reminder was sent
    await reminderService.recordReminderSent(profile.id, reminderType)

    return { reminderType }
  }
}

// Export singleton instance
export const reminderProcessor = new ReminderProcessor()

