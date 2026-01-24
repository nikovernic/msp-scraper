import { profileService } from '@/lib/services/profileService'
import { ProfileCard } from '@/components/profile/ProfileCard'
import { SearchFilters } from '@/components/search/SearchFilters'
import { buildSearchQuery } from '@/lib/services/searchService'
import type { Metadata } from 'next'
import { getAbsoluteUrl } from '@/lib/utils/url'
import Link from 'next/link'

interface SearchPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

async function getSearchResults(searchParams: SearchPageProps['searchParams']) {
  const params = {
    q: typeof searchParams.q === 'string' ? searchParams.q : undefined,
    role: typeof searchParams.role === 'string' ? searchParams.role : undefined,
    city: typeof searchParams.city === 'string' ? searchParams.city : undefined,
    state: typeof searchParams.state === 'string' ? searchParams.state : undefined,
    years_experience_min:
      typeof searchParams.years_experience_min === 'string'
        ? parseInt(searchParams.years_experience_min, 10)
        : undefined,
    years_experience_max:
      typeof searchParams.years_experience_max === 'string'
        ? parseInt(searchParams.years_experience_max, 10)
        : undefined,
    page:
      typeof searchParams.page === 'string'
        ? parseInt(searchParams.page, 10)
        : undefined,
    limit:
      typeof searchParams.limit === 'string'
        ? parseInt(searchParams.limit, 10)
        : undefined,
  }

  const searchQuery = buildSearchQuery(params)

  const { profiles, total } = await profileService.searchProfiles(
    searchQuery.textQuery,
    searchQuery.filters,
    searchQuery.pagination.page,
    searchQuery.pagination.limit
  )

  return {
    profiles,
    total,
    pagination: {
      page: searchQuery.pagination.page,
      limit: searchQuery.pagination.limit,
      totalPages: Math.ceil(total / searchQuery.pagination.limit),
    },
    query: searchQuery.textQuery || '',
  }
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const query = typeof searchParams.q === 'string' ? searchParams.q : ''
  const title = query
    ? `Search Results for '${query}' - Crew Up`
    : 'Search Crew - Crew Up'
  const description = query
    ? `Find crew members matching '${query}' on Crew Up`
    : 'Search for production crew members across the United States'

  const searchUrl = getAbsoluteUrl('/search')
  const urlWithQuery = query
    ? `${searchUrl}?q=${encodeURIComponent(query)}`
    : searchUrl

  return {
    title,
    description,
    alternates: {
      canonical: urlWithQuery,
    },
    openGraph: {
      title,
      description,
      url: urlWithQuery,
      siteName: 'Crew Up',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

function PaginationControls({
  currentPage,
  totalPages,
  query,
  filters,
}: {
  currentPage: number
  totalPages: number
  query?: string
  filters?: Record<string, string | undefined>
}) {
  if (totalPages <= 1) return null

  const buildUrl = (page: number) => {
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (filters?.role) params.set('role', filters.role)
    if (filters?.city) params.set('city', filters.city)
    if (filters?.state) params.set('state', filters.state)
    if (filters?.years_experience_min)
      params.set('years_experience_min', filters.years_experience_min)
    if (filters?.years_experience_max)
      params.set('years_experience_max', filters.years_experience_max)
    params.set('page', page.toString())
    return `/search?${params.toString()}`
  }

  return (
    <nav
      className="flex items-center justify-center gap-2 mt-8"
      aria-label="Pagination"
    >
      {currentPage > 1 && (
        <Link
          href={buildUrl(currentPage - 1)}
          className="px-4 py-2 border rounded-md hover:bg-accent"
        >
          Previous
        </Link>
      )}

      <div className="flex gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          if (
            page === 1 ||
            page === totalPages ||
            (page >= currentPage - 1 && page <= currentPage + 1)
          ) {
            return (
              <Link
                key={page}
                href={buildUrl(page)}
                className={`px-4 py-2 border rounded-md ${
                  page === currentPage
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent'
                }`}
              >
                {page}
              </Link>
            )
          } else if (
            page === currentPage - 2 ||
            page === currentPage + 2
          ) {
            return (
              <span key={page} className="px-4 py-2">
                ...
              </span>
            )
          }
          return null
        })}
      </div>

      {currentPage < totalPages && (
        <Link
          href={buildUrl(currentPage + 1)}
          className="px-4 py-2 border rounded-md hover:bg-accent"
        >
          Next
        </Link>
      )}
    </nav>
  )
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { profiles, total, pagination, query } = await getSearchResults(
    searchParams
  )

  const filters = {
    role:
      typeof searchParams.role === 'string' ? searchParams.role : undefined,
    city:
      typeof searchParams.city === 'string' ? searchParams.city : undefined,
    state:
      typeof searchParams.state === 'string' ? searchParams.state : undefined,
    years_experience_min:
      typeof searchParams.years_experience_min === 'string'
        ? searchParams.years_experience_min
        : undefined,
    years_experience_max:
      typeof searchParams.years_experience_max === 'string'
        ? searchParams.years_experience_max
        : undefined,
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <section>
          <h1 className="text-3xl font-bold mb-4">
            {query ? `Search Results for "${query}"` : 'Search Crew'}
          </h1>
          {total > 0 && (
            <p className="text-muted-foreground mb-6">
              Found {total} {total === 1 ? 'result' : 'results'}
            </p>
          )}
        </section>

        {/* Search Filters */}
        <SearchFilters />

        {profiles.length === 0 ? (
          <section>
            <p className="text-muted-foreground text-lg">
              No results found. Try adjusting your search criteria.
            </p>
          </section>
        ) : (
          <>
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profiles.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </section>

            <PaginationControls
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              query={query}
              filters={filters}
            />
          </>
        )}
      </div>
    </main>
  )
}

