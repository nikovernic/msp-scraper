import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import robots from '@/app/robots'

// Mock the url utility
vi.mock('@/lib/utils/url', () => ({
  getBaseUrl: vi.fn(() => 'https://example.com'),
}))

import { getBaseUrl } from '@/lib/utils/url'

describe('Robots.txt Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should generate robots.txt with correct rules', () => {
    const result = robots()

    expect(result).toBeDefined()
    expect(result.rules).toBeDefined()
    expect(Array.isArray(result.rules)).toBe(true)
    expect(result.rules.length).toBe(1)

    const rule = result.rules[0]
    expect(rule.userAgent).toBe('*')
    expect(rule.allow).toBe('/')
    expect(rule.disallow).toBeDefined()
    expect(Array.isArray(rule.disallow)).toBe(true)
    expect(rule.disallow).toContain('/api/')
    expect(rule.disallow).toContain('/admin/')
  })

  it('should include sitemap URL', () => {
    const result = robots()

    expect(result.sitemap).toBe('https://example.com/sitemap.xml')
    expect(getBaseUrl).toHaveBeenCalled()
  })

  it('should allow all user agents to crawl all paths except API and admin', () => {
    const result = robots()

    const rule = result.rules[0]
    expect(rule.userAgent).toBe('*')
    expect(rule.allow).toBe('/')
    expect(rule.disallow).toEqual(['/api/', '/admin/'])
  })

  it('should use base URL from environment', () => {
    vi.mocked(getBaseUrl).mockReturnValue('https://production.com')

    const result = robots()

    expect(result.sitemap).toBe('https://production.com/sitemap.xml')
    expect(getBaseUrl).toHaveBeenCalled()
  })
})

