import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CreditsList } from '@/components/profile/CreditsList'
import type { Credit } from '@crew-up/shared'

describe('CreditsList', () => {
  it('should render empty state when no credits', () => {
    render(<CreditsList credits={[]} />)

    expect(screen.getByText('No credits available.')).toBeInTheDocument()
  })

  it('should render credits heading', () => {
    const credits: Credit[] = [
      {
        id: 'credit-1',
        profile_id: 'profile-1',
        project_title: 'Test Project',
        role: 'Gaffer',
        project_type: 'commercial',
        year: 2024,
        production_company: null,
        director: null,
        display_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    render(<CreditsList credits={credits} />)

    expect(screen.getByText('Credits')).toBeInTheDocument()
  })

  it('should render single credit', () => {
    const credits: Credit[] = [
      {
        id: 'credit-1',
        profile_id: 'profile-1',
        project_title: 'Test Project',
        role: 'Gaffer',
        project_type: 'commercial',
        year: 2024,
        production_company: null,
        director: null,
        display_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    render(<CreditsList credits={credits} />)

    expect(screen.getByText('Test Project')).toBeInTheDocument()
    expect(screen.getByText(/Gaffer • commercial • 2024/)).toBeInTheDocument()
  })

  it('should render credit with production company', () => {
    const credits: Credit[] = [
      {
        id: 'credit-1',
        profile_id: 'profile-1',
        project_title: 'Test Project',
        role: 'Gaffer',
        project_type: 'commercial',
        year: 2024,
        production_company: 'ABC Productions',
        director: null,
        display_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    render(<CreditsList credits={credits} />)

    expect(screen.getByText('ABC Productions')).toBeInTheDocument()
  })

  it('should render credit with director', () => {
    const credits: Credit[] = [
      {
        id: 'credit-1',
        profile_id: 'profile-1',
        project_title: 'Test Project',
        role: 'Gaffer',
        project_type: 'commercial',
        year: 2024,
        production_company: null,
        director: 'John Director',
        display_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    render(<CreditsList credits={credits} />)

    expect(screen.getByText(/Director: John Director/)).toBeInTheDocument()
  })

  it('should render credit with both production company and director', () => {
    const credits: Credit[] = [
      {
        id: 'credit-1',
        profile_id: 'profile-1',
        project_title: 'Test Project',
        role: 'Gaffer',
        project_type: 'commercial',
        year: 2024,
        production_company: 'ABC Productions',
        director: 'John Director',
        display_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    render(<CreditsList credits={credits} />)

    expect(screen.getByText('ABC Productions')).toBeInTheDocument()
    expect(screen.getByText(/Director: John Director/)).toBeInTheDocument()
  })

  it('should render multiple credits', () => {
    const credits: Credit[] = [
      {
        id: 'credit-1',
        profile_id: 'profile-1',
        project_title: 'Project One',
        role: 'Gaffer',
        project_type: 'commercial',
        year: 2024,
        production_company: null,
        director: null,
        display_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'credit-2',
        profile_id: 'profile-1',
        project_title: 'Project Two',
        role: 'Gaffer',
        project_type: 'feature_film',
        year: 2023,
        production_company: 'XYZ Films',
        director: 'Jane Director',
        display_order: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]

    render(<CreditsList credits={credits} />)

    expect(screen.getByText('Project One')).toBeInTheDocument()
    expect(screen.getByText(/commercial • 2024/)).toBeInTheDocument()
    expect(screen.getByText('Project Two')).toBeInTheDocument()
    expect(screen.getByText(/feature_film • 2023/)).toBeInTheDocument()
    expect(screen.getByText('XYZ Films')).toBeInTheDocument()
    expect(screen.getByText(/Director: Jane Director/)).toBeInTheDocument()
  })

  it('should render different project types correctly', () => {
    const projectTypes: Array<Credit['project_type']> = [
      'commercial',
      'feature_film',
      'documentary',
      'music_video',
      'tv',
      'corporate',
      'other',
    ]

    const credits: Credit[] = projectTypes.map((type, index) => ({
      id: `credit-${index}`,
      profile_id: 'profile-1',
      project_title: `Project ${type}`,
      role: 'Gaffer',
      project_type: type,
      year: 2024,
      production_company: null,
      director: null,
      display_order: index,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    render(<CreditsList credits={credits} />)

    projectTypes.forEach((type) => {
      expect(screen.getByText(`Project ${type}`)).toBeInTheDocument()
    })
  })
})
