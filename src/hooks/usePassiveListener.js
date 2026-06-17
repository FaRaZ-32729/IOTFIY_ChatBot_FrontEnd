/**
 * Passive listener hook — listens for a keyword using the Web Speech API
 * (SpeechRecognition) without requiring any button press.
 * Used to detect the "Play" activation keyword.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export function usePassiveListener({ keywords = ["play"], enabled = true, onDetected }) {
  const recognitionRef = useRef(null);
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onDetectedRef = useRef(onDetected);
  const keywordsRef = useRef(keywords);
  keywordsRef.current = keywords;
  onDetectedRef.current = onDetected;
  onDetectedRef.current = onDetected;
  const restartTimerRef = useRef(null);
  const detectedRef = useRef(false);
  const [isListening, setIsListening] = useState(false);
  const [micPermissionGranted, setMicPermissionGranted] = useState(false);

  // Request microphone permission on mount so SpeechRecognition doesn't silently fail
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((track) => track.stop());
        console.log("[PassiveListener] Microphone permission granted.");
        setMicPermissionGranted(true);
      })
      .catch((err) => {
        console.error("[PassiveListener] Microphone permission denied:", err);
      });
  }, []);

  const startRecognition = useCallback(() => {
    // Check for browser support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("[PassiveListener] SpeechRecognition not supported in this browser.");
      return;
    }

    if (!micPermissionGranted) {
      console.log("[PassiveListener] Waiting for microphone permission...");
      // We will try again shortly
      restartTimerRef.current = setTimeout(() => {
        if (enabledRef.current && !detectedRef.current) startRecognition();
      }, 2000);
      return;
    }

    // Cleanup existing
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      setIsListening(true);
      console.log("[PassiveListener] Listening for activation keyword...");
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript.toLowerCase().trim();
          console.log("[PassiveListener] Heard:", transcript);
          const transcriptWords = transcript.split(/[\s,.-]+/);
          const matchedKeyword = keywordsRef.current.find(k => {
            const lowerK = k.toLowerCase();
            // Exact word match (prevents "hi" from triggering on "this" or "him")
            if (transcriptWords.includes(lowerK)) return true;
            // For longer unique words like 'assalam', partial match is fine
            if (lowerK.length >= 5 && transcript.includes(lowerK)) return true;
            // Also allow exact match if the whole transcript is just that word
            if (transcript === lowerK) return true;
            return false;
          });
          if (matchedKeyword) {
            console.log(`[PassiveListener] ✅ Keyword "${matchedKeyword}" detected!`);
            detectedRef.current = true;
            enabledRef.current = false;
            if (restartTimerRef.current) {
              clearTimeout(restartTimerRef.current);
              restartTimerRef.current = null;
            }
            // Stop passive listening
            try {
              recognition.abort();
            } catch {
              /* ignore */
            }
            recognitionRef.current = null;
            setIsListening(false);

            // Give SpeechRecognition a brief moment to release the mic before
            // the live voice session opens its own audio stream.
            setTimeout(() => {
              onDetectedRef.current?.(matchedKeyword);
            }, 250);
            return;
          }
        }
      }
    };

    recognition.onerror = (event) => {
      console.log("[PassiveListener] Error:", event.error);
      // Auto-restart on non-fatal errors
      if (
        event.error === "no-speech" ||
        event.error === "aborted" ||
        event.error === "network"
      ) {
        // Restart after a brief delay
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current && !detectedRef.current) {
            startRecognition();
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Auto-restart if still enabled
      if (enabledRef.current && !detectedRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (enabledRef.current && !detectedRef.current) {
            startRecognition();
          }
        }, 500);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("[PassiveListener] Start error:", err);
    }
  }, [micPermissionGranted]);

  const stopRecognition = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  useEffect(() => {
    if (enabled) {
      detectedRef.current = false;
      startRecognition();
    } else {
      stopRecognition();
    }

    return () => {
      stopRecognition();
    };
  }, [enabled, startRecognition, stopRecognition]);

  return { isListening };
}
