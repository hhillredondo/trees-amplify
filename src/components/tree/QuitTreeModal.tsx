import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuitTree } from '@/hooks/useTreesApi'

interface Props {
  open: boolean
  onClose: () => void
  treeId: string
  treeName: string
}

export default function QuitTreeModal({ open, onClose, treeId: _treeId, treeName }: Props) {
  const navigate = useNavigate()
  const quitTree = useQuitTree()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── Escape key handler ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, loading, onClose])

  async function handleQuit() {
    setLoading(true)
    setError(null)
    try {
      // Remove role from Flask (DynamoDB ACL)
      await quitTree.mutateAsync()
      onClose()
      navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to quit tree')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--color-surface-elevated)] rounded-2xl shadow-xl w-full max-w-md min-w-[320px] mx-4 animate-in slide-up duration-300">
        <div className="px-6 py-5">
          {/* Icon */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[var(--color-warning)]/10 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-[var(--color-warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">Quit Tree</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">You will lose access to this tree</p>
            </div>
          </div>

          <p className="text-sm text-[var(--color-text-secondary)] mb-1">
            Are you sure you want to quit{' '}
            <strong className="text-[var(--color-text-primary)]">{treeName}</strong>?
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            You will no longer be able to access this tree, but the tree and all its
            data will remain unchanged. The owner can add you back later if needed.
          </p>

          {error && (
            <div className="mt-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 px-4 py-3 text-sm text-[var(--color-error)]">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleQuit}
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-white bg-[var(--color-warning)] rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {loading ? 'Quitting…' : 'Quit Tree'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

