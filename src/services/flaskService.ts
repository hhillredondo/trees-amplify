import { fetchAuthSession } from 'aws-amplify/auth'
import type {
  AcquireLockResponse,
  AddRoleInput,
  AddRoleResponse,
  AuthMeResponse,
  CreateChildInput,
  CreateParentInput,
  CreateSpouseInput,
  CreateTreeInput,
  CreateTreeResponse,
  DirectRelations,
  ListRolesResponse,
  ListTreesResponse,
  LockStatusResponse,
  Member,
  PicUploadResponse,
  PicUrlResponse,
  PhotosUploadResponse,
  PhotosUrlsResponse,
  ReleaseLockResponse,
  RemoveRoleInput,
  RemoveRoleResponse,
  UpdateMemberInput,
  UpdateSpouseRelationInput,
} from '@/types'

// ─── Core HTTP client ────────────────────────────────────────────────────────

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

const BASE_URL = import.meta.env.VITE_FLASK_API_URL || ''

async function getAuthHeaders(): Promise<Record<string, string>> {
  const session = await fetchAuthSession()
  const token = session.tokens?.idToken?.toString()
  if (!token) throw new Error('Authentication required')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  partitionKey?: string
  /** Set to true for multipart/form-data requests (Content-Type omitted) */
  isFormData?: boolean
}

async function request<T>(endpoint: string, opts: RequestOptions = {}): Promise<T> {
  const headers = await getAuthHeaders()

  if (opts.partitionKey) {
    headers['X-Partition-Key'] = opts.partitionKey
  }

  // For FormData, remove Content-Type so the browser sets the boundary
  if (opts.isFormData) {
    delete headers['Content-Type']
  }

  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.isFormData
        ? (opts.body as FormData)
        : opts.body
          ? JSON.stringify(opts.body)
          : undefined,
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      const message = (body as Record<string, string>)?.message || 
                      (body as Record<string, string>)?.error ||
                      `HTTP ${response.status}: ${response.statusText}`
      
      // Handle specific error codes
      if (response.status === 401) {
        throw new HttpError(401, 'Authentication required. Please sign in again.')
      } else if (response.status === 403) {
        // Use the actual error message from backend (e.g., tree limit, storage limit)
        throw new HttpError(403, message || 'You do not have permission to perform this action.')
      } else if (response.status === 404) {
        throw new HttpError(404, 'Resource not found.')
      } else if (response.status === 409) {
        throw new HttpError(409, message || 'Conflict: This operation cannot be completed.')
      } else if (response.status >= 500) {
        throw new HttpError(response.status, 'Server error. Please try again later.')
      }
      
      throw new HttpError(response.status, message)
    }

    // Some endpoints return plain text (e.g. update spouse relation)
    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      return response.json() as Promise<T>
    }
    return (await response.text()) as unknown as T
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection and try again.')
    }
    // Re-throw other errors
    throw error
  }
}

// ─── Partition key helpers ───────────────────────────────────────────────────

let _partitionKey: string | null =
  typeof window !== 'undefined'
    ? window.localStorage.getItem('partition_key')
    : null

export function getPartitionKey(): string | null {
  return _partitionKey
}

export function setPartitionKey(key: string | null) {
  _partitionKey = key
  if (typeof window !== 'undefined') {
    if (key) {
      window.localStorage.setItem('partition_key', key)
    } else {
      window.localStorage.removeItem('partition_key')
    }
  }
}

