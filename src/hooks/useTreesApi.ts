import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import {
  treesApi,
  membersApi,
  relationsApi,
  rolesApi,
  editorLockApi,
  mediaApi,
  authApi,
  setPartitionKey,
} from '@/services/flaskService'
import { useEditorLockWrapper } from './useEditorLockWrapper'
import type {
  AddRoleInput,
  CreateChildInput,
  CreateParentInput,
  CreateSpouseInput,
  CreateTreeInput,
  DirectRelations,
  ListRolesResponse,
  ListTreesResponse,
  LockStatusResponse,
  Member,
  RemoveRoleInput,
  UpdateMemberInput,
  UpdateSpouseRelationInput,
} from '@/types'

// ─── Query keys ──────────────────────────────────────────────────────────────

export const queryKeys = {
  trees: ['trees'] as const,
  members: (partitionKey: string) => ['members', partitionKey] as const,
  member: (partitionKey: string, id: string) => ['member', partitionKey, id] as const,
  directRelations: (partitionKey: string, id: string) =>
    ['directRelations', partitionKey, id] as const,
  roles: (partitionKey: string) => ['roles', partitionKey] as const,
  editorLock: (partitionKey: string) => ['editorLock', partitionKey] as const,
  picUrl: (partitionKey: string, memberId: string) =>
    ['picUrl', partitionKey, memberId] as const,
  photosUrls: (partitionKey: string, memberId: string) =>
    ['photosUrls', partitionKey, memberId] as const,
  documentsUrls: (partitionKey: string, memberId: string) =>
    ['documentsUrls', partitionKey, memberId] as const,
  authMe: ['auth', 'me'] as const,
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export function useAuthMe(
  options?: Partial<UseQueryOptions<{ user: import('@/types').UserInfo; message: string }>>,
) {
  return useQuery({
    queryKey: queryKeys.authMe,
    queryFn: authApi.me,
    ...options,
  })
}

export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: authApi.deleteAccount,
    onSuccess: () => qc.clear(),
  })
}

// ─── Trees ───────────────────────────────────────────────────────────────────

export function useTrees(
  options?: Partial<UseQueryOptions<ListTreesResponse>>,
) {
  return useQuery({
    queryKey: queryKeys.trees,
    queryFn: treesApi.list,
    ...options,
  })
}

export function useCreateTree() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateTreeInput) => treesApi.create(input),
    onSuccess: (data) => {
      // Auto-set the partition key for the newly-created tree
      setPartitionKey(data.partition_key)
      qc.invalidateQueries({ queryKey: queryKeys.trees })
    },
  })
}

export function useDeleteTree() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: treesApi.delete,
    onSuccess: () => {
      setPartitionKey(null)
      qc.invalidateQueries({ queryKey: queryKeys.trees })
    },
  })
}

export function useQuitTree() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: treesApi.quit,
    onSuccess: () => {
      setPartitionKey(null)
      qc.invalidateQueries({ queryKey: queryKeys.trees })
    },
  })
}

// ─── Members ─────────────────────────────────────────────────────────────────

export function useMembers(
  partitionKey: string | null,
  options?: Partial<UseQueryOptions<Member[]>>,
) {
  return useQuery({
    queryKey: queryKeys.members(partitionKey ?? ''),
    queryFn: membersApi.list,
    enabled: !!partitionKey,
    ...options,
  })
}

export function useMember(
  partitionKey: string | null,
  memberId: string | null,
  options?: Partial<UseQueryOptions<Member>>,
) {
  return useQuery({
    queryKey: queryKeys.member(partitionKey ?? '', memberId ?? ''),
    queryFn: () => membersApi.get(memberId!),
    enabled: !!partitionKey && !!memberId,
    ...options,
  })
}

export function useDirectRelations(
  partitionKey: string | null,
  memberId: string | null,
  options?: Partial<UseQueryOptions<DirectRelations>>,
) {
  return useQuery({
    queryKey: queryKeys.directRelations(partitionKey ?? '', memberId ?? ''),
    queryFn: () => membersApi.directRelations(memberId!),
    enabled: !!partitionKey && !!memberId,
    ...options,
  })
}

export function useUpdateMember(partitionKey: string | null) {
  const qc = useQueryClient()
  const lockWrapper = useEditorLockWrapper(partitionKey, (input: UpdateMemberInput) =>
    membersApi.update(input),
  )

  return useMutation({
    mutationFn: lockWrapper,
    onSuccess: (_data, variables) => {
      if (partitionKey) {
        qc.invalidateQueries({
          queryKey: queryKeys.member(partitionKey, variables.id),
        })
        qc.invalidateQueries({ queryKey: queryKeys.members(partitionKey) })
        // Invalidate all directRelations queries to refresh tree view
        qc.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'directRelations' &&
            query.queryKey[1] === partitionKey,
        })
      }
    },
  })
}

