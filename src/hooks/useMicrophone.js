import { useCallback, useRef } from "react";
import { downsampleBuffer, float32ToPcmBase64 } from "../utils/audioUtils.js";

const TARGET_RATE = 16000;

export function useMicrophone(onAudioChunk, onLevel) {
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const contextRef = useRef(null);
  const sourceRef = useRef(null);
  const silenceRef = useRef(null);
  const activeRef = useRef(false);

  const start = useCallback(async () => {
    if (activeRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      contextRef.current = ctx;

      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const processor = ctx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!activeRef.current) return;
        const input = e.inputBuffer.getChannelData(0);
        const downsampled = downsampleBuffer(input, ctx.sampleRate, TARGET_RATE);
        const base64 = float32ToPcmBase64(downsampled);
        onAudioChunk?.(base64);

        if (onLevel) {
          const data = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length / 255;
          onLevel(avg);
        }
      };

      const silence = ctx.createGain();
      silence.gain.value = 0;
      silenceRef.current = silence;

      source.connect(processor);
      processor.connect(silence);
      silence.connect(ctx.destination);

      activeRef.current = true;
      return ctx;
    } catch (err) {
      activeRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (contextRef.current) {
        contextRef.current.close().catch(() => {});
        contextRef.current = null;
      }
      throw err;
    }
  }, [onAudioChunk, onLevel]);

  const stop = useCallback(() => {
    activeRef.current = false;
    processorRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    silenceRef.current?.disconnect();
    silenceRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (contextRef.current) {
      contextRef.current.close().catch(() => {});
      contextRef.current = null;
    }
  }, []);

  return { start, stop, isActive: () => activeRef.current };
}
