interface Props {
  onCreateTree: () => void
  disabled?: boolean
}

export default function EmptyState({ onCreateTree, disabled = false }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 w-full text-center">
      {/* Tree icon */}
      <div className="mb-6 rounded-full bg-[var(--color-accent)]/10 p-6">
        <svg
          className="w-16 h-16 text-[var(--color-accent)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
          />
        </svg>
      </div>

      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
        No trees yet
      </h2>
      <p className="text-[var(--color-text-secondary)] mb-8">
        Create your first tree to start mapping out a family tree, or ask
        someone to share an existing tree with you.
      </p>

      {disabled ? (
        <div className="flex flex-col items-center gap-2">
          <button
            disabled
            className="px-6 py-3 bg-[var(--color-accent)] text-[var(--color-on-accent)] rounded-lg font-medium opacity-50 cursor-not-allowed transition-colors shadow-sm"
          >
            Create Your First Tree
          </button>
          <p className="text-sm text-[var(--color-text-tertiary)] max-w-md">
            You have reached the limit of 5 trees. You currently have access to 5 trees (as owner, editor, or viewer).
          </p>
        </div>
      ) : (
        <button
          onClick={onCreateTree}
          className="px-6 py-3 bg-[var(--color-accent)] text-[var(--color-on-accent)] rounded-lg font-medium hover:bg-[var(--color-accent-hover)] transition-colors shadow-sm cursor-pointer"
        >
          Create Your First Tree
        </button>
      )}
    </div>
  )
}

