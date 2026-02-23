import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { amplifyTreesApi } from '@/services/amplifyDataClient'
import { useCreateTree, useTrees } from '@/hooks/useTreesApi'
import { setPartitionKey } from '@/services/flaskService'
import type { Gender } from '@/types'

interface Props {
  readonly open: boolean
  readonly onClose: () => void
}

type Step = 'tree' | 'member'

export default function CreateTreeModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const createTree = useCreateTree()
  const { data: treesData } = useTrees()
  const trees = treesData?.trees ?? []
  const MAX_TREES = 5
  const hasReachedLimit = trees.length >= MAX_TREES

  // ─── step state ──────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>('tree')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── step 1: tree metadata (Amplify tree created here; delete on cancel if user doesn't finish) ─
  const [treeName, setTreeName] = useState('')
  const [amplifyTreeId, setAmplifyTreeId] = useState<string | null>(null)

  // ─── step 2: first member ───────────────────────────────────────────
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [born, setBorn] = useState('')
  const [died, setDied] = useState('')
  const [description, setDescription] = useState('')

  // ─── handlers ───────────────────────────────────────────────────────

  function reset() {
    setStep('tree')
    setLoading(false)
    setError(null)
    setTreeName('')
    setAmplifyTreeId(null)
    setName('')
    setSurname('')
    setGender('male')
    setBorn('')
    setDied('')
    setDescription('')
  }

  const handleClose = useCallback(async () => {
    if (amplifyTreeId) {
      try {
        await amplifyTreesApi.delete(amplifyTreeId)
      } catch {
        // best-effort: avoid leaving orphan Amplify tree when user cancels
      }
    }
    reset()
    onClose()
  }, [amplifyTreeId, onClose])

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
  }, [open, loading, onClose, amplifyTreeId, handleClose])

  async function handleTreeSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (hasReachedLimit) {
      setError(`You have reached the limit of ${MAX_TREES} trees. You currently have access to ${trees.length} trees (as owner, editor, or viewer).`)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const tree = await amplifyTreesApi.create({ name: treeName.trim() })
      setAmplifyTreeId(tree.id)
      setStep('member')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tree')
    } finally {
      setLoading(false)
    }
  }

  async function handleMemberSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!amplifyTreeId) return
    setError(null)
    setLoading(true)
    try {
      const result = await createTree.mutateAsync({
        tree_id: amplifyTreeId,
        name: name.trim(),
        surname: surname.trim(),
        gender,
        description: description.trim() || 'No description provided.',
        born: `${born}T00:00:00Z`,
        died: died ? `${died}T00:00:00Z` : undefined,
        pic: '',
        photos: '',
      })
      setPartitionKey(result.partition_key)
      setAmplifyTreeId(null)
      reset()
      onClose()
      navigate({
        to: '/tree/$treeId',
        params: { treeId: amplifyTreeId },
        search: { memberId: undefined },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create first member')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
        onClick={handleClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="relative bg-[var(--color-surface-elevated)] rounded-2xl shadow-xl w-full max-w-3xl min-w-[500px] mx-4 max-h-[90vh] overflow-y-auto animate-in slide-up duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {step === 'tree' ? 'Create a New Tree' : 'Add First Member'}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {step === 'tree'
                ? 'Step 1 of 2 — Name your tree'
                : 'Step 2 of 2 — Who is the first person in this tree?'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 px-4 py-3 text-sm text-[var(--color-error)]">
              {error}
            </div>
          )}

          {step === 'tree' ? (
            <form onSubmit={handleTreeSubmit} className="space-y-4">
              <div>
                <label htmlFor="treeName" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Tree Name <span className="text-[var(--color-error)]">*</span>
                </label>
                <input
                  id="treeName"
                  type="text"
                  required
                  value={treeName}
                  onChange={(e) => setTreeName(e.target.value)}
                  placeholder="e.g. The Smith Family"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !treeName.trim()}
                  className="px-5 py-2 text-sm font-medium text-white bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {loading ? 'Creating…' : 'Next'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleMemberSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    First Name <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Surname <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={surname}
                    onChange={(e) => setSurname(e.target.value)}
                    placeholder="Smith"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Gender <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="born" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Date of Birth <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    id="born"
                    type="date"
                    required
                    value={born}
                    onChange={(e) => setBorn(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="died" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Date of Death <span className="text-[var(--color-text-tertiary)]">(optional)</span>
                </label>
                <input
                  id="died"
                  type="date"
                  value={died}
                  onChange={(e) => setDied(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="memberDesc" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Description
                </label>
                <textarea
                  id="memberDesc"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about this person…"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent resize-none"
                />
              </div>

              <div className="flex justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('tree')}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !name.trim() || !surname.trim() || !born}
                    className="px-5 py-2 text-sm font-medium text-white bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {loading ? 'Creating…' : 'Create Tree'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

