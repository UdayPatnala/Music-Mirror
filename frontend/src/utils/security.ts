/**
 * Defensive Security & Data Sanitization Utilities
 * MusicMirror Application Security Infrastructure
 */

/**
 * Sanitizes user-controlled string inputs to prevent HTML/XSS injection.
 */
export function sanitizeInputText(input: string, maxLength: number = 100): string {
  if (typeof input !== 'string') return '';
  const trimmed = input.trim().slice(0, maxLength);
  // Strip HTML tags and dangerous characters
  return trimmed
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/`/g, '&#x60;');
}

/**
 * Validates audio stream URLs against allowed protocols to prevent dangerous URI schemes (javascript:, vbscript:, etc.)
 */
export function isValidAudioUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  
  // Allow safe web audio protocols
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://') || trimmed.startsWith('blob:') || trimmed.startsWith('data:audio/')) {
    // Reject script execution URIs inside parameters
    if (trimmed.includes('javascript:') || trimmed.includes('vbscript:')) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * Escapes untrusted external metadata (Track Title, Artist Name, Album Name).
 */
export function sanitizeMetadataText(text: string): string {
  if (typeof text !== 'string') return 'Unknown';
  return text
    .replace(/</g, '')
    .replace(/>/g, '')
    .trim() || 'Unknown';
}
