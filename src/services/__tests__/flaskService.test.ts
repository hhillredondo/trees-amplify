import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock aws-amplify/auth before importing the module under test
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn().mockResolvedValue({
    tokens: {
      idToken: { toString: () => 'fake-id-token' },
    },
  }),
}))

import {
  HttpError,
  getPartitionKey,
  setPartitionKey,
  treesApi,
  membersApi,
  authApi,
  rolesApi,
  editorLockApi,
} from '../flaskService'

describe('HttpError', () => {
  it('stores status and message', () => {
    const err = new HttpError(404, 'Not found')
    expect(err.status).toBe(404)
    expect(err.message).toBe('Not found')
    expect(err.name).toBe('HttpError')
    expect(err).toBeInstanceOf(Error)
  })
})

describe('partition key helpers', () => {
  beforeEach(() => {
    localStorage.clear()
    setPartitionKey(null)
  })

  afterEach(() => {
    localStorage.clear()
    setPartitionKey(null)
  })

  it('starts with null partition key', () => {
    expect(getPartitionKey()).toBeNull()
  })

  it('set and get partition key', () => {
    setPartitionKey('user1_tree1')
    expect(getPartitionKey()).toBe('user1_tree1')
    expect(localStorage.getItem('partition_key')).toBe('user1_tree1')
  })

  it('clearing partition key removes from localStorage', () => {
    setPartitionKey('user1_tree1')
    setPartitionKey(null)
    expect(getPartitionKey()).toBeNull()
    expect(localStorage.getItem('partition_key')).toBeNull()
  })
})

describe('API methods', () => {
  beforeEach(() => {
    setPartitionKey('user1_tree1')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setPartitionKey(null)
  })

  it('treesApi.list calls GET /trees', async () => {
    const mockResponse = { trees: [], count: 0 }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await treesApi.list()
    expect(result).toEqual(mockResponse)
    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/trees')
    expect(options?.method).toBe('GET')
  })

  it('membersApi.list includes partition key header', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve([]),
    } as Response)

    await membersApi.list()
    const [, options] = vi.mocked(fetch).mock.calls[0]
    const headers = options?.headers as Record<string, string>
    expect(headers['X-Partition-Key']).toBe('user1_tree1')
  })

  it('authApi.me calls GET /auth/me', async () => {
    const mockResponse = { user: { user_id: 'u1' }, message: 'ok' }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const result = await authApi.me()
    expect(result).toEqual(mockResponse)
    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/auth/me')
    expect(options?.method).toBe('GET')
  })

  it('throws HttpError on 401', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ message: 'Token expired' }),
    } as Response)

    await expect(treesApi.list()).rejects.toThrow(HttpError)
    await expect(treesApi.list()).rejects.toThrow('Authentication required')
  })

  it('throws HttpError on 403', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ message: 'Tree limit reached' }),
    } as Response)

    await expect(treesApi.list()).rejects.toThrow(HttpError)
    try {
      await treesApi.list()
    } catch (e) {
      expect((e as HttpError).status).toBe(403)
      expect((e as HttpError).message).toBe('Tree limit reached')
    }
  })

  it('throws HttpError on 409 conflict', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ message: 'Editor lock required' }),
    } as Response)

    await expect(editorLockApi.acquire()).rejects.toThrow(HttpError)
  })

  it('throws HttpError on 500', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({}),
    } as Response)

    await expect(treesApi.list()).rejects.toThrow('Server error')
  })

  it('rolesApi.add calls POST /roles with body', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: () => Promise.resolve({ message: 'ok' }),
    } as Response)

    await rolesApi.add({ email: 'test@example.com', role: 'editor' })
    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('/roles')
    expect(options?.method).toBe('POST')
    expect(JSON.parse(options?.body as string)).toEqual({ email: 'test@example.com', role: 'editor' })
  })

  it('throws on missing partition key for partitioned endpoints', () => {
    setPartitionKey(null)
    expect(() => membersApi.list()).toThrow('No partition key set')
  })
})