export function useDeleteMember(partitionKey: string | null) {
  const qc = useQueryClient()
  const lockWrapper = useEditorLockWrapper(partitionKey, (memberId: string) =>
    membersApi.delete(memberId),
  )

  return useMutation({
    mutationFn: lockWrapper,
    onSuccess: () => {
      if (partitionKey) {
        qc.invalidateQueries({ queryKey: queryKeys.members(partitionKey) })
        // Invalidate all directRelations queries to refresh tree view
        qc.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'directRelations' &&
            query.queryKey[1] === partitionKey,
        })
      }
      qc.invalidateQueries({ queryKey: queryKeys.trees })
    },
  })
}

// ─── Relations (create child / parent / spouse) ──────────────────────────────

export function useCreateChild(partitionKey: string | null) {
  const qc = useQueryClient()
  const lockWrapper = useEditorLockWrapper(partitionKey, (input: CreateChildInput) =>
    relationsApi.createChild(input),
  )

  return useMutation({
    mutationFn: lockWrapper,
    onSuccess: () => {
      if (partitionKey) {
        qc.invalidateQueries({ queryKey: queryKeys.members(partitionKey) })
        // Invalidate all directRelations queries to refresh tree view
        qc.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'directRelations' &&
            query.queryKey[1] === partitionKey,
        })
      }
    },
  })
}

export function useCreateParent(partitionKey: string | null) {
  const qc = useQueryClient()
  const lockWrapper = useEditorLockWrapper(partitionKey, (input: CreateParentInput) =>
    relationsApi.createParent(input),
  )

  return useMutation({
    mutationFn: lockWrapper,
    onSuccess: () => {
      if (partitionKey) {
        qc.invalidateQueries({ queryKey: queryKeys.members(partitionKey) })
        // Invalidate all directRelations queries to refresh tree view
        qc.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'directRelations' &&
            query.queryKey[1] === partitionKey,
        })
      }
    },
  })
}

export function useCreateSpouse(partitionKey: string | null) {
  const qc = useQueryClient()
  const lockWrapper = useEditorLockWrapper(partitionKey, (input: CreateSpouseInput) =>
    relationsApi.createSpouse(input),
  )

  return useMutation({
    mutationFn: lockWrapper,
    onSuccess: () => {
      if (partitionKey) {
        qc.invalidateQueries({ queryKey: queryKeys.members(partitionKey) })
        // Invalidate all directRelations queries to refresh tree view
        qc.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'directRelations' &&
            query.queryKey[1] === partitionKey,
        })
      }
    },
  })
}

export function useUpdateSpouseRelation(partitionKey: string | null) {
  const qc = useQueryClient()
  const lockWrapper = useEditorLockWrapper(
    partitionKey,
    (input: UpdateSpouseRelationInput) => relationsApi.updateSpouseRelation(input),
  )

  return useMutation({
    mutationFn: lockWrapper,
    onSuccess: () => {
      if (partitionKey) {
        qc.invalidateQueries({ queryKey: queryKeys.members(partitionKey) })
        // Invalidate all directRelations queries to refresh tree view
        qc.invalidateQueries({
          predicate: (query) =>
            query.queryKey[0] === 'directRelations' &&
            query.queryKey[1] === partitionKey,
        })
      }
    },
  })
}

// ─── Roles / ACL ─────────────────────────────────────────────────────────────

export function useRoles(
  partitionKey: string | null,
  options?: Partial<UseQueryOptions<ListRolesResponse>>,
) {
  return useQuery({
    queryKey: queryKeys.roles(partitionKey ?? ''),
    queryFn: rolesApi.list,
    enabled: !!partitionKey,
    ...options,
  })
}

export function useAddRole(partitionKey: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: AddRoleInput) => rolesApi.add(input),
    onSuccess: () => {
      if (partitionKey) {
        qc.invalidateQueries({ queryKey: queryKeys.roles(partitionKey) })
      }
    },
  })
}

export function useRemoveRole(partitionKey: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RemoveRoleInput) => rolesApi.remove(input),
    onSuccess: () => {
      if (partitionKey) {
        qc.invalidateQueries({ queryKey: queryKeys.roles(partitionKey) })
      }
    },
  })
}

// ─── Editor Lock ─────────────────────────────────────────────────────────────

