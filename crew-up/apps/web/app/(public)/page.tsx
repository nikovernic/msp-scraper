import { redirect } from 'next/navigation'

export default function HomePage() {
  async function handleSearch(formData: FormData) {
    'use server'
    const query = formData.get('query') as string
    if (query && query.trim()) {
      redirect(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Crew Up</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Find production crew across the United States
        </p>

        {/* Search Form */}
        <div className="border rounded-lg p-8 mb-8">
          <form action={handleSearch} className="flex gap-4">
            <label htmlFor="search-query" className="sr-only">
              Search for crew
            </label>
            <input
              id="search-query"
              name="query"
              type="text"
              placeholder="Search for crew (e.g., 'gaffer in Nashville')"
              className="flex-1 px-4 py-2 border rounded-md"
              required
              aria-label="Search for crew members"
            />
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Search
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">For Producers</h2>
            <p className="text-muted-foreground">
              Find qualified crew members quickly and efficiently
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">For Crew</h2>
            <p className="text-muted-foreground">
              Showcase your work and get discovered by producers
            </p>
          </div>
          <div className="border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-2">Nationwide</h2>
            <p className="text-muted-foreground">
              Search crew members across all major production markets
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
