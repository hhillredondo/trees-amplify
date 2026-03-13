const SHORT_ID_LENGTH = 12

/**
 * Encode a UUID into a URL-safe short ID (12 chars).
 *
 * Converts the hex UUID to base64url then truncates. Not reversible — use
 * {@link resolveShortId} to match back against a list of known UUIDs.
 */
export function encodeUuid(uuid: string): string {
  const hex = uuid.replaceAll('-', '')
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }

  const b64 = btoa(String.fromCodePoint(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')

  return b64.slice(0, SHORT_ID_LENGTH)
}

/**
 * Find the original UUID whose encoded short ID matches.
 * Returns `undefined` when no match is found.
 */
export function resolveShortId(
  shortId: string,
  uuids: string[],
): string | undefined {
  return uuids.find((uuid) => encodeUuid(uuid) === shortId)
}
