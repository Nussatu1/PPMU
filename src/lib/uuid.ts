/**
 * Centralized UUID Compatibility Utility
 *
 * Provides RFC 4122 Version 4 compliant UUID generation across all client environments:
 * 1. Primary: native `crypto.randomUUID()` when supported (modern browsers in secure contexts).
 * 2. Secondary: `crypto.getRandomValues()` when randomUUID is unavailable.
 * 3. Fallback: High-resolution timestamp + micro-randomness fallback for non-secure / legacy contexts.
 *
 * NOTE: Suitable for UI identifiers, local database entities, and mock/demo records.
 * Never use for cryptographic session secrets, password reset tokens, or auth credentials.
 */

export function generateUUID(): string {
  // 1. Try native crypto.randomUUID() if supported
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // Fall through to fallback if it throws unexpectedly
    }
  }

  // 2. Try crypto.getRandomValues() (supported in almost all browsers, even without randomUUID)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    try {
      const bytes = new Uint8Array(16)
      crypto.getRandomValues(bytes)

      // Set RFC 4122 version 4 and variant
      bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
      bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10xx

      const hex: string[] = []
      for (let i = 0; i < 16; i++) {
        hex.push(bytes[i].toString(16).padStart(2, '0'))
      }

      return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`
    } catch {
      // Fall through to non-crypto fallback
    }
  }

  // 3. Fallback: RFC 4122 compliant UUID v4 using timestamp and pseudo-randomness
  let d = Date.now()
  let d2 = (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? Math.floor(performance.now() * 1000)
    : 0

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r = Math.random() * 16
    if (d > 0) {
      r = (d + r) % 16 | 0
      d = Math.floor(d / 16)
    } else if (d2 > 0) {
      r = (d2 + r) % 16 | 0
      d2 = Math.floor(d2 / 16)
    } else {
      r = r | 0
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}
