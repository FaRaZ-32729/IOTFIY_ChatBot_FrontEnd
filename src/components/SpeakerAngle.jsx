// import React, { useEffect, useRef, useState } from "react";
// import "./SpeakerAngle.css";

// export default function SpeakerAngle({ isActive }) {
//     const videoRef = useRef(null);
//     const cameraRef = useRef(null);
//     const streamRef = useRef(null);
//     const activeSpeakerHistory = useRef([]);
//     const previousMouthOpenness = useRef([]);
//     const lastReportedAngle = useRef(0);

//     const [status, setStatus] = useState("Initializing...");

//     useEffect(() => {
//         if (!isActive) {
//             if (cameraRef.current) {
//                 cameraRef.current.stop();
//                 cameraRef.current = null;
//             }
//             if (streamRef.current) {
//                 streamRef.current.getTracks().forEach(t => t.stop());
//                 streamRef.current = null;
//             }
//             return;
//         }

//         let isMounted = true;
//         const video = videoRef.current;

//         if (!video) return;

//         const ANGLE_HYSTERESIS = 8;
//         const HORIZONTAL_FOV = 70;

//         const distance = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
//         const getMostFrequent = (arr) => {
//             if (arr.length === 0) return 0;
//             const count = {};
//             arr.forEach(i => count[i] = (count[i] || 0) + 1);
//             return parseInt(Object.keys(count).reduce((a, b) => count[a] > count[b] ? a : b));
//         };

//         const onResults = (results) => {
//             if (!isMounted) return;

//             // Remove video drawing and canvas clearing so it doesn't show the screen
//             // ctx.clearRect(0, 0, canvas.width, canvas.height);
//             // ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

//             if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
//                 setStatus("No face detected");
//                 return;
//             }

//             setStatus(`${results.multiFaceLandmarks.length} face(s) detected`);

//             let activeSpeaker = null;
//             let maxMotion = 0;

//             results.multiFaceLandmarks.forEach((landmarks, index) => {
//                 const upperLip = landmarks[13];
//                 const lowerLip = landmarks[14];
//                 const mouthOpen = distance(upperLip, lowerLip);

//                 if (previousMouthOpenness.current[index] === undefined) {
//                     previousMouthOpenness.current[index] = mouthOpen;
//                 }

//                 const motion = Math.abs(mouthOpen - previousMouthOpenness.current[index]);
//                 previousMouthOpenness.current[index] = mouthOpen;

//                 if (motion > maxMotion) {
//                     maxMotion = motion;
//                     activeSpeaker = { landmarks, motion, faceIndex: index };
//                 }
//             });

//             if (activeSpeaker) {
//                 activeSpeakerHistory.current.push(activeSpeaker.faceIndex);
//                 if (activeSpeakerHistory.current.length > 10) activeSpeakerHistory.current.shift();
//             }

//             const mostCommonFaceIndex = getMostFrequent(activeSpeakerHistory.current);
//             const currentActiveLandmarks = results.multiFaceLandmarks[mostCommonFaceIndex];

//             if (currentActiveLandmarks) {
//                 const leftMouth = currentActiveLandmarks[61];
//                 const rightMouth = currentActiveLandmarks[291];
//                 const px = ((leftMouth.x + rightMouth.x) / 2) * video.videoWidth;

//                 const dx = px - video.videoWidth / 2;
//                 const angle = (dx / (video.videoWidth / 2)) * (HORIZONTAL_FOV / 2);
//                 const clampedAngle = Math.max(-35, Math.min(35, angle));

//                 let displayAngle = lastReportedAngle.current;
//                 if (Math.abs(clampedAngle - lastReportedAngle.current) > ANGLE_HYSTERESIS) {
//                     lastReportedAngle.current = clampedAngle;
//                     displayAngle = clampedAngle;
//                     console.log("Active Speaker Angle Updated:", displayAngle.toFixed(1));
//                 }
//             }
//         };

//         let faceMesh;
//         if (window.FaceMesh) {
//             faceMesh = new window.FaceMesh({
//                 locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
//             });

//             faceMesh.setOptions({
//                 maxNumFaces: 3,
//                 refineLandmarks: true,
//                 minDetectionConfidence: 0.7,
//                 minTrackingConfidence: 0.7
//             });

//             faceMesh.onResults(onResults);
//         } else {
//             console.error("FaceMesh is not defined on window");
//             setStatus("FaceMesh library missing");
//             return;
//         }

//         navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
//             .then(stream => {
//                 if (!isMounted) return;
//                 streamRef.current = stream;
//                 video.srcObject = stream;
//                 video.onloadedmetadata = () => {
//                     if (window.Camera) {
//                         const camera = new window.Camera(video, {
//                             onFrame: async () => {
//                                 if (isMounted) await faceMesh.send({ image: video });
//                             },
//                             width: 1280,
//                             height: 720
//                         });
//                         camera.start();
//                         cameraRef.current = camera;
//                         setStatus("Camera started");
//                     } else {
//                         console.error("Camera is not defined on window");
//                         setStatus("Camera library missing");
//                     }
//                 };
//             })
//             .catch(err => {
//                 console.error(err);
//                 if (isMounted) setStatus("Camera access denied or unavailable");
//             });

//         return () => {
//             isMounted = false;
//             if (cameraRef.current) {
//                 cameraRef.current.stop();
//                 cameraRef.current = null;
//             }
//             if (streamRef.current) {
//                 streamRef.current.getTracks().forEach(t => t.stop());
//                 streamRef.current = null;
//             }
//             try { faceMesh.close(); } catch (e) {}
//         };
//     }, [isActive]);

