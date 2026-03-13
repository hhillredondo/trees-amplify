import { useState, useMemo } from 'react'
import { createRoute, Link, useNavigate } from '@tanstack/react-router'
import { Route as treeRoute } from './tree.$treeId'
import { useTrees, useMembers, useDirectRelations } from '@/hooks/useTreesApi'
import { getPartitionKey } from '@/services/flaskService'
import { resolveShortId } from '@/utils/shortId'
import MemberCard from '@/components/tree/MemberCard'
import MemberSearch from '@/components/tree/MemberSearch'
import DeleteTreeModal from '@/components/tree/DeleteTreeModal'
import QuitTreeModal from '@/components/tree/QuitTreeModal'
import MemberDetailModal from '@/components/tree/MemberDetailModal'
import MemberFormModal from '@/components/tree/MemberFormModal'
import MarriageEditModal from '@/components/tree/MarriageEditModal'
import ErrorMessage from '@/components/ErrorMessage'

export const Route = createRoute({
  getParentRoute: () => treeRoute,
  path: '/',
  component: TreeViewPage,
  validateSearch: (search: Record<string, unknown>) => ({
    memberId: (search.memberId as string) || undefined,
  }),
})

function TreeViewPage() {
  const { treeId: shortId } = Route.useParams()
  const { memberId: searchMemberId } = Route.useSearch()
  const navigate = useNavigate()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showQuitModal, setShowQuitModal] = useState(false)
  const [detailModalMemberId, setDetailModalMemberId] = useState<string | null>(null)
  const [formModalMode, setFormModalMode] = useState<
    'create-child' | 'create-parent' | 'create-spouse' | 'edit' | null
  >(null)
  const [formModalRelatedId, setFormModalRelatedId] = useState<string | undefined>(undefined)
  
  // Marriage edit modal state
  const [marriageEditModal, setMarriageEditModal] = useState<{
    member1Id: string
    member2Id: string
    married: string
    divorced: string | null
  } | null>(null)

  // ─── Tree info ────────────────────────────────────────────────────
  const { data: treesData } = useTrees()
  const allTreeIds = useMemo(
    () => treesData?.trees.map((t) => t.tree_id) ?? [],
    [treesData],
  )
  const treeId = useMemo(
    () => resolveShortId(shortId, allTreeIds),
    [shortId, allTreeIds],
  )
  const tree = treesData?.trees.find((t) => t.tree_id === treeId)
  const partitionKey = tree?.partition_key ?? getPartitionKey()
  const treeName = tree?.name || 'Unnamed Tree'
  const isOwner = tree?.role === 'owner'
  const canEdit = tree?.role === 'owner' || tree?.role === 'editor'

  // ─── All members (for search + default focus) ─────────────────────
  const {
    data: allMembers,
    isLoading: membersLoading,
    isError: membersError,
    error: membersErrorObj,
  } = useMembers(partitionKey)

  // ─── Determine focused member ────────────────────────────────────
  const focusedMemberId = searchMemberId ?? allMembers?.[0]?.id ?? null

  // ─── Direct relations for focused member ──────────────────────────
  const {
    data: relations,
    isLoading: relationsLoading,
    isError: relationsError,
    error: relationsErrorObj,
  } = useDirectRelations(partitionKey, focusedMemberId)

  // ─── Navigation ──────────────────────────────────────────────────
  function handleMemberClick(memberId: string) {
    navigate({
      to: '/tree/$treeId',
      params: { treeId: shortId },
      search: { memberId },
    })
  }

  function handleMemberCardClick(memberId: string) {
    setDetailModalMemberId(memberId)
  }

  // ─── Loading state ───────────────────────────────────────────────
  const isLoading = membersLoading || (focusedMemberId && relationsLoading)
  const hasError = membersError || relationsError
  const errorMessage =
    membersErrorObj?.message || relationsErrorObj?.message || 'Failed to load tree data'

  if (!partitionKey) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
          <p className="text-sm text-[var(--color-text-secondary)]">Loading tree…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Top Bar ────────────────────────────────────────────────── */}
      <div className="bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] px-4 sm:px-6 py-2 flex items-center justify-between shrink-0">
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/"
            className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors shrink-0"
            title="Back to dashboard"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>

          <h1 className="text-base font-semibold text-[var(--color-text-primary)] truncate">
            {treeName}
          </h1>

          {tree?.role && (
            <span
              className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                tree.role === 'owner'
                  ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]'
                  : tree.role === 'editor'
                    ? 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)]'
              }`}
            >
              {tree.role.charAt(0).toUpperCase() + tree.role.slice(1)}
            </span>
          )}
        </div>

        {/* Right: search + actions */}
        <div className="flex items-center gap-2">
          {allMembers && allMembers.length > 0 && (
            <MemberSearch
              members={allMembers}
              onSelect={handleMemberClick}
            />
          )}

          {isOwner && (
            <Link
              to="/tree/$treeId/access"
              params={{ treeId: shortId }}
              className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface)] transition-colors shrink-0"
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
                  d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
                />
              </svg>
              <span className="hidden sm:inline">Access</span>
            </Link>
          )}

          {isOwner ? (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="text-sm text-[var(--color-error)] hover:opacity-80 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--color-error)]/10 transition-colors shrink-0 cursor-pointer"
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
                  d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                />
              </svg>
              <span className="hidden sm:inline">Delete</span>
            </button>
          ) : (
            <button
              onClick={() => setShowQuitModal(true)}
              className="text-sm text-[var(--color-warning)] hover:opacity-80 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-[var(--color-warning)]/10 transition-colors shrink-0 cursor-pointer"
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
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              <span className="hidden sm:inline">Quit</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Tree View ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-[var(--color-background)]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3 animate-in fade-in duration-300">
              <div className="w-8 h-8 border-4 border-[var(--color-border)] border-t-[var(--color-accent)] rounded-full animate-spin" />
              <p className="text-sm text-[var(--color-text-secondary)]">Loading tree members…</p>
            </div>
          </div>
        ) : hasError ? (
          <div className="flex items-center justify-center h-full px-6 py-8">
            <div className="w-full max-w-md min-w-[280px] animate-in fade-in duration-300">
              <ErrorMessage
                title="Failed to load tree"
                message={errorMessage}
                onRetry={() => {
                  window.location.reload()
                }}
              />
            </div>
          </div>
        ) : !relations ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center animate-in fade-in duration-300">
              <p className="text-[var(--color-text-tertiary)] text-lg mb-2">No members found</p>
              <p className="text-sm text-[var(--color-text-tertiary)]">
                This tree doesn't have any members yet.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-full py-8 px-6 animate-in fade-in duration-300">
            {/* ── Parents Row ──────────────────────────────────────── */}
            {relations.parents.length > 0 && (
              <>
                <div className="flex items-end justify-center gap-4">
                  {relations.parents.map((parent, idx) => (
                    <div key={parent.id} className="flex items-center gap-3">
                      <MemberCard
                        member={parent}
                        onClick={() => handleMemberClick(parent.id)}
                        onViewDetails={() => handleMemberCardClick(parent.id)}
                      />
                      {/* Marriage connector between parents */}
                      {idx === 0 && relations.parents.length === 2 && (
                        <div className="flex flex-col items-center">
                          <div className="w-12 border-t-2 border-dashed border-[var(--color-border)]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Vertical connector to focused member */}
                <div className="flex flex-col items-center my-3">
                  <div className="w-0.5 h-10 bg-[var(--color-border)]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-border)]" />
                </div>
              </>
            )}

            {/* ── Focused Member + Spouses Row ─────────────────────── */}
            <div className="relative w-full flex items-center min-h-[300px]">
              {/* Focused member - absolutely centered with background to cover spouses */}
              <div className="absolute left-1/2 -translate-x-1/2 z-20">
                <div className="bg-[var(--color-background)] px-3 py-2 -mx-3 -my-2 rounded-2xl">
                  <MemberCard
                    member={relations.member}
                    isFocused
                    onClick={() => {}} // Already focused, no action needed
                    onViewDetails={() => handleMemberCardClick(relations.member.id)}
                  />
                </div>
              </div>

              {/* Spouses container - only on right side, scrollable */}
              <div className="absolute left-1/2 flex items-center overflow-x-auto overflow-y-hidden pr-4 spouse-scroll-container" style={{ width: 'calc(50% - 140px)', marginLeft: '140px' }}>
                <div className="flex items-center gap-4 min-w-max">
                  {[...relations.spouses]
                    .sort((a, b) => {
                      // Sort by marriage date (ascending - earliest first)
                      const dateA = new Date(a.married).getTime()
                      const dateB = new Date(b.married).getTime()
                      return dateA - dateB
                    })
                    .map((spouse) => (
                      <div key={spouse.id} className="flex items-center gap-4 shrink-0">
                        {/* Marriage connector */}
                        <div className="flex flex-col items-center gap-1">
                          <button
                            onClick={() => {
                              if (canEdit) {
                                setMarriageEditModal({
                                  member1Id: relations.member.id,
                                  member2Id: spouse.id,
                                  married: spouse.married,
                                  divorced: spouse.divorced,
                                })
                              }
                            }}
                            disabled={!canEdit}
                            className={`
                              text-base transition-colors cursor-pointer
                              ${canEdit
                                ? 'text-[var(--color-text-tertiary)] hover:text-[var(--color-accent)]'
                                : 'text-[var(--color-text-tertiary)] cursor-default'
                              }
                            `}
                            title={canEdit ? 'Edit marriage details' : undefined}
                            aria-label="Edit marriage details"
                          >
                            ♥
                          </button>
                          <div className="w-10 border-t-2 border-dashed border-[var(--color-border)]" />
                        </div>
                        <MemberCard
                          member={spouse}
                          onClick={() => handleMemberClick(spouse.id)}
                          onViewDetails={() => handleMemberCardClick(spouse.id)}
                        />
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* ── Children Row ─────────────────────────────────────── */}
            {relations.children.length > 0 && (
              <>
                {/* Vertical connector to children */}
                <div className="flex flex-col items-center my-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-border)]" />
                  <div className="w-0.5 h-10 bg-[var(--color-border)]" />
                </div>

                {/* Horizontal spread line for multiple children */}
                {relations.children.length > 1 && (
                  <div
                    className="border-t-2 border-[var(--color-border)] mb-3"
                    style={{
                      width: `${Math.min(relations.children.length * 280, 1200)}px`,
                    }}
                  />
                )}

                <div className="w-full overflow-x-auto overflow-y-hidden pb-4 px-4 spouse-scroll-container">
                  <div className="flex items-start justify-center gap-6 min-w-max">
                    {relations.children.map((child) => (
                      <MemberCard
                        key={child.id}
                        member={child}
                        onClick={() => handleMemberClick(child.id)}
                        onViewDetails={() => handleMemberCardClick(child.id)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Empty hint when tree has only one member */}
            {relations.parents.length === 0 &&
              relations.spouses.length === 0 &&
              relations.children.length === 0 && (
                <p className="mt-8 text-sm text-[var(--color-text-tertiary)] text-center">
                  This is the first tree member. Expand the member to view details and add new members.
                </p>
              )}
          </div>
        )}
      </div>

      {/* ── Member Detail Modal ──────────────────────────────────────── */}
      <MemberDetailModal
        open={detailModalMemberId !== null}
        onClose={() => setDetailModalMemberId(null)}
        memberId={detailModalMemberId}
        canEdit={canEdit}
        treeId={treeId}
        onEdit={
          canEdit
            ? () => {
                if (detailModalMemberId) {
                  setFormModalMode('edit')
                  setFormModalRelatedId(detailModalMemberId)
                }
              }
            : undefined
        }
        onAddChild={
          canEdit
            ? () => {
                if (detailModalMemberId) {
                  setFormModalMode('create-child')
                  setFormModalRelatedId(detailModalMemberId)
                }
              }
            : undefined
        }
        onAddParent={
          canEdit
            ? () => {
                if (detailModalMemberId) {
                  setFormModalMode('create-parent')
                  setFormModalRelatedId(detailModalMemberId)
                }
              }
            : undefined
        }
        onAddSpouse={
          canEdit
            ? () => {
                if (detailModalMemberId) {
                  setFormModalMode('create-spouse')
                  setFormModalRelatedId(detailModalMemberId)
                }
              }
            : undefined
        }
      />

      {/* ── Member Form Modal (Create/Edit) ───────────────────────────── */}
      <MemberFormModal
        open={formModalMode !== null}
        onClose={() => {
          setFormModalMode(null)
          setFormModalRelatedId(undefined)
        }}
        mode={formModalMode ?? 'edit'}
        relatedMemberId={
          formModalMode !== 'edit' ? formModalRelatedId : undefined
        }
        memberId={formModalMode === 'edit' ? formModalRelatedId : undefined}
        onSuccess={() => {
          // The mutations already invalidate queries, which will trigger a refetch
          // No need to manually call handleMemberClick - the query will refetch automatically
        }}
      />

      {/* ── Delete Modal ───────────────────────────────────────────── */}
      <DeleteTreeModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        treeId={treeId ?? ''}
        treeName={treeName}
      />

      {/* ── Quit Modal ───────────────────────────────────────────── */}
      <QuitTreeModal
        open={showQuitModal}
        onClose={() => setShowQuitModal(false)}
        treeId={treeId ?? ''}
        treeName={treeName}
      />

      {/* ── Marriage Edit Modal ─────────────────────────────────────── */}
      <MarriageEditModal
        open={marriageEditModal !== null}
        onClose={() => setMarriageEditModal(null)}
        member1Id={marriageEditModal?.member1Id ?? null}
        member2Id={marriageEditModal?.member2Id ?? null}
        currentMarried={marriageEditModal?.married ?? ''}
        currentDivorced={marriageEditModal?.divorced ?? null}
      />
    </div>
  )
}

