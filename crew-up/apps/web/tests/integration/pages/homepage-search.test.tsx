import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomePage from '@/app/(public)/page'

describe('Homepage Search Form', () => {
  it('should render homepage with search form', () => {
    const Page = HomePage()
    render(Page)

    expect(screen.getByText('Crew Up')).toBeInTheDocument()
    expect(
      screen.getByText('Find production crew across the United States')
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Search for crew')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument()
  })

  it('should have search input with correct attributes', () => {
    const Page = HomePage()
    render(Page)

    const searchInput = screen.getByLabelText('Search for crew members')
    expect(searchInput).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('type', 'text')
    expect(searchInput).toHaveAttribute('name', 'query')
    expect(searchInput).toHaveAttribute('id', 'search-query')
    expect(searchInput).toHaveAttribute('required')
    expect(searchInput).toHaveAttribute(
      'placeholder',
      "Search for crew (e.g., 'gaffer in Nashville')"
    )
  })

  it('should have form with correct structure for search submission', () => {
    const Page = HomePage()
    render(Page)

    const form = screen.getByLabelText('Search for crew members').closest('form')
    expect(form).toBeInTheDocument()
    // Server actions are function references, not HTML attributes, so we just verify form exists
    
    const submitButton = screen.getByRole('button', { name: 'Search' })
    expect(submitButton).toBeInTheDocument()
    expect(submitButton).toHaveAttribute('type', 'submit')
  })

  it('should render homepage content sections', () => {
    const Page = HomePage()
    render(Page)

    expect(screen.getByText('For Producers')).toBeInTheDocument()
    expect(screen.getByText('For Crew')).toBeInTheDocument()
    expect(screen.getByText('Nationwide')).toBeInTheDocument()
  })

  it('should have accessible form labels', () => {
    const Page = HomePage()
    render(Page)

    // Screen reader label
    expect(screen.getByText('Search for crew', { selector: 'label' })).toBeInTheDocument()
    
    // ARIA label on input
    const searchInput = screen.getByLabelText('Search for crew members')
    expect(searchInput).toBeInTheDocument()
  })
})

