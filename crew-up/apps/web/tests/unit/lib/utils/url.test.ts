import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getBaseUrl, getAbsoluteUrl } from '@/lib/utils/url'

describe('URL Utilities', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('getBaseUrl', () => {
    it('should use VERCEL_URL if available', () => {
      process.env.VERCEL_URL = 'my-app.vercel.app'
      const baseUrl = getBaseUrl()
      expect(baseUrl).toBe('https://my-app.vercel.app')
    })

    it('should use NEXT_PUBLIC_SITE_URL if available', () => {
      process.env.NEXT_PUBLIC_SITE_URL = 'https://custom-site.com'
      const baseUrl = getBaseUrl()
      expect(baseUrl).toBe('https://custom-site.com')
    })

    it('should prefer NEXT_PUBLIC_SITE_URL over VERCEL_URL', () => {
      process.env.VERCEL_URL = 'my-app.vercel.app'
      process.env.NEXT_PUBLIC_SITE_URL = 'https://custom-site.com'
      const baseUrl = getBaseUrl()
      expect(baseUrl).toBe('https://custom-site.com')
    })

    it('should default to localhost:3000 in development', () => {
      delete process.env.VERCEL_URL
      delete process.env.NEXT_PUBLIC_SITE_URL
      process.env.NODE_ENV = 'development'
      const baseUrl = getBaseUrl()
      expect(baseUrl).toBe('http://localhost:3000')
    })

    it('should default to production URL in production', () => {
      delete process.env.VERCEL_URL
      delete process.env.NEXT_PUBLIC_SITE_URL
      process.env.NODE_ENV = 'production'
      const baseUrl = getBaseUrl()
      expect(baseUrl).toBe('https://crew-up.vercel.app')
    })
  })

  describe('getAbsoluteUrl', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
      delete process.env.VERCEL_URL
      delete process.env.NEXT_PUBLIC_SITE_URL
    })

    it('should construct absolute URL from path', () => {
      const url = getAbsoluteUrl('/crew/test-slug')
      expect(url).toBe('http://localhost:3000/crew/test-slug')
    })

    it('should add leading slash if missing', () => {
      const url = getAbsoluteUrl('crew/test-slug')
      expect(url).toBe('http://localhost:3000/crew/test-slug')
    })

    it('should handle root path', () => {
      const url = getAbsoluteUrl('/')
      expect(url).toBe('http://localhost:3000/')
    })
  })
})

