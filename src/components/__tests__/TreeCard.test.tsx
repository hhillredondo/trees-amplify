import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { TreeSummary } from '@/types'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode; to: string }) => (
    <a href={props.to} data-testid="tree-link">{children}</a>
  ),
}))

vi.mock('@/services/flaskService', () => ({
  setPartitionKey: vi.fn(),
}))

vi.mock('@/utils/shortId', () => ({
  encodeUuid: (uuid: string) => uuid.slice(0, 12),
}))

import TreeCard from '../dashboard/TreeCard'

const makeTree = (overrides: Partial<TreeSummary> = {}): TreeSummary => ({
  tree_id: '550e8400-e29b-41d4-a716-446655440000',
  role: 'owner',
  partition_key: 'user1_tree1',
  member_count: 5,
  name: 'Smith Family',
  ...overrides,
})

describe('TreeCard', () => {
  it('renders tree name', () => {
    render(<TreeCard tree={makeTree()} />)
    expect(screen.getByText('Smith Family')).toBeInTheDocument()
  })

  it('renders "Unnamed Tree" when name is null', () => {
    render(<TreeCard tree={makeTree({ name: null })} />)
    expect(screen.getByText('Unnamed Tree')).toBeInTheDocument()
  })

  it('renders member count', () => {
    render(<TreeCard tree={makeTree({ member_count: 5 })} />)
    expect(screen.getByText('5 members')).toBeInTheDocument()
  })

  it('uses singular "member" for count of 1', () => {
    render(<TreeCard tree={makeTree({ member_count: 1 })} />)
    expect(screen.getByText('1 member')).toBeInTheDocument()
  })

  it('renders role badge for owner', () => {
    render(<TreeCard tree={makeTree({ role: 'owner' })} />)
    expect(screen.getByText('Owner')).toBeInTheDocument()
  })

  it('renders role badge for editor', () => {
    render(<TreeCard tree={makeTree({ role: 'editor' })} />)
    expect(screen.getByText('Editor')).toBeInTheDocument()
  })

  it('renders role badge for viewer', () => {
    render(<TreeCard tree={makeTree({ role: 'viewer' })} />)
    expect(screen.getByText('Viewer')).toBeInTheDocument()
  })
})
