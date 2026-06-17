/**
 * API Service — communicates with the Node.js backend
 */
import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE,
  timeout: 120_000, // 2 min — Whisper + Gemini + TTS can be slow
});

/**
 * Send a text message to the chatbot.
 * @param {string} message
 * @param {string|null} sessionId
 * @returns {Promise<{sessionId, textResponse, audioBase64, transcription}>}
 */
export async function sendTextMessage(message, sessionId) {
  const { data } = await api.post("/chat/text", { message, sessionId });
  if (!data.success) throw new Error(data.error || "Card scan failed");
  return data.data;
}

/**
 * Send a voice message (audio blob) to the chatbot.
 * @param {Blob} audioBlob
 * @param {string|null} sessionId
 * @returns {Promise<{sessionId, textResponse, audioBase64, transcription, detectedLanguage}>}
 */
export async function sendVoiceMessage(audioBlob, sessionId) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  if (sessionId) formData.append("sessionId", sessionId);

  const { data } = await api.post("/chat/voice", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (!data.success) throw new Error(data.error || "Request failed");
  return data.data;
}

/**
 * Fetch chat history for a session.
 * @param {string} sessionId
 * @returns {Promise<{sessionId, messages, createdAt}>}
 */
export async function fetchChatHistory(sessionId) {
  const { data } = await api.get(`/chat/history/${sessionId}`);
  if (!data.success) throw new Error(data.error || "Request failed");
  return data.data;
}

/**
 * Scan a business card image using the backend OCR service.
 * @param {Blob} imageBlob
 * @returns {Promise<{text: string}>}
 */
export async function scanBusinessCard(imageBlob) {
  const formData = new FormData();
  formData.append("image", imageBlob, "card.png");

  const { data } = await api.post("/card-scan", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  if (!data.success) throw new Error(data.error || "Request failed");
  return data.data;
}

/**
 * Save confirmed lead/contact details.
 * @param {{name: string, phone: string, email: string, sessionId?: string}} lead
 */
export async function saveLeadDetails(lead) {
  const { data } = await api.post("/leads", lead);
  if (!data.success) throw new Error(data.error || "Request failed");
  return data.lead;
}
