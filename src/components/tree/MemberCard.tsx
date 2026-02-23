import { useState } from 'react'
import { usePicUrl } from '@/hooks/useTreesApi'
import { getPartitionKey } from '@/services/flaskService'
import type { Member, SpouseInfo } from '@/types'
import { formatYearOnly } from '@/utils/dateOnly'

interface MemberCardProps {
  readonly member: Member | SpouseInfo
  readonly isFocused?: boolean
  readonly onClick?: () => void
  readonly onViewDetails?: () => void
}

function getInitials(name: string, surname: string): string {
  return `${name.charAt(0)}${surname.charAt(0)}`.toUpperCase()
}

export default function MemberCard({
  member,
  isFocused,
  onClick,
  onViewDetails,
}: MemberCardProps) {
  const partitionKey = getPartitionKey()
  const { data: picData } = usePicUrl(partitionKey, member.id)
  const [imageError, setImageError] = useState(false)
  const initials = getInitials(member.name, member.surname)
  const isMale = member.gender === 'male'
  const picUrl = picData?.url || null
  const showPic = picUrl && !imageError

  // Check if this member is a SpouseInfo (has marriage data)
  const spouseInfo = 'married' in member ? member : null

  return (
    <div
      className={`
        relative flex flex-col items-center p-5 rounded-2xl border-2 transition-all duration-200
        min-w-[240px] max-w-[280px] shrink-0
        ${
          isFocused
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5 shadow-lg ring-2 ring-[var(--color-accent)]/20'
            : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-text-secondary)] hover:shadow-md'
        }
      `}
    >
      {/* View Details Icon */}
      {onViewDetails && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onViewDetails()
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-[var(--color-surface-elevated)]/90 hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors shadow-md z-10 cursor-pointer backdrop-blur-sm"
          aria-label="View member details"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
            />
          </svg>
        </button>
      )}

      <button
        onClick={onClick}
        className="flex flex-col items-center w-full cursor-pointer"
      >
      {/* Avatar */}
      <div
        className={`
          w-20 h-20 rounded-full flex items-center justify-center
          text-white font-semibold text-xl mb-3 shadow-md overflow-hidden
          ${isMale ? 'bg-blue-500' : 'bg-pink-500'}
        `}
      >
        {showPic ? (
          <img
            src={picUrl}
            alt={`${member.name} ${member.surname}`}
            className="w-full h-full object-cover"
            onError={() => {
              setImageError(true)
            }}
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>

      {/* Name */}
      <p className="text-base font-semibold text-[var(--color-text-primary)] text-center leading-tight mb-0.5">
        {member.name}
      </p>
      <p className="text-sm text-[var(--color-text-secondary)] text-center leading-tight mb-2">
        {member.surname}
      </p>

      {/* Lifespan */}
      <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
        *{formatYearOnly(member.born)}
        {member.died ? ` — †${formatYearOnly(member.died)}` : ''}
      </p>

      {/* Marriage info for spouses */}
      {spouseInfo && (
        <p className="text-xs text-[var(--color-warning)] mt-1.5">
          ♥ {formatYearOnly(spouseInfo.married)}
          {spouseInfo.divorced
            ? ` · div. ${formatYearOnly(spouseInfo.divorced)}`
            : ''}
        </p>
      )}
      </button>
    </div>
  )
}

