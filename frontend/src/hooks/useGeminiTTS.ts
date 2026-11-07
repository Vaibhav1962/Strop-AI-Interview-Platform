import { useCallback, useRef, useState } from "react";
import { getToken, API_BASE_URL } from "../lib/api";

/**
 * Gemini Neural TTS hook delegating to the authenticated backend proxy.
 * Keeps all Gemini credentials server-side.
 */
export function useGeminiTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [isUsingGemini, setIsUsingGemini] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const AudioCtxCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtxCtor();
    }
    return audioCtxRef.current;
  }, []);

  const speak = useCallback(
    async (text: string): Promise<boolean> => {
      const token = getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      try {
        const res = await fetch(`${API_BASE_URL}/tts`, {
          method: "POST",
          headers,
          body: JSON.stringify({ text }),
        });
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          const ctx = getCtx();
          if (ctx.state === "suspended") await ctx.resume();
          const audioBuffer = await ctx.decodeAudioData(buffer);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          sourceRef.current = source;
          setSpeaking(true);
          setIsUsingGemini(true);
          return new Promise<boolean>((resolve) => {
            source.onended = () => {
              setSpeaking(false);
              resolve(true);
            };
            source.start();
          });
        }
      } catch (err) {
        console.warn("[GeminiTTS] Backend TTS proxy error:", err);
      }
      return false;
    },
    [getCtx],
  );

  const cancel = useCallback(() => {
    try {
      sourceRef.current?.stop();
      sourceRef.current?.disconnect();
    } catch {}
    sourceRef.current = null;
    setSpeaking(false);
  }, []);

  return {
    speak,
    cancel,
    speaking,
    pulse,
    isUsingGemini,
  };
}
