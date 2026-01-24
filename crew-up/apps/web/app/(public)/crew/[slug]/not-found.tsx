import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-screen p-8 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Profile Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The profile you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          Return Home
        </Link>
      </div>
    </main>
  )
}

