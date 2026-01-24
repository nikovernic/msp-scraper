export default function AboutPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">About Crew Up</h1>
        
        <div className="prose max-w-none">
          <p className="text-lg mb-6">
            Crew Up is a next-generation production crew database that connects producers 
            with qualified crew members across the United States.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
          <p className="mb-6">
            By offering a superior user experience, powerful search capabilities, and 
            industry-leading SEO, Crew Up will displace Production Hub as the go-to 
            platform for crew discovery.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">For Producers</h2>
          <p className="mb-6">
            Find qualified crew in specific locations within minutes. View crew credits, 
            reels, and work examples. Contact crew directly without friction.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">For Crew Members</h2>
          <p className="mb-6">
            Be discoverable by producers hiring in your market(s). Showcase your credits, 
            reels, and best work. Receive job inquiries directly.
          </p>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Contact</h2>
          <p>
            For questions or support, please contact us through the platform.
          </p>
        </div>
      </div>
    </main>
  )
}

