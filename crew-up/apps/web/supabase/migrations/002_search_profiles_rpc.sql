-- Crew Up Database Migration
-- Migration: 002_search_profiles_rpc
-- Description: Add RPC function for full-text search using GIN index

-- Function to search profiles using full-text search
-- Uses the existing idx_profiles_search GIN index for performance
CREATE OR REPLACE FUNCTION public.search_profiles(
    search_text TEXT DEFAULT NULL,
    filter_role TEXT DEFAULT NULL,
    filter_city TEXT DEFAULT NULL,
    filter_state TEXT DEFAULT NULL,
    filter_years_min INTEGER DEFAULT NULL,
    filter_years_max INTEGER DEFAULT NULL,
    result_limit INTEGER DEFAULT 20,
    result_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    primary_role TEXT,
    primary_location_city TEXT,
    primary_location_state TEXT,
    bio TEXT,
    photo_url TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    portfolio_url TEXT,
    website TEXT,
    instagram_url TEXT,
    vimeo_url TEXT,
    union_status TEXT,
    years_experience INTEGER,
    secondary_roles TEXT[],
    additional_markets JSONB,
    is_claimed BOOLEAN,
    claim_token TEXT,
    claim_token_expires_at TIMESTAMPTZ,
    slug TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.user_id,
        p.name,
        p.primary_role,
        p.primary_location_city,
        p.primary_location_state,
        p.bio,
        p.photo_url,
        p.contact_email,
        p.contact_phone,
        p.portfolio_url,
        p.website,
        p.instagram_url,
        p.vimeo_url,
        p.union_status,
        p.years_experience,
        p.secondary_roles,
        p.additional_markets,
        p.is_claimed,
        p.claim_token,
        p.claim_token_expires_at,
        p.slug,
        p.created_at,
        p.updated_at
    FROM public.profiles p
    WHERE
        -- Full-text search using GIN index
        (search_text IS NULL OR search_text = '' OR
         to_tsvector('english',
             coalesce(p.name, '') || ' ' ||
             coalesce(p.primary_role, '') || ' ' ||
             coalesce(p.bio, '') || ' ' ||
             coalesce(p.primary_location_city, '') || ' ' ||
             coalesce(p.primary_location_state, '')
         ) @@ plainto_tsquery('english', search_text))
        -- Role filter
        AND (filter_role IS NULL OR p.primary_role ILIKE '%' || filter_role || '%')
        -- City filter
        AND (filter_city IS NULL OR p.primary_location_city ILIKE '%' || filter_city || '%')
        -- State filter (exact match, case-insensitive)
        AND (filter_state IS NULL OR UPPER(p.primary_location_state) = UPPER(filter_state))
        -- Years experience filter
        AND (filter_years_min IS NULL OR p.years_experience IS NULL OR p.years_experience >= filter_years_min)
        AND (filter_years_max IS NULL OR p.years_experience IS NULL OR p.years_experience <= filter_years_max)
    ORDER BY 
        -- Order by relevance if search text provided, otherwise by updated_at
        CASE 
            WHEN search_text IS NOT NULL AND search_text != '' THEN
                ts_rank(to_tsvector('english',
                    coalesce(p.name, '') || ' ' ||
                    coalesce(p.primary_role, '') || ' ' ||
                    coalesce(p.bio, '') || ' ' ||
                    coalesce(p.primary_location_city, '') || ' ' ||
                    coalesce(p.primary_location_state, '')
                ), plainto_tsquery('english', search_text))
            ELSE 0
        END DESC,
        p.updated_at DESC
    LIMIT result_limit
    OFFSET result_offset;
END;
$$;

-- Function to count search results (for pagination)
CREATE OR REPLACE FUNCTION public.search_profiles_count(
    search_text TEXT DEFAULT NULL,
    filter_role TEXT DEFAULT NULL,
    filter_city TEXT DEFAULT NULL,
    filter_state TEXT DEFAULT NULL,
    filter_years_min INTEGER DEFAULT NULL,
    filter_years_max INTEGER DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO result_count
    FROM public.profiles p
    WHERE
        -- Full-text search using GIN index
        (search_text IS NULL OR search_text = '' OR
         to_tsvector('english',
             coalesce(p.name, '') || ' ' ||
             coalesce(p.primary_role, '') || ' ' ||
             coalesce(p.bio, '') || ' ' ||
             coalesce(p.primary_location_city, '') || ' ' ||
             coalesce(p.primary_location_state, '')
         ) @@ plainto_tsquery('english', search_text))
        -- Role filter
        AND (filter_role IS NULL OR p.primary_role ILIKE '%' || filter_role || '%')
        -- City filter
        AND (filter_city IS NULL OR p.primary_location_city ILIKE '%' || filter_city || '%')
        -- State filter (exact match, case-insensitive)
        AND (filter_state IS NULL OR UPPER(p.primary_location_state) = UPPER(filter_state))
        -- Years experience filter
        AND (filter_years_min IS NULL OR p.years_experience IS NULL OR p.years_experience >= filter_years_min)
        AND (filter_years_max IS NULL OR p.years_experience IS NULL OR p.years_experience <= filter_years_max);
    
    RETURN result_count;
END;
$$;

-- Grant execute permission to authenticated and anonymous users (for public search)
GRANT EXECUTE ON FUNCTION public.search_profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.search_profiles_count TO anon, authenticated;

