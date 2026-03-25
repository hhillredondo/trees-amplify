import { describe, it, expect } from 'vitest'
import { encodeUuid, resolveShortId } from '../shortId'

describe('encodeUuid', () => {
  it('returns a 12-character base64url string', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    const result = encodeUuid(uuid)
    expect(result).toHaveLength(12)
    expect(result).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('produces consistent output for the same input', () => {
    const uuid = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
    expect(encodeUuid(uuid)).toBe(encodeUuid(uuid))
  })

  it('produces different output for different UUIDs', () => {
    const a = encodeUuid('550e8400-e29b-41d4-a716-446655440000')
    const b = encodeUuid('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    expect(a).not.toBe(b)
  })
})

describe('resolveShortId', () => {
  const uuids = [
    '550e8400-e29b-41d4-a716-446655440000',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  ]

  it('finds the correct UUID from a list', () => {
    const shortId = encodeUuid(uuids[1])
    const result = resolveShortId(shortId, uuids)
    expect(result).toBe(uuids[1])
  })

  it('returns undefined when no match is found', () => {
    const result = resolveShortId('XXXXXXXXXXXX', uuids)
    expect(result).toBeUndefined()
  })

  it('returns the first UUID when its short ID is queried', () => {
    const shortId = encodeUuid(uuids[0])
    expect(resolveShortId(shortId, uuids)).toBe(uuids[0])
  })
})
