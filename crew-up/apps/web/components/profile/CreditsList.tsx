import type { Credit } from '@crew-up/shared'

interface CreditsListProps {
  credits: Credit[]
}

export function CreditsList({ credits }: CreditsListProps) {
  if (credits.length === 0) {
    return (
      <div className="text-muted-foreground">
        <p>No credits available.</p>
      </div>
    )
  }

  // Sort credits by display_order (lower numbers = higher priority)
  const sortedCredits = [...credits].sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-4">Credits</h2>
      <div className="space-y-6">
        {sortedCredits.map((credit) => (
          <div key={credit.id} className="border-l-4 border-primary pl-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold">{credit.project_title}</h3>
                <p className="text-muted-foreground">
                  {credit.role} • {credit.project_type} • {credit.year}
                </p>
                {credit.production_company && (
                  <p className="text-sm text-muted-foreground">
                    {credit.production_company}
                  </p>
                )}
                {credit.director && (
                  <p className="text-sm text-muted-foreground">
                    Director: {credit.director}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


