import { useQueryClient } from '@tanstack/react-query'
import { useAcquireEditorLock } from './useTreesApi'
import { editorLockApi } from '@/services/flaskService'
import { queryKeys } from './useTreesApi'
import { useAuthMe } from './useTreesApi'
import type { LockStatusResponse } from '@/types'

/**
 * Wraps a mutation function with automatic editor lock acquisition.
 * 
 * Flow:
 * 1. Check if lock is held
 * 2. If current user holds lock → proceed
 * 3. If another user holds lock → throw error
 * 4. If no lock → acquire lock, then proceed
 */
export function useEditorLockWrapper<TData, TVariables>(
  partitionKey: string | null,
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const qc = useQueryClient()
  const { data: authData } = useAuthMe()
  const currentUserId = authData?.user?.user_id ?? null
  const acquireLock = useAcquireEditorLock(partitionKey)

  return async (variables: TVariables): Promise<TData> => {
    if (!partitionKey) {
      throw new Error('Partition key required for editor lock')
    }

    // Fetch current lock status (editorLockApi.status() already uses withPartition)
    const lockStatus = await editorLockApi.status()
    const status = lockStatus as LockStatusResponse

    // If locked by another user, throw error
    if (status.locked && status.lock && status.lock.lockOwner !== currentUserId) {
      throw new Error(
        `Tree is currently being edited by another user. Please try again later.`,
      )
    }

    // If not locked, acquire the lock
    if (!status.locked) {
      try {
        await acquireLock.mutateAsync()
        // Invalidate lock status query to update UI
        qc.invalidateQueries({ queryKey: queryKeys.editorLock(partitionKey) })
      } catch (error) {
        throw new Error(
          `Failed to acquire editor lock: ${error instanceof Error ? error.message : 'Unknown error'}`,
        )
      }
    }

    return mutationFn(variables)
  }
}

