import { useState, useEffect, useRef } from 'react'
import {
  useCreateChild,
  useCreateParent,
  useCreateSpouse,
  useUpdateMember,
  useMember,
  useDirectRelations,
  useUploadPic,
  useUploadPhotos,
} from '@/hooks/useTreesApi'
import { getPartitionKey } from '@/services/flaskService'
import type { Gender, Member } from '@/types'
import { subtractMonthsFromDateOnly } from '@/utils/dateOnly'

type Mode = 'create-child' | 'create-parent' | 'create-spouse' | 'edit'

interface Props {
  readonly open: boolean
  readonly onClose: () => void
  readonly mode: Mode
  readonly relatedMemberId?: string // For create modes: the parent/child/spouse to relate to
  readonly memberId?: string // For edit mode: the member to edit
  readonly onSuccess?: () => void
}

export default function MemberFormModal({
  open,
  onClose,
  mode,
  relatedMemberId,
  memberId,
  onSuccess,
}: Props) {
  const partitionKey = getPartitionKey()
  const isEdit = mode === 'edit'

  // ─── Load existing member for edit mode ─────────────────────────────
  const { data: existingMember } = useMember(partitionKey, isEdit ? memberId ?? null : null)
  
  // ─── Load child data and relations for create-parent mode ───────────
  const { data: childMember, isLoading: childMemberLoading } = useMember(
    partitionKey,
    mode === 'create-parent' ? relatedMemberId ?? null : null,
  )
  const { data: childRelations, isLoading: childRelationsLoading } = useDirectRelations(
    partitionKey,
    mode === 'create-parent' ? relatedMemberId ?? null : null,
  )

  // ─── Mutations ────────────────────────────────────────────────────
  const createChild = useCreateChild(partitionKey)
  const createParent = useCreateParent(partitionKey)
  const createSpouse = useCreateSpouse(partitionKey)
  const updateMember = useUpdateMember(partitionKey)
  const uploadPic = useUploadPic(partitionKey)
  const uploadPhotos = useUploadPhotos(partitionKey)

  // ─── Form state ────────────────────────────────────────────────────
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [gender, setGender] = useState<Gender>('male')
  const [born, setBorn] = useState('')
  const [died, setDied] = useState('')
  const [description, setDescription] = useState('')
  const [married, setMarried] = useState('') // For spouse creation
  const [divorced, setDivorced] = useState('') // For spouse creation
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // ─── File upload state ─────────────────────────────────────────────
  const [picFile, setPicFile] = useState<File | null>(null)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const picInputRef = useRef<HTMLInputElement>(null)
  const photosInputRef = useRef<HTMLInputElement>(null)

  // ─── Escape key handler ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  // ─── Load existing member data for edit ────────────────────────────
  useEffect(() => {
    if (isEdit && existingMember) {
      setName(existingMember.name)
      setSurname(existingMember.surname)
      setGender(existingMember.gender)
      setBorn(existingMember.born.split('T')[0]) // Extract date part
      setDied(existingMember.died ? existingMember.died.split('T')[0] : '')
      setDescription(existingMember.description)
    } else if (!isEdit && open) {
      // Reset form for create mode
      setName('')
      setSurname('')
      setGender('male')
      setBorn('')
      setDied('')
      setDescription('')
      setMarried('')
      setDivorced('')
      setPicFile(null)
      setPhotoFiles([])
    }
  }, [isEdit, existingMember, open])

  // ─── Handlers ───────────────────────────────────────────────────────
  function reset() {
    setError(null)
    setLoading(false)
    setPicFile(null)
    setPhotoFiles([])
    if (picInputRef.current) picInputRef.current.value = ''
    if (photosInputRef.current) photosInputRef.current.value = ''
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handlePicChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      // Validate image file
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file')
        return
      }
      setPicFile(file)
    }
  }

  function handlePhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length > 0) {
      // Validate all are images
      const invalidFiles = files.filter((f) => !f.type.startsWith('image/'))
      if (invalidFiles.length > 0) {
        setError('Please select only image files')
        return
      }
      setPhotoFiles(files)
    }
  }

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault()
    if (!partitionKey) {
      setError('No partition key set')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const bornDate = `${born}T00:00:00Z`
      const diedDate = died ? `${died}T00:00:00Z` : undefined

      let createdMemberId: string | undefined

      if (isEdit && memberId) {
        // Update existing member
        await updateMember.mutateAsync({
          id: memberId,
          name: name.trim(),
          surname: surname.trim(),
          description: description.trim() || undefined,
        })
        createdMemberId = memberId
      } else if (mode === 'create-child' && relatedMemberId) {
        // Create child
        const childResult = await createChild.mutateAsync({
          parent_id: relatedMemberId,
          name: name.trim(),
          surname: surname.trim(),
          gender,
          description: description.trim() || 'No description provided.',
          born: bornDate,
          died: diedDate,
          pic: '',
          photos: '',
        })
        createdMemberId = childResult.id
      } else if (mode === 'create-parent' && relatedMemberId) {
        // Ensure child data is loaded before proceeding
        if (childMemberLoading || childRelationsLoading) {
          setError('Loading child information...')
          setLoading(false)
          return
        }
        
        // Check if child already has parents
        const parentsCount = childRelations?.parents.length ?? 0
        
        if (parentsCount === 1) {
          // Child has 1 parent, create spouse of that parent instead
          const existingParent = childRelations!.parents[0]
          
          // Use child's birth date as marriage date (or 9 months before for safety)
          let marriageDate: string
          if (childMember?.born) {
            marriageDate = subtractMonthsFromDateOnly(childMember.born, 9)
          } else {
            // Fallback: use the born date from the form (shouldn't happen, but just in case)
            marriageDate = born
          }
          
          const spouseResult = await createSpouse.mutateAsync({
            spouse_id: existingParent.id,
            name: name.trim(),
            surname: surname.trim(),
            gender,
            description: description.trim() || 'No description provided.',
            born: bornDate,
            died: diedDate,
            pic: '',
            photos: '',
            married: `${marriageDate}T00:00:00Z`,
            divorced: null,
          })
          createdMemberId = spouseResult.id
        } else if (parentsCount === 0) {
          // No parents exist, create parent normally
          const parentResult = await createParent.mutateAsync({
            child_id: relatedMemberId,
            name: name.trim(),
            surname: surname.trim(),
            gender,
            description: description.trim() || 'No description provided.',
            born: bornDate,
            died: diedDate,
            pic: '',
            photos: '',
          })
          createdMemberId = parentResult.id
        } else {
          // Should not happen (button should be disabled), but handle gracefully
          setError('This member already has 2 parents')
          setLoading(false)
          return
        }
      } else if (mode === 'create-spouse' && relatedMemberId) {
        // Create spouse
        if (!married) {
          setError('Marriage date is required')
          setLoading(false)
          return
        }
        const spouseResult = await createSpouse.mutateAsync({
          spouse_id: relatedMemberId,
          name: name.trim(),
          surname: surname.trim(),
          gender,
          description: description.trim() || 'No description provided.',
          born: bornDate,
          died: diedDate,
          pic: '',
          photos: '',
          married: `${married}T00:00:00Z`,
          divorced: divorced ? `${divorced}T00:00:00Z` : null,
        })
        createdMemberId = spouseResult.id
      }

      // Upload files if provided and member was created/updated
      if (createdMemberId) {
        try {
          if (picFile) {
            await uploadPic.mutateAsync({ memberId: createdMemberId, file: picFile })
          }
          if (photoFiles.length > 0) {
            await uploadPhotos.mutateAsync({ memberId: createdMemberId, files: photoFiles })
          }
        } catch (uploadErr) {
          // Don't fail the whole operation if upload fails, just log it
          console.error('File upload failed:', uploadErr)
          setError(
            'Member created successfully, but some files failed to upload. You can upload them later.',
          )
        }
      }

      onSuccess?.()
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setLoading(false)
    }
  }

  // ─── Modal title ────────────────────────────────────────────────────
  function getTitle(): string {
    if (isEdit) return 'Edit Member'
    if (mode === 'create-child') return 'Add Child'
    if (mode === 'create-parent') return 'Add Parent'
    if (mode === 'create-spouse') return 'Add Spouse'
    return 'Create Member'
  }

  if (!open) return null

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
      <div className="relative bg-[var(--color-surface-elevated)] rounded-2xl shadow-2xl w-full max-w-2xl min-w-[400px] mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-in slide-up duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{getTitle()}</h2>
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
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 px-4 py-3 text-sm text-[var(--color-error)]">
              {error}
            </div>
          )}

          {isEdit && !existingMember ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
                <p className="text-sm text-[var(--color-text-secondary)]">Loading member…</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
                  >
                    First Name <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John"
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent"
                  />
                </div>
                <div>
                  <label
                    htmlFor="surname"
                    className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
                  >
                    Surname <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    id="surname"
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
                  <label
                    htmlFor="gender"
                    className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
                  >
                    Gender <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    disabled={isEdit}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent disabled:bg-[var(--color-surface)] disabled:cursor-not-allowed"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                  {isEdit && (
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Gender cannot be changed</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="born"
                    className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
                  >
                    Date of Birth <span className="text-[var(--color-error)]">*</span>
                  </label>
                  <input
                    id="born"
                    type="date"
                    required
                    value={born}
                    onChange={(e) => setBorn(e.target.value)}
                    disabled={isEdit}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent disabled:bg-[var(--color-surface)] disabled:cursor-not-allowed"
                  />
                  {isEdit && (
                    <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Birth date cannot be changed</p>
                  )}
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
                  disabled={isEdit}
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent disabled:bg-[var(--color-surface)] disabled:cursor-not-allowed"
                />
                {isEdit && (
                  <p className="text-xs text-[var(--color-text-tertiary)] mt-1">Death date cannot be changed</p>
                )}
              </div>

              {/* Marriage fields for spouse creation */}
              {mode === 'create-spouse' && (
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
              )}

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about this person…"
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent resize-none"
                />
              </div>

              {/* ── Photo Uploads ───────────────────────────────────────── */}
              <div className="space-y-4 pt-2 border-t border-[var(--color-border)]">
                <div>
                  <label
                    htmlFor="pic"
                    className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
                  >
                    Profile Picture <span className="text-[var(--color-text-tertiary)]">(optional)</span>
                  </label>
                  <input
                    id="pic"
                    ref={picInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePicChange}
                    className="w-full text-sm text-[var(--color-text-primary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[var(--color-accent)]/10 file:text-[var(--color-accent)] hover:file:bg-[var(--color-accent)]/20 file:cursor-pointer cursor-pointer"
                  />
                  {picFile && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      Selected: {picFile.name} ({(picFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="photos"
                    className="block text-sm font-medium text-[var(--color-text-primary)] mb-1"
                  >
                    Photos <span className="text-[var(--color-text-tertiary)]">(optional)</span>
                  </label>
                  <input
                    id="photos"
                    ref={photosInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotosChange}
                    className="w-full text-sm text-[var(--color-text-primary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[var(--color-accent)]/10 file:text-[var(--color-accent)] hover:file:bg-[var(--color-accent)]/20 file:cursor-pointer cursor-pointer"
                  />
                  {photoFiles.length > 0 && (
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      Selected {photoFiles.length} file{photoFiles.length > 1 ? 's' : ''}
                    </p>
                  )}
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
                  disabled={loading || !name.trim() || !surname.trim() || !born}
                  className="px-5 py-2 text-sm font-medium text-white bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {loading
                    ? isEdit
                      ? 'Saving…'
                      : 'Creating…'
                    : isEdit
                      ? 'Save Changes'
                      : 'Create Member'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

