import { useCallback, useEffect, useRef, useState } from "react";
import { encodeWav } from "../lib/wavEncoder";
import { getToken, API_BASE_URL } from "../lib/api";

export let isGlobalElevenSttQuotaExceeded = false;

export function setSttQuotaExceeded(val: boolean) {
  isGlobalElevenSttQuotaExceeded = val;
}

/**
 * Transcribes audio via authenticated backend /api/v1/stt proxy.
 * Server executes ElevenLabs Scribe with Gemini Transcribe fallback.
 * Zero private API keys exposed to browser client.
 */
async function transcribeAudioWithBackend(
  blob: Blob,
  opts: { final?: boolean } = {},
): Promise<{ text: string; failed: boolean }> {
  if (blob.size < 400) return { text: "", failed: false };

  // The final transcription is the one the answer is built from, so it gets a longer timeout and one retry
  // (a transient 429/5xx or a cold model should not lose a whole spoken answer).
  const attempts = opts.final ? 2 : 1;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const text = await postAudio(blob, opts.final ? 30000 : 15000);
    if (text !== undefined) return { text, failed: false };
    if (attempt + 1 < attempts) await new Promise((r) => setTimeout(r, 1500));
  }
  // The request itself failed (as opposed to "the server heard nothing"), so callers can say so.
  return { text: "", failed: true };
}

/** Returns the cleaned text, "" when the server heard nothing, or undefined when the request itself failed. */
async function postAudio(blob: Blob, timeoutMs: number): Promise<string | undefined> {
  try {
    const formData = new FormData();
    const filename = blob.type.includes("webm") ? "candidate_speech.webm" : "candidate_speech.wav";
    formData.append("file", blob, filename);

    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(`${API_BASE_URL}/stt`, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      // An error payload is a failed request, not a silent recording.
      if (data?.error && !data?.text) return undefined;
      const text = (data.text as string)?.trim() || "";
      const clean = text
        .replace(/^\[[a-zA-Z\s]+\]$/i, "")
        .replace(/^(SILENCE|\(silence\)|\[silence\]|None\.?|Nothing\.?)$/i, "")
        .trim();
      return clean;
    }
    console.warn("[BackendSTT] /stt returned", res.status);
  } catch (err) {
    console.warn("[BackendSTT] Transcription error:", err);
  }

  return undefined;
}

/**
 * High-accuracy multi-tier transcription:
 */
async function transcribeAudioMultiTier(
  blob: Blob,
  _onQuotaExceeded?: () => void,
  opts: { final?: boolean } = {},
): Promise<{ text: string; engine: "elevenlabs" | "gemini" | "backend" | "none"; failed: boolean }> {
  const { text, failed } = await transcribeAudioWithBackend(blob, opts);
  if (text) {
    return { text, engine: "backend", failed: false };
  }
  return { text: "", engine: "none", failed };
}

/**
 * 100% Neural AI Speech-to-Text Hook:
 * Combines ScriptProcessor WAV encoding + native MediaRecorder dual-channel capture.
 * Routes through secure backend proxy.
 */
