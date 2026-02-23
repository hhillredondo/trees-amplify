import { useState, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  useMember,
  useDirectRelations,
  usePicUrl,
  usePhotosUrls,
  useUploadPic,
  useUploadPhotos,
  useDeleteMember,
} from '@/hooks/useTreesApi'
import { getPartitionKey } from '@/services/flaskService'
import { formatDateOnly, formatYearOnly, getYearFromDateOnly } from '@/utils/dateOnly'

interface Props {
  readonly open: boolean
  readonly onClose: () => void
  readonly memberId: string | null
  readonly canEdit?: boolean
  readonly onEdit?: () => void
  readonly onAddChild?: () => void
  readonly onAddParent?: () => void
  readonly onAddSpouse?: () => void
  readonly treeId?: string
}

// Minimum age to have children: 12 years 9 months = (12 * 365 + 9 * 30) days = 4650 days
const MINIMUM_AGE_FOR_CHILDREN_DAYS = 12 * 365 + 9 * 30

function isTooYoungToHaveChildren(born: string, died: string | null | undefined): boolean {
  if (getYearFromDateOnly(born) === null) return false
  if (died != null && getYearFromDateOnly(died) === null) return false
  const bornDate = new Date(born + 'T12:00:00') // noon to avoid timezone shift
  const refDate = died ? new Date(died + 'T12:00:00') : new Date()
  const ageInDays = (refDate.getTime() - bornDate.getTime()) / (1000 * 60 * 60 * 24)
  return ageInDays < MINIMUM_AGE_FOR_CHILDREN_DAYS
}

