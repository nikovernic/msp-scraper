import { describe, it, expect } from 'vitest'
import { generateSlug, ensureUniqueSlug } from '@/lib/utils/slug'

describe('Slug Generation', () => {
  describe('generateSlug', () => {
    it('should generate slug in correct format', () => {
      const slug = generateSlug('John Doe', 'Gaffer', 'Nashville')
      expect(slug).toBe('john-doe-gaffer-nashville')
    })

    it('should handle special characters', () => {
      const slug = generateSlug("John O'Brien", '1st AC', 'New York')
      expect(slug).toBe('john-o-brien-1st-ac-new-york')
    })

    it('should handle multiple spaces', () => {
      const slug = generateSlug('Sarah  Martinez', 'Sound Mixer', 'Los Angeles')
      expect(slug).toBe('sarah-martinez-sound-mixer-los-angeles')
    })

    it('should trim and clean edges', () => {
      const slug = generateSlug('  John Doe  ', '  Gaffer  ', '  Nashville  ')
      expect(slug).toBe('john-doe-gaffer-nashville')
    })

    it('should truncate to 100 characters', () => {
      const longName = 'A'.repeat(50)
      const longRole = 'B'.repeat(50)
      const longCity = 'C'.repeat(50)
      const slug = generateSlug(longName, longRole, longCity)
      expect(slug.length).toBeLessThanOrEqual(100)
    })

    it('should handle empty strings', () => {
      const slug = generateSlug('John', 'Gaffer', '')
      expect(slug).toContain('john-gaffer')
    })
  })

  describe('ensureUniqueSlug', () => {
    it('should return base slug if not exists', async () => {
      const checkExists = async (slug: string) => false
      const uniqueSlug = await ensureUniqueSlug('test-slug', checkExists)
      expect(uniqueSlug).toBe('test-slug')
    })

    it('should append number if slug exists', async () => {
      let callCount = 0
      const checkExists = async (slug: string) => {
        callCount++
        return slug === 'test-slug'
      }
      const uniqueSlug = await ensureUniqueSlug('test-slug', checkExists)
      expect(uniqueSlug).toBe('test-slug-2')
      expect(callCount).toBeGreaterThan(1)
    })

    it('should increment counter for multiple duplicates', async () => {
      const existingSlugs = new Set(['test-slug', 'test-slug-2'])
      const checkExists = async (slug: string) => existingSlugs.has(slug)
      const uniqueSlug = await ensureUniqueSlug('test-slug', checkExists)
      expect(uniqueSlug).toBe('test-slug-3')
    })
  })
})



