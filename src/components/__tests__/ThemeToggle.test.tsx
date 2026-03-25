import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/hooks/useTheme', () => ({
  useTheme: vi.fn(),
}))

import ThemeToggle from '../ThemeToggle'
import { useTheme } from '@/hooks/useTheme'

describe('ThemeToggle', () => {
  const setTheme = vi.fn()

  beforeEach(() => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'light',
      resolvedTheme: 'light',
      setTheme,
    })
    setTheme.mockClear()
  })

  it('renders a button with aria-label', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /switch to dark mode/i })
    expect(button).toBeInTheDocument()
  })

  it('toggles from light to dark on click', async () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    await userEvent.click(button)
    expect(setTheme).toHaveBeenCalledWith('dark')
  })

  it('toggles from dark to light on click', async () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
      resolvedTheme: 'dark',
      setTheme,
    })
    render(<ThemeToggle />)
    const button = screen.getByRole('button', { name: /switch to light mode/i })
    await userEvent.click(button)
    expect(setTheme).toHaveBeenCalledWith('light')
  })
})