/** Shorthand: add current partition key to request options */
function withPartition(opts: RequestOptions = {}): RequestOptions {
  const pk = opts.partitionKey ?? _partitionKey
  if (!pk) throw new Error('No partition key set — select a tree first')
  return { ...opts, partitionKey: pk }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const authApi = {
  me: () => request<AuthMeResponse>('/auth/me'),

  deleteAccount: () =>
    request<{ message: string }>('/account', { method: 'DELETE' }),
}

// ─── Trees ───────────────────────────────────────────────────────────────────

export const treesApi = {
  list: () => request<ListTreesResponse>('/trees'),

  create: (input: CreateTreeInput) =>
    request<CreateTreeResponse>('/trees', {
      method: 'POST',
      body: input,
    }),

  delete: () =>
    request<{ message: string }>('/trees', {
      ...withPartition(),
      method: 'DELETE',
    }),

  quit: () =>
    request<{ message: string }>('/trees/quit', {
      ...withPartition(),
      method: 'POST',
    }),
}

// ─── Members ─────────────────────────────────────────────────────────────────

export const membersApi = {
  get: (id: string) =>
    request<Member>(`/member?id=${encodeURIComponent(id)}`, withPartition()),

  list: () =>
    request<Member[]>('/members', withPartition()),

  update: (input: UpdateMemberInput) =>
    request<Member>('/member', {
      ...withPartition(),
      method: 'PUT',
      body: input,
    }),

  delete: (memberId: string) =>
    request<{ message: string }>('/member', {
      ...withPartition(),
      method: 'DELETE',
      body: { member_id: memberId },
    }),

  directRelations: (id: string) =>
    request<DirectRelations>(
      `/memberDirectRelations?id=${encodeURIComponent(id)}`,
      withPartition(),
    ),
}

// ─── Composed member endpoints ───────────────────────────────────────────────

export const relationsApi = {
  createChild: (input: CreateChildInput) =>
    request<Member>('/child', {
      ...withPartition(),
      method: 'POST',
      body: input,
    }),

  createParent: (input: CreateParentInput) =>
    request<Member>('/parent', {
      ...withPartition(),
      method: 'POST',
      body: input,
    }),

  createSpouse: (input: CreateSpouseInput) =>
    request<Member>('/spouse', {
      ...withPartition(),
      method: 'POST',
      body: input,
    }),

  updateSpouseRelation: (input: UpdateSpouseRelationInput) =>
    request<string>('/spouse', {
      ...withPartition(),
      method: 'PUT',
      body: input,
    }),
}

// ─── Roles / ACL ─────────────────────────────────────────────────────────────

export const rolesApi = {
  list: () =>
    request<ListRolesResponse>('/roles', withPartition()),

  add: (input: AddRoleInput) =>
    request<AddRoleResponse>('/roles', {
      ...withPartition(),
      method: 'POST',
      body: input,
    }),

  remove: (input: RemoveRoleInput) =>
    request<RemoveRoleResponse>('/roles', {
      ...withPartition(),
      method: 'DELETE',
      body: input,
    }),
}

// ─── Editor Lock ─────────────────────────────────────────────────────────────

export const editorLockApi = {
  status: () =>
    request<LockStatusResponse>('/editor-lock', withPartition()),

  acquire: () =>
    request<AcquireLockResponse>('/editor-lock', {
      ...withPartition(),
      method: 'POST',
    }),

  release: () =>
    request<ReleaseLockResponse>('/editor-lock', {
      ...withPartition(),
      method: 'DELETE',
    }),

  forceRelease: () =>
    request<ReleaseLockResponse>('/editor-lock/force', {
      ...withPartition(),
      method: 'POST',
    }),
}

// ─── Media ───────────────────────────────────────────────────────────────────

export const mediaApi = {
  uploadPic: (memberId: string, file: File) => {
    const form = new FormData()
    form.append('member_id', memberId)
    form.append('file', file)
    return request<PicUploadResponse>('/member/pic', {
      ...withPartition(),
      method: 'POST',
      body: form,
      isFormData: true,
    })
  },

  uploadPhotos: (memberId: string, files: File[]) => {
    const form = new FormData()
    form.append('member_id', memberId)
    files.forEach((f) => form.append('files', f))
    return request<PhotosUploadResponse>('/member/photos', {
      ...withPartition(),
      method: 'POST',
      body: form,
      isFormData: true,
    })
  },

  getPicUrl: (memberId: string, expiresIn?: number) => {
    const params = new URLSearchParams({ member_id: memberId })
    if (expiresIn) params.set('expires_in', String(expiresIn))
    return request<PicUrlResponse>(
      `/member/pic-url?${params}`,
      withPartition(),
    )
  },

  getPhotosUrls: (memberId: string, expiresIn?: number) => {
    const params = new URLSearchParams({ member_id: memberId })
    if (expiresIn) params.set('expires_in', String(expiresIn))
    return request<PhotosUrlsResponse>(
      `/member/photos-urls?${params}`,
      withPartition(),
    )
  },
}