//     if (!isActive) return null;

//     return (
//         <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }}></video>
//     );
// }



import React, { useEffect, useRef, useState, useCallback } from "react";
import "./SpeakerAngle.css";

export default function SpeakerAngle({ isActive }) {
    const videoRef = useRef(null);
    const cameraRef = useRef(null);
    const streamRef = useRef(null);
    const activeSpeakerHistory = useRef([]);
    const previousMouthOpenness = useRef([]);
    const lastReportedAngle = useRef(0);

    const [status, setStatus] = useState("Initializing...");

    // Backend ko angle bhejne ka function
    const sendAngleToBackend = useCallback(async (angle) => {
        try {
            console.log(`🔥 Sending Angle to Backend: ${angle}°`);

            const response = await fetch("https://chatbotnd.iotfiysolutions.com/send-angle", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ angle: parseFloat(angle.toFixed(1)) }),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            console.log("✅ Backend Success:", data);
        } catch (err) {
            console.error("❌ Failed to send angle to backend:", err.message);
        }
    }, []);

    useEffect(() => {
        if (!isActive) {
            // Cleanup
            if (cameraRef.current) cameraRef.current.stop();
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            return;
        }

        let isMounted = true;
        const video = videoRef.current;
        if (!video) return;

        const ANGLE_HYSTERESIS = 8;
        const HORIZONTAL_FOV = 70;

        const distance = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

        const getMostFrequent = (arr) => {
            if (arr.length === 0) return 0;
            const count = {};
            arr.forEach(i => count[i] = (count[i] || 0) + 1);
            return parseInt(Object.keys(count).reduce((a, b) =>
                count[a] > count[b] ? a : b
            ));
        };

        const onResults = (results) => {
            if (!isMounted) return;

            if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
                setStatus("No face detected");
                return;
            }

            setStatus(`${results.multiFaceLandmarks.length} face(s) detected`);

            let activeSpeaker = null;
            let maxMotion = 0;

            results.multiFaceLandmarks.forEach((landmarks, index) => {
                const upperLip = landmarks[13];
                const lowerLip = landmarks[14];
                const mouthOpen = distance(upperLip, lowerLip);

                if (previousMouthOpenness.current[index] === undefined) {
                    previousMouthOpenness.current[index] = mouthOpen;
                }

                const motion = Math.abs(mouthOpen - previousMouthOpenness.current[index]);
                previousMouthOpenness.current[index] = mouthOpen;

                if (motion > maxMotion) {
                    maxMotion = motion;
                    activeSpeaker = { landmarks, motion, faceIndex: index };
                }
            });

            if (activeSpeaker) {
                activeSpeakerHistory.current.push(activeSpeaker.faceIndex);
                if (activeSpeakerHistory.current.length > 10) activeSpeakerHistory.current.shift();
            }

            const mostCommonFaceIndex = getMostFrequent(activeSpeakerHistory.current);
            const currentActiveLandmarks = results.multiFaceLandmarks[mostCommonFaceIndex];

            if (currentActiveLandmarks) {
                const leftMouth = currentActiveLandmarks[61];
                const rightMouth = currentActiveLandmarks[291];
                const px = ((leftMouth.x + rightMouth.x) / 2) * video.videoWidth;

                const dx = px - video.videoWidth / 2;
                const angle = (dx / (video.videoWidth / 2)) * (HORIZONTAL_FOV / 2);
                const clampedAngle = Math.max(-35, Math.min(35, angle));

                let displayAngle = lastReportedAngle.current;

                if (Math.abs(clampedAngle - lastReportedAngle.current) > ANGLE_HYSTERESIS) {
                    lastReportedAngle.current = clampedAngle;
                    displayAngle = clampedAngle;

                    console.log("🔄 Significant Angle Change:", displayAngle.toFixed(1) + "°");

                    // 🔥 Backend ko bhejo
                    sendAngleToBackend(displayAngle);
                }
            }
        };

        // FaceMesh Initialization
        let faceMesh;
        if (window.FaceMesh) {
            faceMesh = new window.FaceMesh({
                locateFile: (file) => `http://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });

            faceMesh.setOptions({
                maxNumFaces: 3,
                refineLandmarks: true,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.7
            });

            faceMesh.onResults(onResults);
        } else {
            console.error("FaceMesh not loaded");
            setStatus("FaceMesh library missing");
            return;
        }

        // Camera Start
        navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 } })
            .then(stream => {
                if (!isMounted) return;
                streamRef.current = stream;
                video.srcObject = stream;

                video.onloadedmetadata = () => {
                    if (window.Camera) {
                        const camera = new window.Camera(video, {
                            onFrame: async () => {
                                if (isMounted && faceMesh) {
                                    await faceMesh.send({ image: video });
                                }
                            },
                            width: 1280,
                            height: 720
                        });
                        camera.start();
                        cameraRef.current = camera;
                        setStatus("Camera & Detection Active");
                    }
                };
            })
            .catch(err => {
                console.error(err);
                setStatus("Camera access denied");
            });        
        return () => {
            isMounted = false;
            if (cameraRef.current) cameraRef.current.stop();
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (faceMesh) faceMesh.close();
        };
    }, [isActive, sendAngleToBackend]);

    if (!isActive) return null;

    return <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} />;
}