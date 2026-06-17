import { useEffect, useRef, useState } from "react";
import { extractImageId, hasImageMarker } from "../utils/imageExtractor.js";

/**
 * useImageSync Hook
 * Listens to WebSocket text stream from Gemini Live and extracts image IDs
 * Triggers on incoming assistant text that contains [[SHOW_IMAGE:X]] markers
 *
 * @param {Function} onImageIdChange - Callback when image ID is extracted
 * @param {Object} wsHandlers - WebSocket handlers to attach listeners to
 * @returns {Object} - { currentImageId, lastExtractedId, markerText }
 */
export function useImageSync(onImageIdChange = null, wsHandlers = {}) {
  const [currentImageId, setCurrentImageId] = useState(null);
  const [lastExtractedId, setLastExtractedId] = useState(null);
  const [markerText, setMarkerText] = useState("");

  const transcriptBufferRef = useRef("");
  const extractedRef = useRef(new Set()); // Track already-extracted markers to avoid duplicates

  /**
   * Process incoming transcript text from Gemini
   * Looks for [[SHOW_IMAGE:X]] markers and extracts the image ID
   */
  const processTranscript = (role, text) => {
    if (role !== "assistant" || !text) return;

    // Append to buffer for continuous scanning
    transcriptBufferRef.current += text;

    // Check if this chunk or buffer contains a marker
    const allText = transcriptBufferRef.current;
    const imageId = extractImageId(allText);

    if (imageId && !extractedRef.current.has(imageId)) {
      console.log(`[useImageSync] Extracted image ID: ${imageId} from marker`);

      // Mark as extracted to avoid reprocessing
      extractedRef.current.add(imageId);

      // Update state
      setCurrentImageId(imageId);
      setLastExtractedId(imageId);
      setMarkerText(allText);

      // Trigger callback
      onImageIdChange?.(imageId);

      // Clear buffer after successful extraction
      transcriptBufferRef.current = "";
    }
  };

  /**
   * Handle turn complete - reset buffer if no marker was found
   */
  const handleTurnComplete = () => {
    // Clear buffer at the end of a turn, ready for next response
    transcriptBufferRef.current = "";
  };

  /**
   * Attach the transcript listener to wsHandlers
   */
  useEffect(() => {
    if (!wsHandlers) return;

    // Store original handlers
    const originalOnTranscript = wsHandlers.onTranscript;
    const originalOnTurnComplete = wsHandlers.onTurnComplete;

    // Wrap transcript handler
    wsHandlers.onTranscript = (role, text) => {
      processTranscript(role, text);
      // Call original handler if it exists
      originalOnTranscript?.(role, text);
    };

    // Wrap turn complete handler
    wsHandlers.onTurnComplete = () => {
      handleTurnComplete();
      // Call original handler if it exists
      originalOnTurnComplete?.();
    };

    // Return cleanup function
    return () => {
      // Restore original handlers (if needed)
      if (originalOnTranscript) {
        wsHandlers.onTranscript = originalOnTranscript;
      }
      if (originalOnTurnComplete) {
        wsHandlers.onTurnComplete = originalOnTurnComplete;
      }
    };
  }, [onImageIdChange, wsHandlers]);

  return {
    currentImageId,
    lastExtractedId,
    markerText,
  };
}

/**
 * Alternative: Manual trigger function for image sync
 * Use this if you're processing text outside of the useEffect hook
 *
 * @param {string} text - Text to scan for image markers
 * @returns {number|null} - Extracted image ID or null
 */
export function extractImageFromText(text) {
  return extractImageId(text);
}
