import { NextRequest, NextResponse } from 'next/server'
import { profileService } from '@/lib/services/profileService'
import { handleError } from '@/lib/utils/errorHandler'
import { buildSearchQuery } from '@/lib/services/searchService'
import { z } from 'zod'

// Zod schema for search parameters
const searchParamsSchema = z.object({
  q: z.string().optional(),
  role: z.string().optional(),
  city: z.string().optional(),
  state: z.string().length(2).optional(),
  years_experience_min: z.coerce.number().int().min(0).optional(),
  years_experience_max: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse and validate query parameters
    const params = {
      q: searchParams.get('q') || undefined,
      role: searchParams.get('role') || undefined,
      city: searchParams.get('city') || undefined,
      state: searchParams.get('state') || undefined,
      years_experience_min: searchParams.get('years_experience_min')
        ? parseInt(searchParams.get('years_experience_min')!, 10)
        : undefined,
      years_experience_max: searchParams.get('years_experience_max')
        ? parseInt(searchParams.get('years_experience_max')!, 10)
        : undefined,
      page: searchParams.get('page')
        ? parseInt(searchParams.get('page')!, 10)
        : undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!, 10)
        : undefined,
    }

    const validatedParams = searchParamsSchema.parse(params)

    // Build search query
    const searchQuery = buildSearchQuery(validatedParams)

    // Search profiles
    const { profiles, total } = await profileService.searchProfiles(
      searchQuery.textQuery,
      searchQuery.filters,
      searchQuery.pagination.page,
      searchQuery.pagination.limit
    )

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / searchQuery.pagination.limit)

    return NextResponse.json({
      profiles,
      pagination: {
        page: searchQuery.pagination.page,
        limit: searchQuery.pagination.limit,
        total,
        totalPages,
      },
    })
  } catch (error) {
    return handleError(error)
  }
}

