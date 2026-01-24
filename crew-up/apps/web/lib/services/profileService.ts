import { createClient } from '@/lib/supabase/server'
import type { Profile, Credit } from '@crew-up/shared'
import { generateSlug, ensureUniqueSlug } from '@/lib/utils/slug'
import { buildSearchQuery, type SearchFilters } from './searchService'

export interface CreateProfileData {
  name: string
  primary_role: string
  primary_location_city: string
  primary_location_state: string
  contact_email: string
  contact_phone?: string | null
  bio?: string | null
  portfolio_url?: string | null
  website?: string | null
  instagram_url?: string | null
  vimeo_url?: string | null
  union_status?: 'union' | 'non-union' | 'either' | null
  years_experience?: number | null
  secondary_roles?: string[] | null
  additional_markets?: Array<{ city: string; state: string }> | null
}

export interface UpdateProfileData extends Partial<CreateProfileData> {
  photo_url?: string | null
  slug?: string
}

export class ProfileService {
  /**
   * Get Supabase client (lazy initialization)
   */
  private get supabase() {
    return createClient()
  }

  /**
   * Check if a slug exists in the database
   */
  private async slugExists(slug: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('slug', slug)
      .single()

    // If error and it's not a "not found" error, throw it
    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return !!data
  }

  /**
   * Create a new profile with unique slug generation
   */
  async createProfile(data: CreateProfileData): Promise<Profile> {
    // Generate base slug
    const baseSlug = generateSlug(
      data.name,
      data.primary_role,
      data.primary_location_city
    )

    // Ensure slug is unique
    const uniqueSlug = await ensureUniqueSlug(baseSlug, (slug) =>
      this.slugExists(slug)
    )

    // Create profile with unique slug
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .insert({
        ...data,
        slug: uniqueSlug,
        is_claimed: false,
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`)
    }

    return profile as Profile
  }

  /**
   * Get profile by slug with associated credits
   */
  async getProfileBySlug(slug: string): Promise<Profile & { credits: Credit[] } | null> {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select(
        `
        *,
        credits (
          id,
          project_title,
          role,
          project_type,
          year,
          production_company,
          director,
          display_order,
          created_at,
          updated_at
        )
      `
      )
      .eq('slug', slug)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null
      }
      throw new Error(`Failed to fetch profile: ${error.message}`)
    }

    // Sort credits by display_order
    const sortedCredits = (profile.credits || []).sort(
      (a: Credit, b: Credit) => a.display_order - b.display_order
    )

    return {
      ...profile,
      credits: sortedCredits,
    } as Profile & { credits: Credit[] }
  }

  /**
   * Update an existing profile
   */
  async updateProfile(id: string, data: UpdateProfileData): Promise<Profile> {
    // If name, role, or city changed, regenerate slug
    if (data.name || data.primary_role || data.primary_location_city) {
      // Need to fetch current profile to get all fields
      const { data: currentProfile } = await this.supabase
        .from('profiles')
        .select('name, primary_role, primary_location_city')
        .eq('id', id)
        .single()

      if (currentProfile) {
        const name = data.name || currentProfile.name
        const role = data.primary_role || currentProfile.primary_role
        const city =
          data.primary_location_city || currentProfile.primary_location_city

        const baseSlug = generateSlug(name, role, city)
        const uniqueSlug = await ensureUniqueSlug(baseSlug, (slug) =>
          this.slugExists(slug)
        )

        data = { ...data, slug: uniqueSlug }
      }
    }

    const { data: profile, error } = await this.supabase
      .from('profiles')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`)
    }

    return profile as Profile
  }

  /**
   * Delete a profile (cascades to credits via foreign key)
   */
  async deleteProfile(id: string): Promise<void> {
    const { error } = await this.supabase.from('profiles').delete().eq('id', id)

    if (error) {
      throw new Error(`Failed to delete profile: ${error.message}`)
    }
  }

