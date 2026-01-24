import { Resend } from 'resend'
import { ContactNotificationEmail } from '@/emails/contact-notification'
import { ClaimInvitationEmail } from '@/emails/claim-invitation'
import { ClaimReminderEmail } from '@/emails/claim-reminder'
import { render } from '@react-email/render'
import type { Profile } from '@crew-up/shared'
import { getAbsoluteUrl } from '@/lib/utils/url'
import { config } from '@/lib/config'

export interface ContactNotificationData {
  profile: Profile
  producerName: string
  producerEmail: string
  producerPhone?: string | null
  message: string
  shootDates?: string | null
}

export class EmailService {
  private resend: Resend | null = null

  /**
   * Get Resend client (lazy initialization)
   */
  private getResendClient(): Resend {
    if (!this.resend) {
      const apiKey = config.resendApiKey
      if (!apiKey) {
        throw new Error('RESEND_API_KEY environment variable is not set')
      }
      this.resend = new Resend(apiKey)
    }
    return this.resend
  }

  /**
   * Send contact notification email to crew member
   */
  async sendContactNotification(
    data: ContactNotificationData
  ): Promise<void> {
    try {
      const resend = this.getResendClient()

      // Render React Email template to HTML
      const emailHtml = await render(
        ContactNotificationEmail({
          profileName: data.profile.name,
          profileSlug: data.profile.slug,
          producerName: data.producerName,
          producerEmail: data.producerEmail,
          producerPhone: data.producerPhone,
          message: data.message,
          shootDates: data.shootDates,
        })
      )

      // Send email via Resend API
      const result = await resend.emails.send({
        from: 'Crew Up <onboarding@resend.dev>', // Using Resend default domain (can update to findfilmcrew.com after domain verification)
        to: data.profile.contact_email,
        subject: `New Contact Inquiry from ${data.producerName}`,
        html: emailHtml,
      })

      if (result.error) {
        throw new Error(`Failed to send email: ${result.error.message}`)
      }

      // Log successful email send
      console.log(`Contact notification email sent to ${data.profile.contact_email}`, {
        emailId: result.data?.id,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      // Log error but don't expose Resend API details to caller
      console.error('Failed to send contact notification email:', error)
      
      // Re-throw as generic error
      if (error instanceof Error) {
        throw new Error(`Email service error: ${error.message}`)
      }
      throw new Error('Email service error: Unknown error occurred')
    }
  }

  /**
   * Send claim invitation email to crew member
   */
  async sendClaimInvitation(
    profile: Profile,
    claimToken: string
  ): Promise<void> {
    try {
      const resend = this.getResendClient()

      // Construct claim URL
      const claimUrl = getAbsoluteUrl(`/claim/${claimToken}`)

      // Render React Email template to HTML
      const emailHtml = await render(
        ClaimInvitationEmail({
          profile,
          claimToken,
          claimUrl,
        })
      )

      // Send email via Resend API
      const result = await resend.emails.send({
        from: 'Crew Up <onboarding@resend.dev>', // Using Resend default domain (can update to findfilmcrew.com after domain verification)
        to: profile.contact_email,
        subject: `Claim Your Crew Up Profile`,
        html: emailHtml,
      })

      if (result.error) {
        throw new Error(`Failed to send email: ${result.error.message}`)
      }

      // Log successful email send
      console.log(`Claim invitation email sent to ${profile.contact_email}`, {
        emailId: result.data?.id,
        profileId: profile.id,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      // Log error but don't expose Resend API details to caller
      console.error('Failed to send claim invitation email:', error)
      
      // Re-throw as generic error
      if (error instanceof Error) {
        throw new Error(`Email service error: ${error.message}`)
      }
      throw new Error('Email service error: Unknown error occurred')
    }
  }

  /**
   * Send claim reminder email to crew member
   */
  async sendClaimReminder(
    profile: Profile,
    claimToken: string,
    reminderType: '7day' | '14day'
  ): Promise<void> {
    try {
      const resend = this.getResendClient()

      // Construct claim URL
      const claimUrl = getAbsoluteUrl(`/claim/${claimToken}`)

      // Render React Email template to HTML
      const emailHtml = await render(
        ClaimReminderEmail({
          profile,
          claimToken,
          claimUrl,
          reminderType,
        })
      )

      // Send email via Resend API
      const result = await resend.emails.send({
        from: 'Crew Up <onboarding@resend.dev>', // Using Resend default domain (can update to findfilmcrew.com after domain verification)
        to: profile.contact_email,
        subject: `Reminder: Claim Your Crew Up Profile`,
        html: emailHtml,
      })

      if (result.error) {
        throw new Error(`Failed to send email: ${result.error.message}`)
      }

      // Log successful email send
      console.log(`Claim reminder email sent to ${profile.contact_email}`, {
        emailId: result.data?.id,
        profileId: profile.id,
        reminderType,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      // Log error but don't expose Resend API details to caller
      console.error('Failed to send claim reminder email:', error)
      
      // Re-throw as generic error
      if (error instanceof Error) {
        throw new Error(`Email service error: ${error.message}`)
      }
      throw new Error('Email service error: Unknown error occurred')
    }
  }
}

// Export singleton instance
export const emailService = new EmailService()

