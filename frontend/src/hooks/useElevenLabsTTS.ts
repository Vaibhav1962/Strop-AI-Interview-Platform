import { useCallback, useRef, useState, useEffect } from "react";
import { getToken, API_BASE_URL } from "../lib/api";

// Global quota flag
export let isGlobalElevenQuotaExceeded = false;

export async function calibrateEngines(): Promise<{
  ttsEngine: "elevenlabs" | "gemini";
  sttEngine: "elevenlabs" | "gemini";
}> {
  return { ttsEngine: "elevenlabs", sttEngine: "elevenlabs" };
}

function speakWithBrowserNaturalVoice(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const bestVoice =
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Natural") || v.name.includes("Online")),
        ) ||
        voices.find((v) => v.lang === "en-US" && v.name.includes("Google")) ||
        voices.find((v) => v.lang.startsWith("en-US")) ||
        voices[0];

      if (bestVoice) utterance.voice = bestVoice;
      utterance.rate = 1.0;
      utterance.pitch = 0.95;

      utterance.onend = () => resolve(true);
      utterance.onerror = () => resolve(false);

      window.speechSynthesis.speak(utterance);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Fetches neural TTS audio buffer from the authenticated backend proxy.
 * Transmits session_id to guarantee deterministic session-scoped interviewer voice locking.
 */
async function fetchAudioBufferFromBackend(
  text: string,
  sessionId?: string,
): Promise<{ buffer: ArrayBuffer; engine: "elevenlabs" | "gemini"; voice: string } | null> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // The playback queue waits on each sentence in order, so one slow request holds up everything behind it.
  // Give each attempt a short deadline, and retry once only when the failure was quick (a rate limit or a blip).
  for (let attempt = 0; attempt < 2; attempt++) {
    const startedAt = Date.now();
    let retryable = true;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(`${API_BASE_URL}/tts`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          text,
          session_id: sessionId || undefined,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const engineHeader = res.headers.get("X-TTS-Engine");
        const voiceHeader = res.headers.get("X-TTS-Voice") || "Brian";
        const engine: "elevenlabs" | "gemini" = engineHeader === "gemini" ? "gemini" : "elevenlabs";
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 100) {
          return { buffer, engine, voice: voiceHeader };
        }
      } else {
        console.warn(`[NeuralTTS] Backend TTS returned status ${res.status}`);
        retryable = res.status >= 500 || res.status === 429;
      }
    } catch (err) {
      console.warn("[NeuralTTS] Backend TTS fetch error:", err);
    }
    if (!retryable || Date.now() - startedAt > 4000) break;
    await new Promise((r) => setTimeout(r, 600));
  }
  return null;
}

