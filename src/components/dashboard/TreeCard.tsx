import { Link } from '@tanstack/react-router'
import { setPartitionKey } from '@/services/flaskService'
import { encodeUuid } from '@/utils/shortId'
import type { TreeSummary, Role } from '@/types'

const roleBadge: Record<Role, { label: string; className: string }> = {
  owner: {
    label: 'Owner',
    className: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
  },
  editor: {
    label: 'Editor',
    className: 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
  },
  viewer: {
    label: 'Viewer',
    className: 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]',
  },
}

export default function TreeCard({ tree }: { readonly tree: TreeSummary }) {
  const badge = roleBadge[tree.role]

  return (
    <Link
      to="/tree/$treeId"
      params={{ treeId: encodeUuid(tree.tree_id) }}
      search={{ memberId: undefined }}
      onClick={() => {
        if (tree.partition_key) setPartitionKey(tree.partition_key)
      }}
      className="block rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-sm hover:shadow-md hover:border-[var(--color-text-secondary)] transition-all duration-200 overflow-hidden transform hover:scale-[1.02]"
    >
      {/* Card body */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
            {tree.name || 'Unnamed Tree'}
          </h3>
          <span
            className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="flex items-center gap-1 text-sm text-[var(--color-text-tertiary)]">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
          <span>
            {tree.member_count} {tree.member_count === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>
    </Link>
  )
}