export function useEditorLockStatus(
  partitionKey: string | null,
  options?: Partial<UseQueryOptions<LockStatusResponse>>,
) {
  return useQuery({
    queryKey: queryKeys.editorLock(partitionKey ?? ''),
    queryFn: editorLockApi.status,
    enabled: !!partitionKey,
    ...options,
  })
}

export function useAcquireEditorLock(partitionKey: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: editorLockApi.acquire,
    onSuccess: () => {
      if (partitionKey) {
        qc.invalidateQueries({ queryKey: queryKeys.editorLock(partitionKey) })
      }
    },
  })
}

export function useReleaseEditorLock(partitionKey: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: editorLockApi.release,
    onSuccess: () => {
      if (partitionKey) {
        qc.invalidateQueries({ queryKey: queryKeys.editorLock(partitionKey) })
      }
    },
  })
}

export function useForceReleaseEditorLock(partitionKey: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: editorLockApi.forceRelease,
    onSuccess: () => {
      if (partitionKey) {
        qc.invalidateQueries({ queryKey: queryKeys.editorLock(partitionKey) })
      }
    },
  })
}

// ─── Media ───────────────────────────────────────────────────────────────────

export function usePicUrl(
  partitionKey: string | null,
  memberId: string | null,
  options?: Partial<UseQueryOptions<import('@/types').PicUrlResponse>>,
) {
  return useQuery({
    queryKey: queryKeys.picUrl(partitionKey ?? '', memberId ?? ''),
    queryFn: () => mediaApi.getPicUrl(memberId!),
    enabled: !!partitionKey && !!memberId,
    ...options,
  })
}

export function usePhotosUrls(
  partitionKey: string | null,
  memberId: string | null,
  options?: Partial<UseQueryOptions<import('@/types').PhotosUrlsResponse>>,
) {
  return useQuery({
    queryKey: queryKeys.photosUrls(partitionKey ?? '', memberId ?? ''),
    queryFn: () => mediaApi.getPhotosUrls(memberId!),
    enabled: !!partitionKey && !!memberId,
    ...options,
  })
}

export function useUploadPic(partitionKey: string | null) {
  const qc = useQueryClient()
  const lockWrapper = useEditorLockWrapper(partitionKey, ({ memberId, file }: { memberId: string; file: File }) =>
    mediaApi.uploadPic(memberId, file),
  )

  return useMutation({
    mutationFn: lockWrapper,
    onSuccess: (_data, variables) => {
      if (partitionKey) {
        qc.invalidateQueries({
          queryKey: queryKeys.picUrl(partitionKey, variables.memberId),
        })
        qc.invalidateQueries({
          queryKey: queryKeys.member(partitionKey, variables.memberId),
        })
      }
    },
  })
}

export function useUploadPhotos(partitionKey: string | null) {
  const qc = useQueryClient()
  const lockWrapper = useEditorLockWrapper(partitionKey, ({ memberId, files }: { memberId: string; files: File[] }) =>
    mediaApi.uploadPhotos(memberId, files),
  )

  return useMutation({
    mutationFn: lockWrapper,
    onSuccess: (_data, variables) => {
      if (partitionKey) {
        qc.invalidateQueries({
          queryKey: queryKeys.photosUrls(partitionKey, variables.memberId),
        })
        qc.invalidateQueries({
          queryKey: queryKeys.member(partitionKey, variables.memberId),
        })
      }
    },
  })
}

export function useDocumentsUrls(
  partitionKey: string | null,
  memberId: string | null,
  options?: Partial<UseQueryOptions<import('@/types').DocumentsUrlsResponse>>,
) {
  return useQuery({
    queryKey: queryKeys.documentsUrls(partitionKey ?? '', memberId ?? ''),
    queryFn: () => mediaApi.getDocumentsUrls(memberId!),
    enabled: !!partitionKey && !!memberId,
    ...options,
  })
}

export function useUploadDocuments(partitionKey: string | null) {
  const qc = useQueryClient()
  const lockWrapper = useEditorLockWrapper(partitionKey, ({ memberId, files }: { memberId: string; files: File[] }) =>
    mediaApi.uploadDocuments(memberId, files),
  )

  return useMutation({
    mutationFn: lockWrapper,
    onSuccess: (_data, variables) => {
      if (partitionKey) {
        qc.invalidateQueries({
          queryKey: queryKeys.documentsUrls(partitionKey, variables.memberId),
        })
        qc.invalidateQueries({
          queryKey: queryKeys.member(partitionKey, variables.memberId),
        })
      }
    },
  })
}

