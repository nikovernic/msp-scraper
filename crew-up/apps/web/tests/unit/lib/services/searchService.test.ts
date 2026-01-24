import { describe, it, expect } from 'vitest'
import { parseSearchQuery, buildSearchQuery } from '@/lib/services/searchService'

describe('parseSearchQuery', () => {
  it('should return empty text for empty query', () => {
    const result = parseSearchQuery('')
    expect(result).toEqual({ text: '' })
  })

  it('should parse "role in city" pattern', () => {
    const result = parseSearchQuery('AC in Nashville')
    expect(result.text).toBe('AC in Nashville')
    expect(result.role).toBe('AC')
    expect(result.city).toBe('Nashville')
    expect(result.state).toBeUndefined()
  })

  it('should parse "role in city state" pattern', () => {
    const result = parseSearchQuery('gaffer in Atlanta GA')
    expect(result.text).toBe('gaffer in Atlanta GA')
    expect(result.role).toBe('gaffer')
    expect(result.city).toBe('Atlanta')
    expect(result.state).toBe('GA')
  })

  it('should parse "role in City State" pattern (state in location)', () => {
    const result = parseSearchQuery('DP in Los Angeles CA')
    expect(result.text).toBe('DP in Los Angeles CA')
    expect(result.role).toBe('DP')
    expect(result.city).toBe('Los Angeles')
    expect(result.state).toBe('CA')
  })

  it('should parse "role city" pattern', () => {
    const result = parseSearchQuery('gaffer Atlanta')
    expect(result.text).toBe('gaffer Atlanta')
    expect(result.role).toBe('gaffer')
    expect(result.city).toBe('Atlanta')
    expect(result.state).toBeUndefined()
  })

  it('should parse "role city state" pattern', () => {
    const result = parseSearchQuery('camera operator Nashville TN')
    expect(result.text).toBe('camera operator Nashville TN')
    expect(result.role).toBe('camera')
    expect(result.city).toBe('operator Nashville')
    expect(result.state).toBe('TN')
  })

  it('should handle multi-word roles', () => {
    const result = parseSearchQuery('camera operator in New York NY')
    expect(result.text).toBe('camera operator in New York NY')
    expect(result.role).toBe('camera operator')
    expect(result.city).toBe('New York')
    expect(result.state).toBe('NY')
  })

  it('should handle queries without location', () => {
    const result = parseSearchQuery('gaffer')
    expect(result.text).toBe('gaffer')
    expect(result.role).toBeUndefined()
    expect(result.city).toBeUndefined()
    expect(result.state).toBeUndefined()
  })

  it('should preserve original query text', () => {
    const query = 'AC in Nashville'
    const result = parseSearchQuery(query)
    expect(result.text).toBe(query)
  })
})

describe('buildSearchQuery', () => {
  it('should build query with text only', () => {
    const result = buildSearchQuery({ q: 'gaffer' })
    expect(result.textQuery).toBe('gaffer')
    expect(result.filters).toEqual({})
    expect(result.pagination).toEqual({ page: 1, limit: 20 })
  })

  it('should parse query and extract filters', () => {
    const result = buildSearchQuery({ q: 'AC in Nashville' })
    expect(result.textQuery).toBe('AC in Nashville')
    expect(result.filters.role).toBe('AC')
    expect(result.filters.city).toBe('Nashville')
  })

  it('should use explicit filters over parsed query', () => {
    const result = buildSearchQuery({
      q: 'AC in Nashville',
      role: 'Gaffer',
      city: 'Atlanta',
    })
    expect(result.filters.role).toBe('Gaffer')
    expect(result.filters.city).toBe('Atlanta')
    expect(result.filters.state).toBeUndefined()
  })

  it('should combine parsed query with explicit filters', () => {
    const result = buildSearchQuery({
      q: 'AC in Nashville',
      state: 'TN',
      years_experience_min: 5,
    })
    expect(result.filters.role).toBe('AC')
    expect(result.filters.city).toBe('Nashville')
    expect(result.filters.state).toBe('TN')
    expect(result.filters.years_experience_min).toBe(5)
  })

  it('should handle pagination parameters', () => {
    const result = buildSearchQuery({ page: 2, limit: 10 })
    expect(result.pagination.page).toBe(2)
    expect(result.pagination.limit).toBe(10)
  })

  it('should normalize page to minimum 1', () => {
    const result = buildSearchQuery({ page: 0 })
    expect(result.pagination.page).toBe(1)
  })

  it('should normalize limit to range 1-100', () => {
    expect(buildSearchQuery({ limit: 0 }).pagination.limit).toBe(1)
    expect(buildSearchQuery({ limit: 150 }).pagination.limit).toBe(100)
    expect(buildSearchQuery({ limit: 50 }).pagination.limit).toBe(50)
  })

  it('should handle years_experience filters', () => {
    const result = buildSearchQuery({
      years_experience_min: 3,
      years_experience_max: 10,
    })
    expect(result.filters.years_experience_min).toBe(3)
    expect(result.filters.years_experience_max).toBe(10)
  })

  it('should handle all filters together', () => {
    const result = buildSearchQuery({
      q: 'gaffer',
      role: 'Gaffer',
      city: 'Atlanta',
      state: 'GA',
      years_experience_min: 5,
      years_experience_max: 15,
      page: 3,
      limit: 25,
    })
    expect(result.filters.role).toBe('Gaffer')
    expect(result.filters.city).toBe('Atlanta')
    expect(result.filters.state).toBe('GA')
    expect(result.filters.years_experience_min).toBe(5)
    expect(result.filters.years_experience_max).toBe(15)
    expect(result.pagination.page).toBe(3)
    expect(result.pagination.limit).toBe(25)
  })

  it('should handle empty query string', () => {
    const result = buildSearchQuery({ q: '' })
    expect(result.textQuery).toBe('')
    expect(result.filters).toEqual({})
  })
})

