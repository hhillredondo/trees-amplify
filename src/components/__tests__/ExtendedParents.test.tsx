import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DirectRelations, Member } from '@/types'

const useDirectRelationsOfMany = vi.fn()

vi.mock('@/hooks/useTreesApi', () => ({
  useDirectRelationsOfMany: (...args: unknown[]) => useDirectRelationsOfMany(...args),
  usePicUrl: () => ({ data: undefined }),
}))

vi.mock('@/services/flaskService', () => ({
  getPartitionKey: () => 'pk',
}))

import ExtendedParents from '../tree/ExtendedParents'

const member = (id: string, born: string): Member => ({
  id,
  name: id,
  surname: 'Puig',
  gender: 'male',
  description: '',
  born,
  pic: '',
  photos: '',
})

const relationsOf = (
  self: Member,
  parents: Member[],
  siblings: Member[],
): DirectRelations => ({
  member: self,
  parents,
  children: [],
  spouses: [],
  siblings: siblings.map((s) => ({ ...s, siblingType: 'full' as const })),
})

const loaded = (data: DirectRelations) => ({ data, isError: false, error: null, refetch: vi.fn() })

const father = member('Jordi', '1950-01-01')
const mother = member('Nuria', '1952-01-01')

function renderWith(parents: Member[], results: unknown[], onFocus = vi.fn()) {
  useDirectRelationsOfMany.mockReturnValue(results)
  render(
    <ExtendedParents
      partitionKey="pk"
      parents={parents}
      onFocus={onFocus}
      onViewDetails={vi.fn()}
    />,
  )
  return { onFocus }
}

describe('ExtendedParents', () => {
  beforeEach(() => useDirectRelationsOfMany.mockReset())

  it("fetches each parent's relations and shows their parents and siblings", () => {
    renderWith(
      [father, mother],
      [
        loaded(relationsOf(father, [member('Josep', '1920-01-01'), member('Maria', '1922-01-01')], [member('Anna', '1948-01-01')])),
        loaded(relationsOf(mother, [member('Antoni', '1925-01-01')], [member('Joan', '1949-01-01')])),
      ],
    )

    expect(useDirectRelationsOfMany).toHaveBeenCalledWith('pk', ['Jordi', 'Nuria'])
    for (const name of ['Josep', 'Maria', 'Antoni', 'Jordi', 'Nuria', 'Anna', 'Joan']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
  })

  it('orders aunts and uncles oldest first', () => {
    renderWith(
      [father],
      [loaded(relationsOf(father, [], [member('Lluis', '1960-01-01'), member('Anna', '1948-01-01'), member('Pere', '1953-01-01')]))],
    )

    const [anna, pere, lluis] = ['Anna', 'Pere', 'Lluis'].map((n) => screen.getByText(n))
    expect(anna.compareDocumentPosition(pere) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(pere.compareDocumentPosition(lluis) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('shows just the parents while their relations are loading', () => {
    renderWith(
      [father, mother],
      [
        { data: undefined, isError: false, error: null, refetch: vi.fn() },
        { data: undefined, isError: false, error: null, refetch: vi.fn() },
      ],
    )

    expect(screen.getByText('Jordi')).toBeInTheDocument()
    expect(screen.getByText('Nuria')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('reports a failed lookup and retries only the failed one', async () => {
    const okRefetch = vi.fn()
    const failedRefetch = vi.fn()
    renderWith(
      [father, mother],
      [
        { ...loaded(relationsOf(father, [member('Josep', '1920-01-01')], [])), refetch: okRefetch },
        { data: undefined, isError: true, error: new Error('Server error'), refetch: failedRefetch },
      ],
    )

    expect(screen.getByText('Josep')).toBeInTheDocument()
    expect(screen.getByText('Server error')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(failedRefetch).toHaveBeenCalledOnce()
    expect(okRefetch).not.toHaveBeenCalled()
  })

  it('focuses a relative when their card is clicked', async () => {
    const { onFocus } = renderWith(
      [father],
      [loaded(relationsOf(father, [member('Josep', '1920-01-01')], [member('Anna', '1948-01-01')]))],
    )

    await userEvent.click(screen.getByText('Josep'))
    await userEvent.click(screen.getByText('Anna'))
    expect(onFocus.mock.calls).toEqual([['Josep'], ['Anna']])
  })
})
