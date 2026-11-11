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

/**
 * Fetches neural TTS audio buffer from the authenticated backend proxy.
 * Transmits session_id to guarantee deterministic session-scoped interviewer voice locking.
 */
async function fetchAudioBufferFromBackend(
  text: string,
  sessionId?: string,
): Promise<
  | { ok: true; buffer: ArrayBuffer; engine: "groq" | "elevenlabs" | "gemini"; voice: string }
  | { ok: false; setupProblem: boolean }
> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // The interviewer must keep one voice, so a failed sentence is retried (the server rotates between the two Groq
  // accounts and tells us how long a rate limit lasts) instead of being handed to a different voice. The queue plays
  // sentences in order, so this wait is the cost of consistency; it is capped so a dead service cannot hang the page.
  const BUDGET_MS = 30000;
  let setupProblem = false;
  const overallStart = Date.now();
  for (let attempt = 0; attempt < 4; attempt++) {
    let waitMs = 700;
    let retryable = true;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

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
        const engine: "groq" | "elevenlabs" | "gemini" =
          engineHeader === "gemini" ? "gemini" : engineHeader === "groq" ? "groq" : "elevenlabs";
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 100) {
          return { ok: true, buffer, engine, voice: voiceHeader };
        }
      } else {
        console.warn(`[NeuralTTS] Backend TTS returned status ${res.status}`);
        // 429 / 503 carry Retry-After: the voice is rate limited for that many seconds. Wait it out (briefly).
        // "terms": the Groq voice model was never enabled for the account. Retrying cannot fix that.
        if (res.headers.get("X-TTS-Reason") === "terms") {
          setupProblem = true;
          console.warn("[NeuralTTS] Groq Orpheus terms are not accepted on any configured account (console.groq.com).");
          break;
        }
        const retryAfter = Number(res.headers.get("Retry-After"));
        if (Number.isFinite(retryAfter) && retryAfter > 0) waitMs = Math.min(8000, Math.max(800, retryAfter * 1000));
        retryable = res.status === 429 || res.status >= 500;
      }
    } catch (err) {
      console.warn("[NeuralTTS] Backend TTS fetch error:", err);
    }
    if (!retryable || Date.now() - overallStart + waitMs > BUDGET_MS) break;
    await new Promise((r) => setTimeout(r, waitMs));
  }
  return { ok: false, setupProblem };
}

/** Splits a reply into speakable chunks (whole sentences, short ones merged) so each audio request stays small. */
export function splitIntoSpeechChunks(text: string, minChars = 100): string[] {
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
  const [activeEngine, setActiveEngine] = useState<"groq" | "elevenlabs" | "gemini" | "none">("none");
  const [activeVoice, setActiveVoice] = useState<string>("daniel");
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [ttsQuotaError, setTtsQuotaError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const pulseIntervalRef = useRef<number | null>(null);
  const audioCacheRef = useRef<Map<string, Promise<ArrayBuffer | null>>>(new Map());
  const cancelTokenRef = useRef(0);
  // One id for this interview: the server pins the interviewer's voice to it, so every sentence (including ones the
  // caller sent without an id) is spoken by the same voice.
  const ttsSessionRef = useRef<string>(
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tts-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const activeTurnIdRef = useRef<string | number | null>(null);

  const queueRef = useRef<QueuedSentenceItem[]>([]);
  const isDrainingRef = useRef(false);
  // When the voice service is down, stop asking for a while: every sentence would otherwise wait out its retries and
  // the interview would crawl. Replies keep appearing as text, and the voice is tried again once this passes.
  const voiceDownUntilRef = useRef(0);
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

    const voiceSession = sessionId || ttsSessionRef.current;
    const cacheKey = `${voiceSession}::${clean}`;
    const existing = audioCacheRef.current.get(cacheKey);
    if (existing) return existing;

    if (Date.now() < voiceDownUntilRef.current) return Promise.resolve(null);

    const p = (async (): Promise<ArrayBuffer | null> => {
      const result = await fetchAudioBufferFromBackend(clean, voiceSession);
      if (result.ok) {
        voiceDownUntilRef.current = 0;
        setActiveEngine(result.engine);
        setActiveVoice(result.voice);
        setTtsQuotaError(null);
        return result.buffer;
      }

      voiceDownUntilRef.current = Date.now() + (result.setupProblem ? 120000 : 40000);
      setTtsQuotaError("Voice is not working right now, so Alex's replies appear as text only.");
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
        const rawBuffer = await item.bufferPromise;
        if (cancelTokenRef.current !== currentToken) break;
        if (item.turnId !== undefined && activeTurnIdRef.current !== null && item.turnId !== activeTurnIdRef.current) {
          break;
        }

        // No voice for this line: it stays in the transcript, and the page shows that the voice is unavailable.
        // Never substitute another voice, so the interviewer always sounds like one person.
        if (rawBuffer) await playBuffer(rawBuffer, currentToken, item.turnId);
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
    const session = ttsSessionRef.current;
    return () => {
      // Release the server-side voice lock for this interview (best effort).
      const token = getToken();
      if (token) {
        fetch(`${API_BASE_URL}/tts/session/${encodeURIComponent(session)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
          keepalive: true,
        }).catch(() => {});
      }
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
