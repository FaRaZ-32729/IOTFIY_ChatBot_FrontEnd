/**
 * Utility helpers for the IoTFIY Chatbot frontend.
 */

/**
 * Convert a base64 string to a playable audio Blob URL.
 * @param {string} base64 — MP3 audio encoded as base64
 * @returns {string} Object URL that can be set as <audio>.src
 */
export function base64ToAudioUrl(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "audio/mpeg" });
  return URL.createObjectURL(blob);
}

/**
 * Format a timestamp into a readable short time string.
 * @param {Date|string} date
 * @returns {string}
 */
export function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Very simple heuristic to detect if a block of text
 * is primarily Urdu / Arabic script.
 */
export function containsUrduScript(text) {
  // Check for Arabic/Urdu Unicode range
  const urduPattern = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return urduPattern.test(text);
}

/**
 * Generate a UUID v4 (fallback when crypto.randomUUID is unavailable).
 */
export function generateSessionId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
