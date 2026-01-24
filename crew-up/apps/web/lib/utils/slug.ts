/**
 * Slug generation utility
 * Generates SEO-friendly URLs in format: {name}-{role}-{city}
 */

export function generateSlug(name: string, role: string, city: string): string {
  // Convert to lowercase and replace spaces/special chars with hyphens
  const cleanName = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const cleanRole = role
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const cleanCity = city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  let slug = `${cleanName}-${cleanRole}-${cleanCity}`

  // Truncate to max 100 characters
  if (slug.length > 100) {
    slug = slug.substring(0, 100).replace(/-+$/, '')
  }

  return slug
}

export async function ensureUniqueSlug(
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (await checkExists(slug)) {
    // Remove any existing number suffix
    const base = slug.replace(/-\d+$/, '')
    slug = `${base}-${counter + 1}`
    counter++
  }

  return slug
}



