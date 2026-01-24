'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useTransition } from 'react'

export function SearchFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  // Initialize state from URL params
  const [role, setRole] = useState(searchParams.get('role') || '')
  const [city, setCity] = useState(searchParams.get('city') || '')
  const [state, setState] = useState(searchParams.get('state') || '')
  const [yearsMin, setYearsMin] = useState(searchParams.get('years_experience_min') || '')
  const [yearsMax, setYearsMax] = useState(searchParams.get('years_experience_max') || '')

  // Update URL when filters change
  const updateFilters = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Preserve search query
    const query = searchParams.get('q') || ''
    
    // Clear existing filter params
    params.delete('role')
    params.delete('city')
    params.delete('state')
    params.delete('years_experience_min')
    params.delete('years_experience_max')
    params.delete('page') // Reset to page 1 when filters change
    
    // Add new filter params
    if (role) params.set('role', role)
    if (city) params.set('city', city)
    if (state) params.set('state', state)
    if (yearsMin) params.set('years_experience_min', yearsMin)
    if (yearsMax) params.set('years_experience_max', yearsMax)
    
    // Preserve query if it exists
    if (query) params.set('q', query)

    startTransition(() => {
      router.push(`/search?${params.toString()}`)
    })
  }

  const clearFilters = () => {
    setRole('')
    setCity('')
    setState('')
    setYearsMin('')
    setYearsMax('')
    
    const params = new URLSearchParams()
    const query = searchParams.get('q')
    if (query) params.set('q', query)
    
    startTransition(() => {
      router.push(query ? `/search?${params.toString()}` : '/search')
    })
  }

  // Check if any filters are active
  const hasActiveFilters = role || city || state || yearsMin || yearsMax

  return (
    <div className="border rounded-lg mb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors"
        aria-expanded={isOpen}
        aria-controls="filters-content"
      >
        <span className="font-medium">Filters</span>
        <span className="text-sm text-muted-foreground">
          {isOpen ? '−' : '+'}
        </span>
      </button>

      {isOpen && (
        <div id="filters-content" className="p-4 border-t space-y-4">
          {/* Role Filter */}
          <div>
            <label htmlFor="filter-role" className="block text-sm font-medium mb-2">
              Role
            </label>
            <input
              id="filter-role"
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onBlur={updateFilters}
              placeholder="e.g., Gaffer, DP, AC"
              className="w-full px-3 py-2 border rounded-md"
              disabled={isPending}
            />
          </div>

          {/* Location Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="filter-city" className="block text-sm font-medium mb-2">
                City
              </label>
              <input
                id="filter-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onBlur={updateFilters}
                placeholder="e.g., Nashville"
                className="w-full px-3 py-2 border rounded-md"
                disabled={isPending}
              />
            </div>
            <div>
              <label htmlFor="filter-state" className="block text-sm font-medium mb-2">
                State
              </label>
              <input
                id="filter-state"
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                onBlur={updateFilters}
                placeholder="e.g., TN"
                maxLength={2}
                className="w-full px-3 py-2 border rounded-md uppercase"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Years of Experience Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Years in Industry
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="filter-years-min" className="sr-only">
                  Minimum years
                </label>
                <input
                  id="filter-years-min"
                  type="number"
                  value={yearsMin}
                  onChange={(e) => setYearsMin(e.target.value)}
                  onBlur={updateFilters}
                  placeholder="Min"
                  min="0"
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={isPending}
                />
              </div>
              <div>
                <label htmlFor="filter-years-max" className="sr-only">
                  Maximum years
                </label>
                <input
                  id="filter-years-max"
                  type="number"
                  value={yearsMax}
                  onChange={(e) => setYearsMax(e.target.value)}
                  onBlur={updateFilters}
                  placeholder="Max"
                  min="0"
                  className="w-full px-3 py-2 border rounded-md"
                  disabled={isPending}
                />
              </div>
            </div>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 text-sm border rounded-md hover:bg-accent transition-colors"
              disabled={isPending}
            >
              Clear Filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}