  /**
   * Get profile by ID (for admin operations)
   */
  async getProfileById(id: string): Promise<Profile | null> {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch profile: ${error.message}`)
    }

    return profile as Profile
  }

  /**
   * Get profile by user_id (for crew member operations)
   */
  async getProfileByUserId(userId: string): Promise<Profile & { credits: Credit[] } | null> {
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select(
        `
        *,
        credits (
          id,
          project_title,
          role,
          project_type,
          year,
          production_company,
          director,
          display_order,
          created_at,
          updated_at
        )
      `
      )
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch profile: ${error.message}`)
    }

    // Sort credits by display_order
    const sortedCredits = (profile.credits || []).sort(
      (a: Credit, b: Credit) => a.display_order - b.display_order
    )

    return {
      ...profile,
      credits: sortedCredits,
    } as Profile & { credits: Credit[] }
  }

  /**
   * Update profile for authenticated user (ensures user can only update their own profile)
   */
  async updateProfileForUser(userId: string, data: UpdateProfileData): Promise<Profile> {
    // Get profile by user_id to ensure it exists and belongs to user
    const profile = await this.getProfileByUserId(userId)
    if (!profile) {
      throw new Error('Profile not found for user')
    }

    // Update using existing updateProfile method
    return this.updateProfile(profile.id, data)
  }

  /**
   * Get all profile slugs and updated_at timestamps (for sitemap generation)
   */
  async getAllProfileSlugs(): Promise<Array<{ slug: string; updated_at: string }>> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('slug, updated_at')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch profile slugs: ${error.message}`)
    }

    return data as Array<{ slug: string; updated_at: string }>
  }

  /**
   * Search profiles with full-text search, filters, and pagination
   * Returns profiles with top 3 credits ordered by display_order
   */
  async searchProfiles(
    textQuery?: string,
    filters?: SearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    profiles: Array<Profile & { credits: Credit[] }>
    total: number
  }> {
    // Normalize pagination
    const normalizedPage = Math.max(1, Math.floor(page))
    const normalizedLimit = Math.max(1, Math.min(100, Math.floor(limit)))
    const offset = (normalizedPage - 1) * normalizedLimit

    // Get total count
    const { data: totalCount, error: countError } = await this.supabase.rpc(
      'search_profiles_count',
      {
        search_text: textQuery || null,
        filter_role: filters?.role || null,
        filter_city: filters?.city || null,
        filter_state: filters?.state || null,
        filter_years_min: filters?.years_experience_min || null,
        filter_years_max: filters?.years_experience_max || null,
      }
    )

    if (countError) {
      throw new Error(`Failed to count search results: ${countError.message}`)
    }

    const total = totalCount || 0

    // Call RPC function for full-text search with filters and pagination
    const { data: searchResults, error: searchError } = await this.supabase.rpc(
      'search_profiles',
      {
        search_text: textQuery || null,
        filter_role: filters?.role || null,
        filter_city: filters?.city || null,
        filter_state: filters?.state || null,
        filter_years_min: filters?.years_experience_min || null,
        filter_years_max: filters?.years_experience_max || null,
        result_limit: normalizedLimit,
        result_offset: offset,
      }
    )

    if (searchError) {
      throw new Error(`Failed to search profiles: ${searchError.message}`)
    }

    const profiles = (searchResults || []) as Profile[]

    // Fetch credits for each profile (top 3 ordered by display_order)
    const profilesWithCredits = await Promise.all(
      profiles.map(async (profile) => {
        const { data: credits, error: creditsError } = await this.supabase
          .from('credits')
          .select(
            `
            id,
            project_title,
            role,
            project_type,
            year,
            production_company,
            director,
            display_order,
            created_at,
            updated_at
          `
          )
          .eq('profile_id', profile.id)
          .order('display_order', { ascending: true })
          .limit(3)

        if (creditsError) {
          // Log error but don't fail the entire search
          console.error(
            `Failed to fetch credits for profile ${profile.id}:`,
            creditsError
          )
          return {
            ...profile,
            credits: [] as Credit[],
          }
        }

        return {
          ...profile,
          credits: (credits || []) as Credit[],
        }
      })
    )

    return {
      profiles: profilesWithCredits,
      total,
    }
  }
}

// Export singleton instance
export const profileService = new ProfileService()


