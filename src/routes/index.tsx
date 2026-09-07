import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { useTrees } from '@/hooks/useTreesApi'
import TreeCard from '@/components/dashboard/TreeCard'
import EmptyState from '@/components/dashboard/EmptyState'
import CreateTreeModal from '@/components/dashboard/CreateTreeModal'
import ErrorMessage from '@/components/ErrorMessage'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

function DashboardPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const { data, isLoading, isError, error } = useTrees()

  const trees = data?.trees ?? []
  const MAX_TREES = 5
  const hasReachedLimit = trees.length >= MAX_TREES

  return (
    <>
      {trees.length === 0 && !isLoading && !isError ? (
        // Full width layout for empty state
        <div className="w-full">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">My Trees</h1>
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  0/5 trees
                </p>
              </div>
            </div>
          </div>
          <EmptyState 
            onCreateTree={() => setShowCreateModal(true)} 
            disabled={hasReachedLimit}
          />
        </div>
      ) : (
        // Normal constrained layout for content
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">My Trees</h1>
              {trees.length > 0 && (
                <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                  {trees.length}/5 trees
                </p>
              )}
            </div>
            {trees.length > 0 && (
              <div className="flex flex-col items-end gap-1">
                <button
                  onClick={() => !hasReachedLimit && setShowCreateModal(true)}
                  disabled={hasReachedLimit}
                  className="px-4 py-2 bg-[var(--color-accent)] text-[var(--color-on-accent)] text-sm font-medium rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-accent)]"
                  title={hasReachedLimit ? `You have reached the limit of ${MAX_TREES} trees. You currently have access to ${trees.length} trees (as owner, editor, or viewer).` : undefined}
                >
                  Create Tree
                </button>
                {hasReachedLimit && (
                  <p className="text-xs text-[var(--color-text-tertiary)] text-right max-w-[200px]">
                    Tree limit reached ({trees.length}/{MAX_TREES})
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
                <p className="text-sm text-[var(--color-text-secondary)]">Loading your trees…</p>
              </div>
            </div>
          ) : isError ? (
            <div className="animate-in fade-in duration-300">
              <ErrorMessage
                title="Failed to load trees"
                message={error?.message || 'An unknown error occurred'}
                onRetry={() => window.location.reload()}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-in fade-in duration-300">
              {trees.map((tree) => (
                <TreeCard key={tree.tree_id} tree={tree} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Tree Modal */}
      <CreateTreeModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </>
  )
}
