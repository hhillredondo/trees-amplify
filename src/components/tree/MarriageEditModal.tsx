import { useState, useEffect, useCallback } from 'react'
import { useUpdateSpouseRelation, useMember } from '@/hooks/useTreesApi'
import { getPartitionKey } from '@/services/flaskService'
import type { Member, SpouseInfo } from '@/types'

interface Props {
  readonly open: boolean
  readonly onClose: () => void
  readonly member1Id: string | null // One spouse
  readonly member2Id: string | null // The other spouse
  readonly currentMarried: string // Current marriage date (ISO string)
  readonly currentDivorced: string | null // Current divorce date (ISO string or null)
}

export default function MarriageEditModal({
  open,
  onClose,
  member1Id,
  member2Id,
  currentMarried,
  currentDivorced,
}: Props) {
  const partitionKey = getPartitionKey()
  const updateSpouseRelation = useUpdateSpouseRelation(partitionKey)

  // Load both members to get their names and genders
  const { data: member1 } = useMember(partitionKey, member1Id)
  const { data: member2 } = useMember(partitionKey, member2Id)

  // Form state
  const [married, setMarried] = useState('')
  const [divorced, setDivorced] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form with current values
  useEffect(() => {
    if (open && currentMarried) {
      // Extract date part from ISO string (YYYY-MM-DDTHH:MM:SSZ -> YYYY-MM-DD)
      setMarried(currentMarried.split('T')[0])
      setDivorced(currentDivorced ? currentDivorced.split('T')[0] : '')
    }
  }, [open, currentMarried, currentDivorced])

  const handleClose = useCallback(() => {
    setError(null)
    setLoading(false)
    onClose()
  }, [onClose])

  // Determine husband and wife based on gender
  const husband = member1?.gender === 'male' ? member1 : member2
  const wife = member1?.gender === 'female' ? member1 : member2

  // If both are same gender or genders are unknown, use member1 as husband
  const husbandId = husband?.id || member1Id || ''
  const wifeId = wife?.id || member2Id || ''

  const husbandName = husband ? `${husband.name} ${husband.surname}` : 'Unknown'
  const wifeName = wife ? `${wife.name} ${wife.surname}` : 'Unknown'

  // ─── Escape key handler ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && !loading) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, loading, handleClose])

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!partitionKey || !husbandId || !wifeId) {
      setError('Missing required information')
      return
    }

    setError(null)
    setLoading(true)

    try {
      await updateSpouseRelation.mutateAsync({
        husband_id: husbandId,
        wife_id: wifeId,
        married: `${married}T00:00:00Z`,
        divorced: divorced ? `${divorced}T00:00:00Z` : null,
      })

      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update marriage details')
    } finally {
      setLoading(false)
    }
  }

  if (!open || !member1Id || !member2Id) return null

  const isLoading = !member1 || !member2

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="relative bg-[var(--color-surface-elevated)] rounded-2xl shadow-2xl w-full max-w-lg min-w-[400px] mx-4 animate-in slide-up duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Marriage Details</h2>
          <button
            onClick={handleClose}
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
                <p className="text-sm text-[var(--color-text-secondary)]">Loading…</p>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 px-4 py-3 text-sm text-[var(--color-error)]">
                  {error}
                </div>
              )}

              {/* Spouse names */}
              <div className="mb-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-2 flex-wrap">
                  <span className="text-lg font-semibold text-[var(--color-text-primary)] break-words">
                    {husbandName}
                  </span>
                  <span className="text-2xl text-[var(--color-text-tertiary)] shrink-0">♥</span>
                  <span className="text-lg font-semibold text-[var(--color-text-primary)] break-words">
                    {wifeName}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="married"
                      className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
                    >
                      Marriage Date <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <input
                      id="married"
                      type="date"
                      required
                      value={married}
                      onChange={(e) => setMarried(e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="divorced"
                      className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
                    >
                      Divorce Date <span className="text-[var(--color-text-tertiary)]">(optional)</span>
                    </label>
                    <input
                      id="divorced"
                      type="date"
                      value={divorced}
                      onChange={(e) => setDivorced(e.target.value)}
                      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !married}
                    className="px-5 py-2 text-sm font-medium text-white bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    {loading ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