export default function MemberDetailModal({
  open,
  onClose,
  memberId,
  canEdit = true,
  onEdit,
  onAddChild,
  onAddParent,
  onAddSpouse,
  treeId,
}: Props) {
  const partitionKey = getPartitionKey()
  const navigate = useNavigate()
  const { data: member, isLoading: memberLoading } = useMember(partitionKey, memberId)
  const { data: relations, isLoading: relationsLoading } = useDirectRelations(
    partitionKey,
    memberId,
  )
  const { data: picData, isLoading: picLoading } = usePicUrl(partitionKey, memberId)
  const { data: photosData, isLoading: photosLoading } = usePhotosUrls(partitionKey, memberId)
  const uploadPic = useUploadPic(partitionKey)
  const uploadPhotos = useUploadPhotos(partitionKey)
  const deleteMember = useDeleteMember(partitionKey)

  const [imageError, setImageError] = useState<string | null>(null)
  const [uploadingPic, setUploadingPic] = useState(false)
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{
    total: number
    completed: number
    currentFile?: string
  } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false)
  const [showDeleteError, setShowDeleteError] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const picInputRef = useRef<HTMLInputElement>(null)
  const photosInputRef = useRef<HTMLInputElement>(null)

  // ─── Escape key handler ───────────────────────────────────────────────
  useEffect(() => {
    if (!open) return

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (lightboxOpen) {
          setLightboxOpen(false)
        } else {
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose, lightboxOpen])

  // ─── Lightbox keyboard navigation ────────────────────────────────────
  useEffect(() => {
    const photosUrls = photosData?.urls ?? []
    if (!lightboxOpen || photosUrls.length === 0) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setLightboxIndex((prev) => (prev > 0 ? prev - 1 : photosUrls.length - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setLightboxIndex((prev) => (prev < photosUrls.length - 1 ? prev + 1 : 0))
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [lightboxOpen, photosData?.urls])

  // ─── Open lightbox ─────────────────────────────────────────────────────
  function openLightbox(index: number) {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  // ─── Navigate lightbox ────────────────────────────────────────────────
  function goToPrevious() {
    setLightboxIndex((prev) => (prev > 0 ? prev - 1 : photosUrls.length - 1))
  }

  function goToNext() {
    setLightboxIndex((prev) => (prev < photosUrls.length - 1 ? prev + 1 : 0))
  }

  // ─── Upload handlers ───────────────────────────────────────────────
  async function handlePicUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !memberId) return

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file')
      return
    }

    setUploadError(null)
    setUploadingPic(true)

    try {
      await uploadPic.mutateAsync({ memberId, file })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload picture')
    } finally {
      setUploadingPic(false)
      if (picInputRef.current) picInputRef.current.value = ''
    }
  }

  async function handlePhotosUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0 || !memberId) return

    const invalidFiles = files.filter((f) => !f.type.startsWith('image/'))
    if (invalidFiles.length > 0) {
      setUploadError('Please select only image files')
      return
    }

    setUploadError(null)
    setUploadingPhotos(true)
    setUploadProgress({ total: files.length, completed: 0 })

    try {
      await uploadPhotos.mutateAsync({ memberId, files })
      setUploadProgress({ total: files.length, completed: files.length })
      // Clear progress after a brief delay
      setTimeout(() => {
        setUploadProgress(null)
      }, 1000)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload photos')
      setUploadProgress(null)
    } finally {
      setUploadingPhotos(false)
      if (photosInputRef.current) photosInputRef.current.value = ''
    }
  }

  if (!open || !memberId) return null

  const isLoading = memberLoading || relationsLoading || picLoading || photosLoading
  const picUrl = picData?.url || null
  const photosUrls = photosData?.urls ?? []
  const parentsCount = relations?.parents.length ?? 0
  const hasMaxParents = parentsCount >= 2
  const memberName = member ? `${member.name} ${member.surname}` : ''
  const isTooYoung =
    member && isTooYoungToHaveChildren(member.born, member.died || null)

  // Handle delete member
  async function handleDelete() {
    if (!memberId || deleting) return

    setDeleting(true)
    setDeleteError(null)
    setUploadError(null)
    try {
      // Find the related member before deletion
      const relatedMember =
        relations?.parents[0] ||
        relations?.children[0] ||
        relations?.spouses[0]

      const response = await deleteMember.mutateAsync(memberId)

      // Check if the tree was deleted (last member deleted)
      const treeWasDeleted = response?.message === 'Tree deleted'

      // Close confirmation dialog
      setShowDeleteConfirm(false)

      // Show success dialog
      setShowDeleteSuccess(true)

      // After a short delay, close modal and navigate
      setTimeout(() => {
        setShowDeleteSuccess(false)
        onClose()

        if (treeWasDeleted) {
          // If tree was deleted, redirect to dashboard
          navigate({
            to: '/',
          })
        } else if (relatedMember && treeId) {
          // Navigate to the related member if it exists
          navigate({
            to: '/tree/$treeId',
            params: { treeId },
            search: { memberId: relatedMember.id },
          })
        } else if (treeId) {
          // If no related member, just navigate to tree without memberId
          navigate({
            to: '/tree/$treeId',
            params: { treeId },
            search: { memberId: undefined },
          })
        }
      }, 1500) // Show success message for 1.5 seconds
    } catch (err) {
      // Close confirmation dialog
      setShowDeleteConfirm(false)
      
      // Show error dialog with backend error message
      let errorMessage = err instanceof Error ? err.message : 'Failed to delete member'
      
      // Replace member ID with full name in error message if member data is available
      if (member && memberId) {
        const fullName = `${member.name} ${member.surname}`
        // Replace various patterns that might include the member ID
        errorMessage = errorMessage.replace(new RegExp(`Member with ID ${memberId}`, 'gi'), fullName)
        errorMessage = errorMessage.replace(new RegExp(`member ${memberId}`, 'gi'), `member ${fullName}`)
        errorMessage = errorMessage.replace(new RegExp(memberId, 'g'), fullName)
      }
      
      setDeleteError(errorMessage)
      setShowDeleteError(true)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="relative bg-[var(--color-surface-elevated)] rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-in slide-up duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] shrink-0">
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Member Details</h2>
          <button
            onClick={onClose}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
                <p className="text-sm text-[var(--color-text-secondary)]">Loading member details…</p>
              </div>
            </div>
          ) : !member ? (
            <div className="text-center py-20">
              <p className="text-[var(--color-text-tertiary)] text-lg">Member not found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ── Profile Section ───────────────────────────────────── */}
              <div className="flex flex-col sm:flex-row gap-6">
                {/* Profile Picture */}
                <div className="shrink-0">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden bg-[var(--color-surface)] flex items-center justify-center border-4 border-[var(--color-border)] relative">
                    {picUrl && !imageError ? (
                      <img
                        src={picUrl}
                        alt={`${member.name} ${member.surname}`}
                        className="w-full h-full object-cover"
                        onError={() => setImageError('pic')}
                      />
                    ) : (
                      <div
                        className={`w-full h-full flex items-center justify-center text-white text-3xl font-semibold ${
                          member.gender === 'male' ? 'bg-blue-500' : 'bg-pink-500'
                        }`}
                      >
                        {member.name.charAt(0)}
                        {member.surname.charAt(0)}
                      </div>
                    )}
                    {uploadingPic && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <>
                      <input
                        ref={picInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePicUpload}
                        className="hidden"
                        id="upload-pic"
                      />
                      <label
                        htmlFor="upload-pic"
                        className="mt-2 block text-center text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] cursor-pointer transition-colors"
                      >
                        {uploadingPic ? 'Uploading…' : 'Change Picture'}
                      </label>
                    </>
                  )}
                </div>

                {/* Basic Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">
                    {member.name} {member.surname}
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-text-secondary)]">Gender:</span>
                      <span className="font-medium text-[var(--color-text-primary)] capitalize">{member.gender}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[var(--color-text-secondary)]">Born:</span>
                      <span className="font-medium text-[var(--color-text-primary)]">
                        {formatDateOnly(member.born)} ({formatYearOnly(member.born)})
                      </span>
                    </div>

                    {member.died && (
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--color-text-secondary)]">Died:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {formatDateOnly(member.died)} ({formatYearOnly(member.died)})
                        </span>
                      </div>
                    )}

                    {member.died && (
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--color-text-secondary)]">Lifespan:</span>
                        <span className="font-medium text-[var(--color-text-primary)]">
                          {(getYearFromDateOnly(member.died) ?? 0) - (getYearFromDateOnly(member.born) ?? 0)}{' '}
                          years
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Description ──────────────────────────────────────── */}
              {member.description && (
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">Description</h4>
                  <div className="bg-[var(--color-surface)] rounded-lg p-4 max-h-48 overflow-y-auto">
                    <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">
                      {member.description}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Photos Section ────────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Photos {photosUrls.length > 0 && `(${photosUrls.length})`}
                  </h4>
                  {canEdit && (
                    <>
                      <input
                        ref={photosInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotosUpload}
                        disabled={uploadingPhotos}
                        className="hidden"
                        id="upload-photos"
                      />
                      <label
                        htmlFor="upload-photos"
                        className={`text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] cursor-pointer px-2 py-1 rounded hover:bg-[var(--color-accent)]/10 transition-colors ${
                          uploadingPhotos ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {uploadingPhotos ? 'Uploading…' : '+ Add Photos'}
                      </label>
                    </>
                  )}
                </div>

                {uploadError && (
                  <div className="mb-3 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 px-3 py-2 text-xs text-[var(--color-error)] animate-in fade-in duration-200">
                    {uploadError}
                  </div>
                )}

                {/* Upload Progress Indicator */}
                {uploadProgress && uploadingPhotos && (
                  <div className="mb-4 rounded-lg bg-[var(--color-accent)]/10 border border-[var(--color-accent)]/20 p-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--color-accent)]">
                        Uploading photos...
                      </span>
                      <span className="text-sm text-[var(--color-accent)]">
                        {uploadProgress.completed} / {uploadProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-[var(--color-accent)]/20 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[var(--color-accent)] h-full transition-all duration-300 ease-out"
                        style={{
                          width: `${(uploadProgress.completed / uploadProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                    {uploadProgress.currentFile && (
                      <p className="text-xs text-[var(--color-accent)] mt-2 truncate">
                        {uploadProgress.currentFile}
                      </p>
                    )}
                  </div>
                )}

                {photosUrls.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {photosUrls.map((url, idx) => (
                      <div
                        key={idx}
                        className="aspect-square rounded-lg overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)] transition-transform hover:scale-105 cursor-pointer"
                        onClick={() => openLightbox(idx)}
                      >
                        <img
                          src={url}
                          alt={`Photo ${idx + 1} of ${member.name} ${member.surname}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : !uploadingPhotos ? (
                  <div className="text-center py-8 text-[var(--color-text-tertiary)] text-sm border-2 border-dashed border-[var(--color-border)] rounded-lg">
                    No photos available. Click "Add Photos" to upload some.
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* ── Action Buttons ─────────────────────────────────────────── */}
        {(onEdit || onAddChild || onAddParent || onAddSpouse || canEdit) && (
          <div className="border-t border-[var(--color-border)] px-6 py-4 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              {onEdit && (
                <button
                  onClick={() => {
                    onEdit()
                    onClose()
                  }}
                  className="px-4 py-2 text-sm font-medium text-[var(--color-accent)] bg-[var(--color-accent)]/10 rounded-lg hover:bg-[var(--color-accent)]/20 transition-colors cursor-pointer"
                >
                  Edit
                </button>
              )}
              {onAddChild && (
                <button
                  onClick={() => {
                    if (!isTooYoung) {
                      onAddChild()
                      onClose()
                    }
                  }}
                  disabled={isTooYoung}
                  title={isTooYoung ? `${memberName} is too young to have children` : undefined}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isTooYoung
                      ? 'text-[var(--color-text-tertiary)] bg-[var(--color-surface)] cursor-not-allowed'
                      : 'text-[var(--color-text-primary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] cursor-pointer'
                  }`}
                >
                  Add Child
                </button>
              )}
              {onAddParent && (
                <button
                  onClick={() => {
                    if (!hasMaxParents) {
                      onAddParent()
                      onClose()
                    }
                  }}
                  disabled={hasMaxParents}
                  title={hasMaxParents ? `${memberName} already has 2 parents` : undefined}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    hasMaxParents
                      ? 'text-[var(--color-text-tertiary)] bg-[var(--color-surface)] cursor-not-allowed'
                      : 'text-[var(--color-text-primary)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] cursor-pointer'
                  }`}
                >
                  Add Parent
                </button>
              )}
              {onAddSpouse && (
                <button
                  onClick={() => {
                    onAddSpouse()
                    onClose()
                  }}
                  className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface-elevated)] transition-colors cursor-pointer"
                >
                  Add Spouse
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-error)] rounded-lg hover:bg-[var(--color-error)]/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Delete Confirmation Dialog ───────────────────────────────────── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
            aria-label="Close confirmation"
          />

          {/* Confirmation Modal */}
          <div className="relative bg-[var(--color-surface-elevated)] rounded-2xl shadow-2xl w-full max-w-md min-w-[320px] animate-in slide-up duration-300">
            <div className="px-6 py-6">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                Delete Member
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6 break-words">
                Are you sure you want to delete {memberName}? This action cannot be undone.
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteError(null)
                  }}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface-elevated)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-error)] rounded-lg hover:bg-[var(--color-error)]/90 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Success Dialog ───────────────────────────────────── */}
      {showDeleteSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Success Modal */}
          <div className="relative bg-[var(--color-surface-elevated)] rounded-2xl shadow-2xl w-full max-w-md min-w-[320px] animate-in slide-up duration-300">
            <div className="px-6 py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                  <svg
                    className="w-6 h-6 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Member Deleted Successfully
                  </h3>
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {memberName} has been deleted from the tree.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Error Dialog ───────────────────────────────────── */}
      {showDeleteError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => {
              setShowDeleteError(false)
              setDeleteError(null)
            }}
            aria-label="Close error dialog"
          />

          {/* Error Modal */}
          <div className="relative bg-[var(--color-surface-elevated)] rounded-2xl shadow-2xl w-full max-w-md min-w-[320px] animate-in slide-up duration-300">
            <div className="px-6 py-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[var(--color-error)]/20 flex items-center justify-center shrink-0">
                  <svg
                    className="w-6 h-6 text-[var(--color-error)]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                    Deletion Failed
                  </h3>
                </div>
              </div>

              <div className="mb-6 rounded-lg bg-[var(--color-error)]/10 border border-[var(--color-error)]/20 px-3 py-2 text-sm text-[var(--color-error)]">
                {deleteError || 'Failed to delete member'}
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={() => {
                    setShowDeleteError(false)
                    setDeleteError(null)
                  }}
                  className="px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] bg-[var(--color-surface)] rounded-lg hover:bg-[var(--color-surface-elevated)] transition-colors cursor-pointer"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Lightbox ──────────────────────────────────────────────── */}
      {lightboxOpen && photosUrls.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95">
          {/* Close Button */}
          <button
            onClick={() => setLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
            aria-label="Close lightbox"
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

          {/* Previous Button */}
          {photosUrls.length > 1 && (
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
              aria-label="Previous photo"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}

          {/* Next Button */}
          {photosUrls.length > 1 && (
            <button
              onClick={goToNext}
              className="absolute right-16 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
              aria-label="Next photo"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Image Container */}
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={photosUrls[lightboxIndex]}
              alt={`Photo ${lightboxIndex + 1} of ${photosUrls.length}${member ? ` - ${member.name} ${member.surname}` : ''}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Photo Counter */}
          {photosUrls.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-black/50 text-white text-sm">
              {lightboxIndex + 1} / {photosUrls.length}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

