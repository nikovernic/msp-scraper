/**
 * Shared TypeScript types for Crew Up
 * All types must be defined here and imported from this package
 */

export interface User {
  id: string
  email: string
  role: 'admin' | 'crew'
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  user_id: string | null
  name: string
  primary_role: string
  primary_location_city: string
  primary_location_state: string
  bio: string | null
  photo_url: string | null
  contact_email: string
  contact_phone: string | null
  portfolio_url: string | null
  website: string | null
  instagram_url: string | null
  vimeo_url: string | null
  union_status: 'union' | 'non-union' | 'either' | null
  years_experience: number | null
  secondary_roles: string[] | null
  additional_markets: Array<{ city: string; state: string }> | null
  is_claimed: boolean
  claim_token: string | null
  claim_token_expires_at: string | null
  reminder_sent_at_7days: string | null
  reminder_sent_at_14days: string | null
  slug: string
  created_at: string
  updated_at: string
}

export interface Credit {
  id: string
  profile_id: string
  project_title: string
  role: string
  project_type: 'commercial' | 'feature_film' | 'documentary' | 'music_video' | 'tv' | 'corporate' | 'other'
  year: number
  production_company: string | null
  director: string | null
  display_order: number
  created_at: string
  updated_at: string
}

export interface ContactInquiry {
  id: string
  profile_id: string
  producer_name: string
  producer_email: string
  producer_phone: string | null
  message: string
  shoot_dates: string | null
  created_at: string
}

