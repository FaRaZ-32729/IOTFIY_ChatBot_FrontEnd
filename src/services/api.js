
/**
 * API Service — communicates with the Node.js backend
 */
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://chatbotnd.iotfiysolutions.com";

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 120_000, // 2 min
});

/**
 * Send a text message to the chatbot.
 */
export async function sendTextMessage(message, sessionId) {
  const { data } = await api.post("/api/chat/text", { message, sessionId });
  if (!data.success) throw new Error(data.error || "Request failed");
  return data.data;
}

/**
 * Send a voice message.
 */
export async function sendVoiceMessage(audioBlob, sessionId) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  if (sessionId) formData.append("sessionId", sessionId);

  const { data } = await api.post("/api/chat/voice", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  if (!data.success) throw new Error(data.error || "Request failed");
  return data.data;
}

/**
 * Scan a business card.
 */
export async function scanBusinessCard(imageBlob) {
  const formData = new FormData();
  formData.append("image", imageBlob, "card.png");

  const { data } = await api.post("/api/card-scan", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  if (!data.success) throw new Error(data.error || "Request failed");
  return data.data;
}

/**
 * Save lead details.
 */
export async function saveLeadDetails(lead) {
  const { data } = await api.post("/api/leads", lead);
  if (!data.success) throw new Error(data.error || "Request failed");
  return data.lead;
}

/**
 * Fetch chat history.
 */
export async function fetchChatHistory(sessionId) {
  const { data } = await api.get(`/api/chat/history/${sessionId}`);
  if (!data.success) throw new Error(data.error || "Request failed");
  return data.data;
}