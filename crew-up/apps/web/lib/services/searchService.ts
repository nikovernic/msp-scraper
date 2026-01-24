/**
 * Search Service
 * Handles search query parsing and building search queries
 */

export interface ParsedSearchQuery {
  text: string
  role?: string
  city?: string
  state?: string
}

export interface SearchFilters {
  role?: string
  city?: string
  state?: string
  years_experience_min?: number
  years_experience_max?: number
}

export interface SearchQueryParams {
  q?: string
  role?: string
  city?: string
  state?: string
  years_experience_min?: number
  years_experience_max?: number
  page?: number
  limit?: number
}

export interface BuiltSearchQuery {
  textQuery?: string
  filters: SearchFilters
  pagination: {
    page: number
    limit: number
  }
}

/**
 * Parse natural language search query to extract role and location
 * Examples:
 * - "AC in Nashville" → { text: "AC in Nashville", role: "AC", city: "Nashville" }
 * - "gaffer Atlanta" → { text: "gaffer Atlanta", role: "gaffer", city: "Atlanta" }
 * - "DP in Los Angeles CA" → { text: "DP in Los Angeles CA", role: "DP", city: "Los Angeles", state: "CA" }
 */
export function parseSearchQuery(query: string): ParsedSearchQuery {
  if (!query || query.trim().length === 0) {
    return { text: '' }
  }

  const trimmedQuery = query.trim()
  const result: ParsedSearchQuery = { text: trimmedQuery }

  // Pattern 1: "role in city" or "role in city state"
  const inPattern = /^([^in]+?)\s+in\s+([^,]+?)(?:\s+([A-Z]{2}))?$/i
  const inMatch = trimmedQuery.match(inPattern)
  if (inMatch) {
    result.role = inMatch[1].trim()
    const location = inMatch[2].trim()
    // Try to split city and state if it looks like "City State"
    const cityStateMatch = location.match(/^(.+?)\s+([A-Z]{2})$/i)
    if (cityStateMatch) {
      result.city = cityStateMatch[1].trim()
      result.state = cityStateMatch[2].trim().toUpperCase()
    } else if (inMatch[3]) {
      result.city = location
      result.state = inMatch[3].trim().toUpperCase()
    } else {
      result.city = location
    }
    return result
  }

  // Pattern 2: "role city" or "role city state"
  const spacePattern = /^([a-zA-Z0-9\s]+?)\s+([^,]+?)(?:\s+([A-Z]{2}))?$/i
  const spaceMatch = trimmedQuery.match(spacePattern)
  if (spaceMatch) {
    // Check if last token looks like a state (2 letters)
    const parts = trimmedQuery.split(/\s+/)
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1]
      const secondLastPart = parts[parts.length - 2]

      // If last part is 2 letters, treat as state
      if (/^[A-Z]{2}$/i.test(lastPart)) {
        result.state = lastPart.toUpperCase()
        result.city = parts.slice(1, -1).join(' ')
        result.role = parts[0]
      } else {
        // Otherwise, treat last part as city and first part as role
        result.role = parts[0]
        result.city = parts.slice(1).join(' ')
      }
      return result
    }
  }

  return result
}

/**
 * Build search query from parameters
 * Combines query parsing with explicit filters
 */
export function buildSearchQuery(params: SearchQueryParams): BuiltSearchQuery {
  const {
    q,
    role,
    city,
    state,
    years_experience_min,
    years_experience_max,
    page = 1,
    limit = 20,
  } = params

  const filters: SearchFilters = {}

  // Parse query text if provided
  let textQuery: string | undefined = q?.trim()
  let parsedQuery: ParsedSearchQuery | undefined

  if (q) {
    parsedQuery = parseSearchQuery(q)
    textQuery = parsedQuery.text
  }

  // Apply explicit filters (override parsed query if both provided)
  if (role) {
    filters.role = role
  } else if (parsedQuery?.role) {
    filters.role = parsedQuery.role
  }

  if (city) {
    filters.city = city
  } else if (parsedQuery?.city) {
    filters.city = parsedQuery.city
  }

  if (state) {
    filters.state = state
  } else if (parsedQuery?.state) {
    filters.state = parsedQuery.state
  }

  if (years_experience_min !== undefined) {
    filters.years_experience_min = years_experience_min
  }

  if (years_experience_max !== undefined) {
    filters.years_experience_max = years_experience_max
  }

  // Normalize pagination
  const normalizedPage = Math.max(1, Math.floor(page))
  const normalizedLimit = Math.max(1, Math.min(100, Math.floor(limit)))

  return {
    textQuery,
    filters,
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
    },
  }
}

