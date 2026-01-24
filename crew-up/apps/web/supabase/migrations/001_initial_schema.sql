-- Crew Up Database Schema
-- Migration: 001_initial_schema
-- Description: Initial database schema with users, profiles, credits, and contact_inquiries tables

-- Users table (managed by Supabase Auth, extended with role)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'crew')) DEFAULT 'crew',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    primary_role TEXT NOT NULL,
    primary_location_city TEXT NOT NULL,
    primary_location_state TEXT NOT NULL,
    bio TEXT CHECK (char_length(bio) <= 250),
    photo_url TEXT,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    portfolio_url TEXT,
    website TEXT,
    instagram_url TEXT,
    vimeo_url TEXT,
    union_status TEXT CHECK (union_status IN ('union', 'non-union', 'either')),
    years_experience INTEGER,
    secondary_roles TEXT[],
    additional_markets JSONB, -- Array of {city, state} objects
    is_claimed BOOLEAN DEFAULT FALSE,
    claim_token TEXT UNIQUE,
    claim_token_expires_at TIMESTAMPTZ,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credits table
CREATE TABLE IF NOT EXISTS public.credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    project_title TEXT NOT NULL,
    role TEXT NOT NULL,
    project_type TEXT NOT NULL CHECK (project_type IN ('commercial', 'feature_film', 'documentary', 'music_video', 'tv', 'corporate', 'other')),
    year INTEGER NOT NULL,
    production_company TEXT,
    director TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact inquiries table
CREATE TABLE IF NOT EXISTS public.contact_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    producer_name TEXT NOT NULL,
    producer_email TEXT NOT NULL,
    producer_phone TEXT,
    message TEXT NOT NULL CHECK (char_length(message) <= 500),
    shoot_dates TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON public.profiles(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON public.profiles(primary_location_city, primary_location_state);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(primary_role);
CREATE INDEX IF NOT EXISTS idx_profiles_claimed ON public.profiles(is_claimed);
CREATE INDEX IF NOT EXISTS idx_profiles_claim_token ON public.profiles(claim_token) WHERE claim_token IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_profiles_search ON public.profiles 
    USING gin(to_tsvector('english', 
        coalesce(name, '') || ' ' || 
        coalesce(primary_role, '') || ' ' || 
        coalesce(bio, '') || ' ' ||
        coalesce(primary_location_city, '') || ' ' ||
        coalesce(primary_location_state, '')
    ));

CREATE INDEX IF NOT EXISTS idx_credits_profile ON public.credits(profile_id);
CREATE INDEX IF NOT EXISTS idx_credits_display_order ON public.credits(profile_id, display_order);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_profile ON public.contact_inquiries(profile_id);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created ON public.contact_inquiries(created_at);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_credits_updated_at ON public.credits;
CREATE TRIGGER update_credits_updated_at BEFORE UPDATE ON public.credits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_inquiries ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Credits are viewable by everyone" ON public.credits;
DROP POLICY IF EXISTS "Users can manage own profile credits" ON public.credits;
DROP POLICY IF EXISTS "Anyone can create inquiries" ON public.contact_inquiries;
DROP POLICY IF EXISTS "Admins can view inquiries" ON public.contact_inquiries;

-- Profiles: Public read, authenticated write for own profile, admin full access
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete profiles" ON public.profiles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Credits: Public read, authenticated write for own profile's credits
CREATE POLICY "Credits are viewable by everyone" ON public.credits
    FOR SELECT USING (true);

CREATE POLICY "Users can manage own profile credits" ON public.credits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = profile_id AND user_id = auth.uid()
        )
    );

-- Contact inquiries: Only admins can view, anyone can create
CREATE POLICY "Anyone can create inquiries" ON public.contact_inquiries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view inquiries" ON public.contact_inquiries
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

