import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ErrorMessage from '../ErrorMessage'

describe('ErrorMessage', () => {
  it('renders the default title and message', () => {
    render(<ErrorMessage message="Something broke" />)
    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText('Something broke')).toBeInTheDocument()
  })

  it('renders a custom title', () => {
    render(<ErrorMessage title="Oops" message="Bad request" />)
    expect(screen.getByText('Oops')).toBeInTheDocument()
    expect(screen.getByText('Bad request')).toBeInTheDocument()
  })

  it('does not render retry button when onRetry is not provided', () => {
    render(<ErrorMessage message="fail" />)
    expect(screen.queryByText('Try again')).not.toBeInTheDocument()
  })

  it('renders retry button and calls onRetry when clicked', async () => {
    const onRetry = vi.fn()
    render(<ErrorMessage message="fail" onRetry={onRetry} />)
    const button = screen.getByText('Try again')
    expect(button).toBeInTheDocument()
    await userEvent.click(button)
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