export function useElevenLabsSTT(stream: MediaStream | null) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [sttError, setSttError] = useState<string | null>(null);
  const [quotaExceeded, setQuotaExceeded] = useState(isGlobalElevenSttQuotaExceeded);
  const [activeEngine, setActiveEngine] = useState<"elevenlabs" | "gemini" | "backend" | "none">("gemini");

  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dummyGainRef = useRef<GainNode | null>(null);
  const pcmSamplesRef = useRef<Float32Array[]>([]);
  const isCapturingRef = useRef(false);

  // Native MediaRecorder backup
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Snapshot timer and state
  const snapshotTimerRef = useRef<number | null>(null);
  const isSnapshotInFlightRef = useRef(false);
  const lastTranscribedChunkCountRef = useRef(0);
  const latestTranscriptRef = useRef("");
  const recognitionRef = useRef<any>(null);
  // True once the browser's own speech recognition is actually producing text. While it is, the server does not
  // also need to re-transcribe the growing recording for the live preview.
  const browserLiveTextRef = useRef(false);

  const stopAudioCapture = useCallback(() => {
    isCapturingRef.current = false;
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    if (snapshotTimerRef.current) {
      clearInterval(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;

    try {
      processorRef.current?.disconnect();
      dummyGainRef.current?.disconnect();
      sourceNodeRef.current?.disconnect();
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close().catch(() => {});
      }
    } catch {}

    processorRef.current = null;
    dummyGainRef.current = null;
    sourceNodeRef.current = null;
    audioCtxRef.current = null;
  }, []);

  // Encodes current PCM sample buffer into a standard 16kHz mono WAV Blob
  const getAudioWavBlob = useCallback((): Blob | null => {
    const chunks = pcmSamplesRef.current;
    if (chunks.length === 0) return null;

    let totalLength = 0;
    for (const c of chunks) totalLength += c.length;
    if (totalLength < 4000) return null; // At least ~0.1s of audio

    const combined = new Float32Array(totalLength);
    let offset = 0;
    for (const c of chunks) {
      combined.set(c, offset);
      offset += c.length;
    }

    try {
      // Pass actual audio context sample rate (typically 44100 or 48000 on Windows)
      const sampleRate = audioCtxRef.current?.sampleRate || 48000;
      // encodeWav handles downsampling to 16kHz and directly returns a standard RIFF WAV Blob!
      const wavBlob = encodeWav(combined, sampleRate);
      return wavBlob;
    } catch (e) {
      console.warn("[useElevenLabsSTT] WAV encoding error:", e);
      return null;
    }
  }, []);

  // Periodic live preview from the server, for browsers that have no speech recognition of their own (Brave, Firefox).
  // Each snapshot re-sends everything recorded so far, so a 60 second answer used to upload about 9 times its own
  // length in audio and burn the free tier's hourly audio allowance. When the browser is already delivering live
  // text, the only server transcription needed is the final one.
  const runLiveSnapshot = useCallback(async () => {
    if (!isCapturingRef.current) return;
    if (browserLiveTextRef.current) return;
    if (isSnapshotInFlightRef.current) return;

    const currentCount = pcmSamplesRef.current.length;
    // Require at least 12 new chunks (~1.0s of new speech) before requesting snapshot
    if (currentCount <= lastTranscribedChunkCountRef.current + 12) return;

    let audioBlob = getAudioWavBlob();
    if (!audioBlob && recordedChunksRef.current.length > 0) {
      audioBlob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
    }

    if (!audioBlob || audioBlob.size < 600) return;

    isSnapshotInFlightRef.current = true;
    try {
      const result = await transcribeAudioMultiTier(audioBlob, () => {
        setQuotaExceeded(true);
      });
      if (result.text && result.text.length > 0 && isCapturingRef.current) {
        latestTranscriptRef.current = result.text;
        setLiveTranscript(result.text);
        setActiveEngine(result.engine);
        lastTranscribedChunkCountRef.current = currentCount;
      }
    } catch (err) {
      console.warn("[useElevenLabsSTT] Live snapshot error:", err);
    } finally {
      isSnapshotInFlightRef.current = false;
    }
  }, [getAudioWavBlob]);

  const startListening = useCallback(() => {
    stopAudioCapture();

    pcmSamplesRef.current = [];
    recordedChunksRef.current = [];
    latestTranscriptRef.current = "";
    lastTranscribedChunkCountRef.current = 0;
    browserLiveTextRef.current = false;
    setLiveTranscript("");
    setSttError(null);

    isCapturingRef.current = true;
    setIsRecording(true);

    // 1. Initialize Browser Real-time Speech Recognition for instant visual feedback
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    // Brave blocks the browser's speech service, so trying it only produces network errors. The recording is
    // transcribed on the server either way, and the live preview comes from there.
    const isBrave = typeof navigator !== "undefined" && Boolean((navigator as unknown as { brave?: unknown }).brave);

    if (SpeechRecognitionCtor && !isBrave) {
      try {
        const recognition = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          if (!isCapturingRef.current) return;
          let fullTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            const res = event.results[i];
            if (res && res[0]) {
              fullTranscript += res[0].transcript;
            }
          }
          const trimmed = fullTranscript.trim();
          if (trimmed) {
            browserLiveTextRef.current = true;
            latestTranscriptRef.current = trimmed;
            setLiveTranscript(trimmed);
          }
        };

        recognition.onerror = (e: any) => {
          if (e.error !== "no-speech" && e.error !== "aborted") {
            console.warn("[SpeechRecognition] Info:", e.error);
          }
          // Some Chromium builds block the browser speech service. Stop retrying it and rely on server-side
          // transcription of the captured audio. This is not an error the candidate needs to see.
          if (e.error === "network" || e.error === "not-allowed" || e.error === "service-not-allowed") {
            browserLiveTextRef.current = false; // the server preview takes over again
            try {
              recognition.onend = null;
            } catch {}
          }
        };

        recognition.onend = () => {
          if (isCapturingRef.current) {
            try {
              recognition.start();
            } catch {}
          }
        };

        try {
          recognition.start();
          recognitionRef.current = recognition;
        } catch (startErr) {
          console.warn("[SpeechRecognition] Start error:", startErr);
        }
      } catch (err) {
        console.warn("[SpeechRecognition] Init error:", err);
      }
    }

    if (!stream || stream.getAudioTracks().length === 0) {
      return;
    }

    // Ensure all audio tracks are active
    stream.getAudioTracks().forEach((track) => {
      track.enabled = true;
    });

    // Live server-side transcription for browsers without their own recognition (see runLiveSnapshot).
    snapshotTimerRef.current = window.setInterval(() => {
      runLiveSnapshot();
    }, 6000);

    // 2. Initialize Native MediaRecorder channel (Hardware Level Capture)
    try {
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };
      mr.start(500);
      mediaRecorderRef.current = mr;
    } catch (e) {
      console.warn("[useElevenLabsSTT] MediaRecorder init fallback:", e);
    }

    // 3. Initialize AudioContext PCM Processor channel (Standard 16-bit WAV)
    try {
      const AudioCtxCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtxCtor();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = source;

      // Buffer size 4096 mono input
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      // Dummy zero-gain node prevents feedback echo
      const dummyGain = ctx.createGain();
      dummyGain.gain.value = 0;
      dummyGainRef.current = dummyGain;

      processor.onaudioprocess = (e) => {
        if (!isCapturingRef.current) return;
        const channelData = e.inputBuffer.getChannelData(0);
        pcmSamplesRef.current.push(new Float32Array(channelData));
      };

      source.connect(processor);
      processor.connect(dummyGain);
      dummyGain.connect(ctx.destination);
    } catch (err) {
      console.error("[useElevenLabsSTT] Audio capture init error:", err);
    }
  }, [stream, stopAudioCapture, runLiveSnapshot]);

  const stopListeningAndTranscribe = useCallback(async (): Promise<string> => {
    setIsTranscribing(true);

    if (snapshotTimerRef.current) {
      clearInterval(snapshotTimerRef.current);
      snapshotTimerRef.current = null;
    }

    let audioBlob = getAudioWavBlob();
    stopAudioCapture();

    // If WAV blob is not available, use MediaRecorder webm chunks
    if ((!audioBlob || audioBlob.size < 600) && recordedChunksRef.current.length > 0) {
      audioBlob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
    }

    let finalAnswer = latestTranscriptRef.current.trim();

    // If audio is available, perform final high-precision neural transcription with Gemini 3.5
    if (audioBlob && audioBlob.size > 600) {
      try {
        const result = await transcribeAudioMultiTier(audioBlob, () => {
          setQuotaExceeded(true);
        }, { final: true });
        if (result.text && result.text.trim().length > 0) {
          finalAnswer = result.text.trim();
          latestTranscriptRef.current = finalAnswer;
          setLiveTranscript(finalAnswer);
          setActiveEngine(result.engine);
        } else if (result.failed && !finalAnswer) {
          // The server could not transcribe (every engine failed). Say so rather than looking like silence.
          setSttError("Speech recognition is unavailable right now. Choose Type text, or try again in a moment.");
        }
      } catch (err) {
        console.warn("[useElevenLabsSTT] Final transcription error:", err);
      }
    }

    setIsTranscribing(false);
    return finalAnswer;
  }, [getAudioWavBlob, stopAudioCapture]);

  const clear = useCallback(() => {
    pcmSamplesRef.current = [];
    recordedChunksRef.current = [];
    latestTranscriptRef.current = "";
    lastTranscribedChunkCountRef.current = 0;
    setLiveTranscript("");
    setSttError(null);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
  }, []);

  useEffect(() => {
    return () => {
      stopAudioCapture();
    };
  }, [stopAudioCapture]);

  return {
    startListening,
    stopListeningAndTranscribe,
    clear,
    isRecording,
    isTranscribing,
    liveTranscript,
    interimText: "",
    sttError,
    quotaExceeded,
    activeEngine,
    setLiveTranscript: (t: string) => {
      latestTranscriptRef.current = t;
      setLiveTranscript(t);
    },
  };
}
