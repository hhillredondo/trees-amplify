import { useState, useRef, useEffect } from 'react'
import type { Member } from '@/types'
import { formatYearOnly } from '@/utils/dateOnly'

interface MemberSearchProps {
  members: Member[]
  onSelect: (memberId: string) => void
}

export default function MemberSearch({ members, onSelect }: MemberSearchProps) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query.trim()
    ? members.filter((m) =>
        `${m.name} ${m.surname}`.toLowerCase().includes(query.toLowerCase()),
      )
    : []

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 bg-[var(--color-surface)] rounded-lg px-3 py-1.5">
        <svg
          className="w-4 h-4 text-[var(--color-text-tertiary)] shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search members…"
          className="bg-transparent text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none w-44"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('')
              setIsOpen(false)
            }}
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] cursor-pointer transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-[var(--color-surface-elevated)] rounded-lg shadow-lg border border-[var(--color-border)] max-h-64 overflow-y-auto z-50">
          {filtered.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onSelect(m.id)
                setQuery('')
                setIsOpen(false)
              }}
              className="w-full px-3 py-2.5 text-left hover:bg-[var(--color-surface)] flex items-center gap-3 text-sm transition-colors cursor-pointer"
            >
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center
                  text-white text-xs font-medium shrink-0
                  ${m.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'}
                `}
              >
                {m.name.charAt(0)}
                {m.surname.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-[var(--color-text-primary)] truncate">
                  {m.name} {m.surname}
                </p>
                <p className="text-xs text-[var(--color-text-tertiary)]">
                  *{formatYearOnly(m.born)}
                  {m.died ? ` — †${formatYearOnly(m.died)}` : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim() && filtered.length === 0 && (
        <div className="absolute top-full right-0 mt-1 w-72 bg-[var(--color-surface-elevated)] rounded-lg shadow-lg border border-[var(--color-border)] px-4 py-3 z-50">
          <p className="text-sm text-[var(--color-text-secondary)]">No members found</p>
        </div>
      )}
    </div>
  )
}

