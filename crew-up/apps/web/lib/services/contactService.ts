import { createClient } from '@/lib/supabase/server'
import type { ContactInquiry, Profile } from '@crew-up/shared'

export interface SubmitContactInquiryData {
  profile_id: string
  producer_name: string
  producer_email: string
  producer_phone?: string | null
  message: string
  shoot_dates?: string | null
}

export class ContactService {
  /**
   * Get Supabase client (lazy initialization)
   */
  private get supabase() {
    return createClient()
  }

  /**
   * Submit a contact inquiry and return the created inquiry
   */
  async submitContactInquiry(
    data: SubmitContactInquiryData
  ): Promise<ContactInquiry> {
    // Insert contact inquiry into database
    const { data: inquiry, error } = await this.supabase
      .from('contact_inquiries')
      .insert({
        profile_id: data.profile_id,
        producer_name: data.producer_name,
        producer_email: data.producer_email,
        producer_phone: data.producer_phone || null,
        message: data.message,
        shoot_dates: data.shoot_dates || null,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to submit contact inquiry: ${error.message}`)
    }

    return inquiry as ContactInquiry
  }

  /**
   * Get profile by ID for email notification
   */
  async getProfileForNotification(id: string): Promise<Profile | null> {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('id, name, contact_email, slug')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null
      }
      throw new Error(`Failed to fetch profile: ${error.message}`)
    }

    return profile as Profile
  }

  /**
   * Get profile by slug for email notification
   */
  async getProfileForNotificationBySlug(slug: string): Promise<Profile | null> {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('id, name, contact_email, slug')
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null
      }
      throw new Error(`Failed to fetch profile: ${error.message}`)
    }

    return profile as Profile
  }
}

// Export singleton instance
export const contactService = new ContactService()

