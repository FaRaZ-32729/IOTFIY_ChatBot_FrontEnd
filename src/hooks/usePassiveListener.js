// /**
//  * Passive listener hook — listens for a keyword using the Web Speech API
//  * (SpeechRecognition) without requiring any button press.
//  * Used to detect the "Play" activation keyword.
//  */
// import { useCallback, useEffect, useRef, useState } from "react";

// export function usePassiveListener({ keywords = ["play"], enabled = true, onDetected }) {
//   const recognitionRef = useRef(null);
//   const enabledRef = useRef(enabled);
//   enabledRef.current = enabled;
//   const onDetectedRef = useRef(onDetected);
//   const keywordsRef = useRef(keywords);
//   keywordsRef.current = keywords;
//   onDetectedRef.current = onDetected;
//   onDetectedRef.current = onDetected;
//   const restartTimerRef = useRef(null);
//   const detectedRef = useRef(false);
//   const [isListening, setIsListening] = useState(false);
//   const [micPermissionGranted, setMicPermissionGranted] = useState(false);

//   // Request microphone permission on mount so SpeechRecognition doesn't silently fail
//   useEffect(() => {
//     navigator.mediaDevices.getUserMedia({ audio: true })
//       .then((stream) => {
//         stream.getTracks().forEach((track) => track.stop());
//         console.log("[PassiveListener] Microphone permission granted.");
//         setMicPermissionGranted(true);
//       })
//       .catch((err) => {
//         console.error("[PassiveListener] Microphone permission denied:", err);
//       });
//   }, []);

//   const startRecognition = useCallback(() => {
//     // Check for browser support
//     const SpeechRecognition =
//       window.SpeechRecognition || window.webkitSpeechRecognition;
//     if (!SpeechRecognition) {
//       console.warn("[PassiveListener] SpeechRecognition not supported in this browser.");
//       return;
//     }

//     if (!micPermissionGranted) {
//       console.log("[PassiveListener] Waiting for microphone permission...");
//       // We will try again shortly
//       restartTimerRef.current = setTimeout(() => {
//         if (enabledRef.current && !detectedRef.current) startRecognition();
//       }, 2000);
//       return;
//     }

//     // Cleanup existing
//     if (recognitionRef.current) {
//       try {
//         recognitionRef.current.abort();
//       } catch {
//         /* ignore */
//       }
//     }

//     const recognition = new SpeechRecognition();
//     recognition.continuous = true;
//     recognition.interimResults = true;
//     recognition.lang = "en-US";
//     recognition.maxAlternatives = 3;

//     recognition.onstart = () => {
//       setIsListening(true);
//       console.log("[PassiveListener] Listening for activation keyword...");
//     };

//     recognition.onresult = (event) => {
//       for (let i = event.resultIndex; i < event.results.length; i++) {
//         const result = event.results[i];
//         for (let j = 0; j < result.length; j++) {
//           const transcript = result[j].transcript.toLowerCase().trim();
//           console.log("[PassiveListener] Heard:", transcript);
//           const transcriptWords = transcript.split(/[\s,.-]+/);
//           const matchedKeyword = keywordsRef.current.find(k => {
//             const lowerK = k.toLowerCase();
//             // Exact word match (prevents "hi" from triggering on "this" or "him")
//             if (transcriptWords.includes(lowerK)) return true;
//             // For longer unique words like 'assalam', partial match is fine
//             if (lowerK.length >= 5 && transcript.includes(lowerK)) return true;
//             // Also allow exact match if the whole transcript is just that word
//             if (transcript === lowerK) return true;
//             return false;
//           });
//           if (matchedKeyword) {
//             console.log(`[PassiveListener] ✅ Keyword "${matchedKeyword}" detected!`);
//             detectedRef.current = true;
//             enabledRef.current = false;
//             if (restartTimerRef.current) {
//               clearTimeout(restartTimerRef.current);
//               restartTimerRef.current = null;
//             }
//             // Stop passive listening
//             try {
//               recognition.abort();
//             } catch {
//               /* ignore */
//             }
//             recognitionRef.current = null;
//             setIsListening(false);

//             // Give SpeechRecognition a brief moment to release the mic before
//             // the live voice session opens its own audio stream.
//             setTimeout(() => {
//               onDetectedRef.current?.(matchedKeyword);
//             }, 250);
//             return;
//           }
//         }
//       }
//     };

//     recognition.onerror = (event) => {
//       console.log("[PassiveListener] Error:", event.error);
//       // Auto-restart on non-fatal errors
//       if (
//         event.error === "no-speech" ||
//         event.error === "aborted" ||
//         event.error === "network"
//       ) {
//         // Restart after a brief delay
//         restartTimerRef.current = setTimeout(() => {
//           if (enabledRef.current && !detectedRef.current) {
//             startRecognition();
//           }
//         }, 1000);
//       }
//     };

//     recognition.onend = () => {
//       setIsListening(false);
//       // Auto-restart if still enabled
//       if (enabledRef.current && !detectedRef.current) {
//         restartTimerRef.current = setTimeout(() => {
//           if (enabledRef.current && !detectedRef.current) {
//             startRecognition();
//           }
//         }, 500);
//       }
//     };

//     recognitionRef.current = recognition;