/** Splits a reply into speakable chunks (whole sentences, short ones merged) so each audio request stays small. */
export function splitIntoSpeechChunks(text: string, minChars = 70): string[] {
  const sentences = text.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+(?:["')\]]+)?(?:\s+|$)|[^.!?]+$/g) || [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    current = current ? `${current} ${sentence.trim()}` : sentence.trim();
    if (current.length >= minChars) {
      chunks.push(current);
      current = "";
    }
  }
  if (current) {
    if (chunks.length && current.length < 25) chunks[chunks.length - 1] += ` ${current}`;
    else chunks.push(current);
  }
  return chunks.filter(Boolean);
}

export interface QueuedSentenceItem {
  id: number;
  text: string;
  turnId?: string | number;
  bufferPromise: Promise<ArrayBuffer | null>;
}

/**
 * Neural AI TTS Hook:
 * - Session-scoped deterministic voice: maintains exactly 1 interviewer voice per interview.
 * - Turn-ID scoped playback & cancellation: discards delayed audio from older turns.
 * - Strict speaking status synchronization: gates candidate STT microphone.
 * - Web Audio AnalyserNode integration for audio visualizers.
 */
export function useElevenLabsTTS() {
  const [speaking, setSpeaking] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [activeEngine, setActiveEngine] = useState<"elevenlabs" | "gemini" | "none">("none");
  const [activeVoice, setActiveVoice] = useState<string>("Brian");
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [ttsQuotaError, setTtsQuotaError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const pulseIntervalRef = useRef<number | null>(null);
  const audioCacheRef = useRef<Map<string, Promise<ArrayBuffer | null>>>(new Map());
  const cancelTokenRef = useRef(0);
  const activeTurnIdRef = useRef<string | number | null>(null);

  const queueRef = useRef<QueuedSentenceItem[]>([]);
  const isDrainingRef = useRef(false);
  // After a cloud voice failure, the next few seconds of speech use the browser voice directly, so a reply is not
  // spoken half in one voice and half skipped.
  const browserVoiceUntilRef = useRef(0);
  const drainResolverRef = useRef<(() => void) | null>(null);

  const getCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      const AudioCtxCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new AudioCtxCtor();
    }
    return audioCtxRef.current;
  }, []);

  const unlockAudio = useCallback(async () => {
    try {
      const ctx = getCtx();
      if (ctx.state === "suspended") {
        await Promise.race([
          ctx.resume(),
          new Promise((r) => setTimeout(r, 800)),
        ]);
      }
      const silentBuffer = ctx.createBuffer(1, 1, 24000);
      const silentSource = ctx.createBufferSource();
      silentSource.buffer = silentBuffer;
      silentSource.connect(ctx.destination);
      silentSource.start(0);
    } catch (e) {
      console.warn("[NeuralTTS] Audio unlock error:", e);
    }
  }, [getCtx]);

  const cancelPulse = useCallback(() => {
    if (pulseIntervalRef.current) {
      clearInterval(pulseIntervalRef.current);
      pulseIntervalRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    cancelTokenRef.current++;
    queueRef.current = [];
    isDrainingRef.current = false;
    if (drainResolverRef.current) {
      drainResolverRef.current();
      drainResolverRef.current = null;
    }

    try {
      if (analyserNodeRef.current) {
        analyserNodeRef.current.disconnect();
      }
    } catch {}

    try {
      if (gainNodeRef.current && audioCtxRef.current) {
        gainNodeRef.current.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
        gainNodeRef.current.disconnect();
      }
    } catch {}

    try {
      sourceRef.current?.stop();
      sourceRef.current?.disconnect();
    } catch {}

    sourceRef.current = null;
    gainNodeRef.current = null;
    analyserNodeRef.current = null;

    cancelPulse();
    setSpeaking(false);
  }, [cancelPulse]);

  // Set authoritative active turn ID to prevent delayed audio from previous turns
  const setActiveTurnId = useCallback((turnId: string | number | null) => {
    if (activeTurnIdRef.current !== turnId) {
      activeTurnIdRef.current = turnId;
      cancel();
    }
  }, [cancel]);

  const getAudioBuffer = useCallback((text: string, sessionId?: string): Promise<ArrayBuffer | null> => {
    const clean = text.trim();
    if (!clean) return Promise.resolve(null);

    const cacheKey = `${sessionId || "session"}::${clean}`;
    const existing = audioCacheRef.current.get(cacheKey);
    if (existing) return existing;

    const p = (async (): Promise<ArrayBuffer | null> => {
      const result = await fetchAudioBufferFromBackend(clean, sessionId);
      if (result) {
        setActiveEngine(result.engine);
        setActiveVoice(result.voice);
        setTtsQuotaError(null);
        return result.buffer;
      }

      setTtsQuotaError("Speech synthesis service is temporarily unavailable.");
      audioCacheRef.current.delete(cacheKey);
      return null;
    })();

    audioCacheRef.current.set(cacheKey, p);
    return p;
  }, []);

  const prefetch = useCallback(
    async (text: string, sessionId?: string): Promise<boolean> => {
      if (!text) return false;
      const buf = await getAudioBuffer(text, sessionId).catch(() => null);
      return !!buf;
    },
    [getAudioBuffer],
  );

  const playBuffer = useCallback(
    async (rawBuffer: ArrayBuffer, currentToken: number, turnId?: string | number): Promise<boolean> => {
      try {
        const ctx = getCtx();
        if (ctx.state === "suspended") {
          await ctx.resume().catch(() => {});
        }
        // Validate both cancel token and active turn ID
        if (cancelTokenRef.current !== currentToken) return false;
        if (turnId !== undefined && activeTurnIdRef.current !== null && turnId !== activeTurnIdRef.current) {
          return false;
        }

        const audioBuffer = await ctx.decodeAudioData(rawBuffer.slice(0));
        if (cancelTokenRef.current !== currentToken) return false;
        if (turnId !== undefined && activeTurnIdRef.current !== null && turnId !== activeTurnIdRef.current) {
          return false;
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;

        const gainNode = ctx.createGain();
        gainNodeRef.current = gainNode;
        const now = ctx.currentTime;
        const duration = audioBuffer.duration;

        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.linearRampToValueAtTime(1.0, now + 0.03);
        const rampDownStart = Math.max(now + 0.04, now + duration - 0.05);
        gainNode.gain.setValueAtTime(1.0, rampDownStart);
        gainNode.gain.linearRampToValueAtTime(0.0, now + duration);

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.75;
        analyserNodeRef.current = analyser;

        source.connect(analyser);
        analyser.connect(gainNode);
        gainNode.connect(ctx.destination);
        sourceRef.current = source;

        setSpeaking(true);
        pulseIntervalRef.current = window.setInterval(() => {
          setPulse((p) => p + 1);
        }, 100);

        await new Promise<void>((resolve) => {
          source.onended = () => {
            try {
              source.disconnect();
              analyser.disconnect();
              gainNode.disconnect();
            } catch {}
            if (sourceRef.current === source) {
              sourceRef.current = null;
              gainNodeRef.current = null;
              analyserNodeRef.current = null;
            }
            resolve();
          };
          source.start();
        });

        if (cancelTokenRef.current === currentToken && queueRef.current.length === 0) {
          setSpeaking(false);
          cancelPulse();
        }

        return true;
      } catch (err) {
        console.warn("[NeuralTTS] playBuffer error:", err);
        setSpeaking(false);
        cancelPulse();
        return false;
      }
    },
    [getCtx, cancelPulse],
  );

  const drainQueue = useCallback(async () => {
    if (isDrainingRef.current) return;
    isDrainingRef.current = true;
    const currentToken = cancelTokenRef.current;

    while (queueRef.current.length > 0 && cancelTokenRef.current === currentToken) {
      const item = queueRef.current.shift();
      if (!item) break;

      // Check if turn expired while item was queued
      if (item.turnId !== undefined && activeTurnIdRef.current !== null && item.turnId !== activeTurnIdRef.current) {
        continue;
      }

      try {
        const allowBrowser = typeof window !== "undefined" && localStorage.getItem("iq_allow_browser_voice") !== "false";
        const useBrowserNow = allowBrowser && Date.now() < browserVoiceUntilRef.current;
        const rawBuffer = useBrowserNow ? null : await item.bufferPromise;
        if (cancelTokenRef.current !== currentToken) break;
        if (item.turnId !== undefined && activeTurnIdRef.current !== null && item.turnId !== activeTurnIdRef.current) {
          break;
        }

        if (rawBuffer) {
          await playBuffer(rawBuffer, currentToken, item.turnId);
        } else {
          // Cloud TTS failed for this sentence. Dropping it would leave Alex's reply with missing lines, so the
          // browser voice speaks it (and the next few seconds of this reply) unless it has been switched off.
          if (allowBrowser) {
            browserVoiceUntilRef.current = Date.now() + 20000;
            setSpeaking(true);
            await speakWithBrowserNaturalVoice(item.text);
            setSpeaking(false);
          } else {
            console.log("[NeuralTTS] Cloud TTS buffer unavailable and the browser voice is off; omitting this line.");
          }
        }
      } catch (e) {
        console.warn("[NeuralTTS] Error playing queued item:", e);
      }
    }

    isDrainingRef.current = false;
    if (cancelTokenRef.current === currentToken) {
      setSpeaking(false);
      cancelPulse();
    }

    if (drainResolverRef.current && queueRef.current.length === 0) {
      drainResolverRef.current();
      drainResolverRef.current = null;
    }
  }, [playBuffer, cancelPulse]);

  const queueSentence = useCallback(
    (sentence: string, turnId?: string | number, sessionId?: string) => {
      const clean = sentence.trim();
      if (!clean) return;

      // Discard sentences belonging to older turns
      if (turnId !== undefined && activeTurnIdRef.current !== null && turnId !== activeTurnIdRef.current) {
        return;
      }

      const p = getAudioBuffer(clean, sessionId);
      queueRef.current.push({
        id: Date.now() + Math.random(),
        text: clean,
        turnId,
        bufferPromise: p,
      });

      drainQueue();
    },
    [getAudioBuffer, drainQueue],
  );

  const waitForDrain = useCallback((): Promise<void> => {
    if (!isDrainingRef.current && queueRef.current.length === 0 && !speaking) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      const prev = drainResolverRef.current;
      drainResolverRef.current = () => {
        prev?.();
        resolve();
      };
    });
  }, [speaking]);

  const speak = useCallback(
    async (text: string, turnId?: string | number, sessionId?: string): Promise<boolean> => {
      cancel();
      const clean = text.trim();
      if (!clean) return false;
      if (turnId !== undefined) {
        activeTurnIdRef.current = turnId;
      }
      for (const chunk of splitIntoSpeechChunks(clean)) {
        queueSentence(chunk, turnId, sessionId);
      }
      await waitForDrain();
      return true;
    },
    [cancel, queueSentence, waitForDrain],
  );

  const getAudioLevel = useCallback((): number => {
    if (!analyserNodeRef.current) return 0;
    try {
      const data = new Uint8Array(analyserNodeRef.current.frequencyBinCount);
      analyserNodeRef.current.getByteFrequencyData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) sum += data[i];
      return sum / data.length / 255;
    } catch {
      return 0;
    }
  }, []);

  // Ensure audio nodes and queue are cancelled when component unmounts
  useEffect(() => {
    return () => {
      cancel();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, [cancel]);

  const isBusy = speaking || queueRef.current.length > 0 || isDrainingRef.current;

  return {
    speak,
    queueSentence,
    waitForDrain,
    prefetch,
    cancel,
    unlockAudio,
    speaking,
    isBusy,
    queueLength: queueRef.current.length,
    activeEngine,
    activeVoice,
    setActiveTurnId,
    pulse,
    getAudioLevel,
    isUsingElevenLabs: activeEngine === "elevenlabs",
    isUsingGemini: activeEngine === "gemini",
    quotaExceeded,
    ttsQuotaError,
  };
}
