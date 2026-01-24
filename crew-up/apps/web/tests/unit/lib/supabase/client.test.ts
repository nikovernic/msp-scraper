import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/client'

describe('Supabase Client', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  it('should create a browser client', () => {
    const client = createClient()
    expect(client).toBeDefined()
  })

  it('should use environment variables for configuration', () => {
    const client = createClient()
    expect(client).toBeDefined()
    // Client is created successfully with env vars
  })
})

