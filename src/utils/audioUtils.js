/** Encode Float32 PCM samples to base64 Int16 PCM */
export function float32ToPcmBase64(float32Array) {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Parse mimeType like audio/pcm;rate=24000 */
export function parseSampleRate(mimeType, fallback = 24000) {
  const match = /rate=(\d+)/i.exec(mimeType || "");
  return match ? Number(match[1]) : fallback;
}

/** Downsample buffer to target rate */
export function downsampleBuffer(buffer, inputRate, outputRate) {
  if (outputRate === inputRate) return buffer;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const idx = Math.floor(i * ratio);
    result[i] = buffer[idx];
  }
  return result;
}

/** Decode base64 PCM Int16 to Float32 */
export function pcmBase64ToFloat32(base64) {
  if (!base64) return new Float32Array(0);
  const binary = atob(base64);
  // Int16 requires 2-byte alignment — trim any trailing odd byte
  const byteLen = binary.length & ~1;
  if (byteLen < 2) return new Float32Array(0);

  const bytes = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
}

