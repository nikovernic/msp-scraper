/**
 * Simple in-memory rate limiter
 * For production, this should be replaced with Vercel Edge Config or Redis
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Check if an IP address has exceeded the rate limit
 * @param ip - IP address to check
 * @param maxRequests - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns true if rate limit exceeded, false otherwise
 */
export function checkRateLimit(
  ip: string,
  maxRequests: number = 5,
  windowMs: number = 60 * 60 * 1000 // 1 hour default
): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(ip)

  // If no entry or window has expired, reset
  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + windowMs,
    })
    return false
  }

  // Increment count
  entry.count++

  // Check if limit exceeded
  if (entry.count > maxRequests) {
    return true
  }

  return false
}

/**
 * Get remaining requests for an IP address
 * @param ip - IP address to check
 * @param maxRequests - Maximum number of requests allowed
 * @returns number of remaining requests
 */
export function getRemainingRequests(
  ip: string,
  maxRequests: number = 5
): number {
  const entry = rateLimitStore.get(ip)
  if (!entry) {
    return maxRequests
  }
  return Math.max(0, maxRequests - entry.count)
}

/**
 * Clean up expired entries (should be called periodically in production)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [ip, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetAt) {
      rateLimitStore.delete(ip)
    }
  }
}

