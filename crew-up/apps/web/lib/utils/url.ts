/**
 * URL utility functions
 * Constructs absolute URLs for SEO metadata (OG tags, canonical URLs)
 */

/**
 * Get the base URL for the application
 * Uses environment variables if available, otherwise defaults to localhost:3000
 */
export function getBaseUrl(): string {
  // Allow explicit SITE_URL override (highest priority)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL
  }

  // Vercel provides VERCEL_URL in production/preview
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Default to localhost for development
  return process.env.NODE_ENV === 'production'
    ? 'https://crew-up.vercel.app' // Fallback for production
    : 'http://localhost:3000'
}

/**
 * Construct an absolute URL from a path
 */
export function getAbsoluteUrl(path: string): string {
  const baseUrl = getBaseUrl()
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${cleanPath}`
}