//     try {
//       recognition.start();
//     } catch (err) {
//       console.error("[PassiveListener] Start error:", err);
//     }
//   }, [micPermissionGranted]);

//   const stopRecognition = useCallback(() => {
//     if (restartTimerRef.current) {
//       clearTimeout(restartTimerRef.current);
//       restartTimerRef.current = null;
//     }
//     if (recognitionRef.current) {
//       try {
//         recognitionRef.current.abort();
//       } catch {
//         /* ignore */
//       }
//       recognitionRef.current = null;
//     }
//     setIsListening(false);
//   }, []);

//   useEffect(() => {
//     if (enabled) {
//       detectedRef.current = false;
//       startRecognition();
//     } else {
//       stopRecognition();
//     }

//     return () => {
//       stopRecognition();
//     };
//   }, [enabled, startRecognition, stopRecognition]);

//   return { isListening };
// }


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
  const restartTimerRef = useRef(null);
  const detectedRef = useRef(false);
  // Generation counter: every recognition instance gets a unique id.
  // Stale instances' callbacks check this before doing anything, so an
  // "old" instance can never schedule a restart for a "new" one.
  const generationRef = useRef(0);
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

  // Fully detach a recognition instance so it can never fire callbacks
  // again (this is what was missing before — abort() alone still let
  // onend/onerror fire for the discarded instance).
  const detachRecognition = useCallback((recognition) => {
    if (!recognition) return;
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    try {
      recognition.abort();
    } catch {
      /* ignore */
    }
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  // Always holds the LATEST startRecognition closure (updated below, every
  // render). scheduleRestart is a stable function (rarely recreated), so it
  // must never close over startRecognition directly — doing so would freeze
  // it to whatever startRecognition looked like on the render scheduleRestart
  // was first created in (e.g. micPermissionGranted still false at mount),
  // which caused restarts to get stuck checking a stale "no permission" state
  // forever.
  const startRecognitionRef = useRef(null);

  const scheduleRestart = useCallback((myGeneration, delay) => {
    clearRestartTimer();
    restartTimerRef.current = setTimeout(() => {
      restartTimerRef.current = null;
      // Only restart if nothing newer has started and we're still enabled.
      if (
        myGeneration === generationRef.current &&
        enabledRef.current &&
        !detectedRef.current
      ) {
        startRecognitionRef.current?.();
      }
    }, delay);
  }, [clearRestartTimer]);

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
      const myGeneration = generationRef.current;
      scheduleRestart(myGeneration, 2000);
      return;
    }

    // Cleanup any existing instance completely before creating a new one.
    detachRecognition(recognitionRef.current);
    recognitionRef.current = null;
    clearRestartTimer();

    // Bump generation — this instance is now the only one allowed to
    // schedule restarts.
    generationRef.current += 1;
    const myGeneration = generationRef.current;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 3;

    recognition.onstart = () => {
      if (myGeneration !== generationRef.current) return;
      setIsListening(true);
      console.log("[PassiveListener] Listening for activation keyword...");
    };

    recognition.onresult = (event) => {
      if (myGeneration !== generationRef.current) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        for (let j = 0; j < result.length; j++) {
          const transcript = result[j].transcript.toLowerCase().trim();
          console.log("[PassiveListener] Heard:", transcript);
          const transcriptWords = transcript.split(/[\s,.-]+/);
          const matchedKeyword = keywordsRef.current.find(k => {
            const lowerK = k.toLowerCase();
            if (transcriptWords.includes(lowerK)) return true;
            if (lowerK.length >= 5 && transcript.includes(lowerK)) return true;
            if (transcript === lowerK) return true;
            return false;
          });
          if (matchedKeyword) {
            console.log(`[PassiveListener] ✅ Keyword "${matchedKeyword}" detected!`);
            detectedRef.current = true;
            enabledRef.current = false;
            clearRestartTimer();

            detachRecognition(recognition);
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
      if (myGeneration !== generationRef.current) return;
      console.log("[PassiveListener] Error:", event.error);
      // NOTE: we intentionally do NOT schedule a restart here anymore.
      // onerror is always followed by onend for these error types, and
      // onend is now the single place that decides whether to restart.
      // Scheduling in both places was what caused restart timers to
      // stack up indefinitely.
    };

    recognition.onend = () => {
      if (myGeneration !== generationRef.current) {
        // A newer instance has already taken over — nothing to do.
        return;
      }
      setIsListening(false);
      if (enabledRef.current && !detectedRef.current) {
        scheduleRestart(myGeneration, 500);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.error("[PassiveListener] Start error:", err);
      if (myGeneration === generationRef.current) {
        scheduleRestart(myGeneration, 1000);
      }
    }
  }, [micPermissionGranted, detachRecognition, clearRestartTimer, scheduleRestart]);

  // Keep the ref pointed at whichever startRecognition closure is current
  // for this render, so scheduled restarts never call a stale version.
  startRecognitionRef.current = startRecognition;

  const stopRecognition = useCallback(() => {
    // Invalidate any in-flight instance/timers immediately.
    generationRef.current += 1;
    clearRestartTimer();
    detachRecognition(recognitionRef.current);
    recognitionRef.current = null;
    setIsListening(false);
  }, [clearRestartTimer, detachRecognition]);

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