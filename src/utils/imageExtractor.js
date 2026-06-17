/**
 * ImageExtractor Utility
 * Parses hidden image markers from Gemini text stream
 */

/**
 * Extracts image ID from hidden marker string
 * @param {string} text - Text potentially containing [[SHOW_IMAGE:X]] marker
 * @returns {number|null} - Image ID if found, null otherwise
 */
export function extractImageId(text) {
  if (!text) return null;
  const match = text.match(/\[\[SHOW_IMAGE:(\d+)\]\]/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Removes hidden markers from text (so they don't appear in transcripts)
 * @param {string} text - Text potentially containing [[SHOW_IMAGE:X]] markers
 * @returns {string} - Cleaned text without markers
 */
export function cleanMarkers(text) {
  if (!text) return "";
  return text.replace(/\[\[SHOW_IMAGE:\d+\]\]/g, "").trim();
}

/**
 * Checks if text contains any image marker
 * @param {string} text - Text to check
 * @returns {boolean} - True if marker found
 */
export function hasImageMarker(text) {
  return /\[\[SHOW_IMAGE:\d+\]\]/.test(text);
}

/**
 * Extracts all image IDs from text (in case of multiple markers)
 * @param {string} text - Text potentially containing [[SHOW_IMAGE:X]] markers
 * @returns {number[]} - Array of image IDs found
 */
export function extractAllImageIds(text) {
  if (!text) return [];
  const matches = text.match(/\[\[SHOW_IMAGE:(\d+)\]\]/g);
  if (!matches) return [];
  return matches.map((m) => parseInt(m.match(/\d+/)[0], 10));
}

/**
 * Converts image ID to image file path
 * @param {number} imageId - Image ID
 * @returns {string} - Path to image file (e.g., '/assets/images/image_1.png')
 */
export function getImagePath(imageId) {
  if (!imageId || imageId <= 0) return null;
  return `/assets/images/image_${imageId}.png`;
}

/**
 * Validates if an image ID is within expected range
 * @param {number} imageId - Image ID to validate
 * @param {number} maxImageId - Maximum valid image ID
 * @returns {boolean} - True if valid
 */
export function isValidImageId(imageId, maxImageId = 50) {
  return Number.isInteger(imageId) && imageId > 0 && imageId <= maxImageId;
}
