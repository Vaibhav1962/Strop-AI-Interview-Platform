import { useCallback, useEffect, useRef, useState } from "react";

interface IWindowSpeechRecognition extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

/**
 * High-reliability browser Speech-to-Text hook.
 * Continuously streams real-time speech into fullTranscript and interimText
 * with safe error recovery and no race conditions.
 */
export function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [fullTranscript, setFullTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const wantsListeningRef = useRef(false);
  const isRunningRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const accumulatedFinalsRef = useRef("");
  const sessionFinalsRef = useRef("");

  useEffect(() => {
    const win = typeof window !== "undefined" ? (window as unknown as IWindowSpeechRecognition) : null;
    const Ctor = win?.SpeechRecognition || win?.webkitSpeechRecognition;
    setSupported(!!Ctor);
  }, []);

  const safeStart = useCallback(() => {
    if (!wantsListeningRef.current) return;
    if (isRunningRef.current) return;

    const win = typeof window !== "undefined" ? (window as unknown as IWindowSpeechRecognition) : null;
    const Ctor = win?.SpeechRecognition || win?.webkitSpeechRecognition;
    if (!Ctor) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }

      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.maxAlternatives = 1;

      rec.onstart = () => {
        isRunningRef.current = true;
        setListening(true);
        setError(null);
      };

      rec.onresult = (event: any) => {
        let currentInterim = "";
        let currentFinal = "";

        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          const text = res[0]?.transcript || "";
          if (res.isFinal) {
            currentFinal += text + " ";
          } else {
            currentInterim += text;
          }
        }

        sessionFinalsRef.current = currentFinal.trim();
        const combinedFinal = [accumulatedFinalsRef.current, sessionFinalsRef.current]
          .filter(Boolean)
          .join(" ")
          .trim();

        const combinedFull = [combinedFinal, currentInterim]
          .filter(Boolean)
          .join(" ")
          .trim();

        setInterimText(currentInterim);
        setFullTranscript(combinedFull);
      };

      rec.onerror = (event: any) => {
        if (event.error === "no-speech" || event.error === "aborted") {
          return;
        }
        console.warn("[SpeechRecognition error]:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          wantsListeningRef.current = false;
          setError("Microphone permission denied. Please allow microphone access.");
        } else if (event.error === "network") {
          setError("Network speech recognition dropped. Neural audio transcription active.");
        }
      };

      rec.onend = () => {
        isRunningRef.current = false;
        setListening(false);

        // Commit session finals into accumulated finals
        if (sessionFinalsRef.current) {
          accumulatedFinalsRef.current = [accumulatedFinalsRef.current, sessionFinalsRef.current]
            .filter(Boolean)
            .join(" ")
            .trim();
          sessionFinalsRef.current = "";
        }

        // Restart smoothly after 150ms pause if still in candidate turn
        if (wantsListeningRef.current) {
          if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
          restartTimerRef.current = window.setTimeout(() => {
            if (wantsListeningRef.current && !isRunningRef.current) {
              safeStart();
            }
          }, 150);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.warn("[SpeechRecognition init error]:", err);
      isRunningRef.current = false;
      if (wantsListeningRef.current) {
        if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
        restartTimerRef.current = window.setTimeout(() => {
          if (wantsListeningRef.current && !isRunningRef.current) {
            safeStart();
          }
        }, 300);
      }
    }
  }, []);

  const start = useCallback(() => {
    wantsListeningRef.current = true;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    safeStart();
  }, [safeStart]);

  const stop = useCallback(() => {
    wantsListeningRef.current = false;
    isRunningRef.current = false;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        const rec = recognitionRef.current;
        rec.onstart = null;
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        rec.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setListening(false);
  }, []);

  const clear = useCallback(() => {
    accumulatedFinalsRef.current = "";
    sessionFinalsRef.current = "";
    setFullTranscript("");
    setInterimText("");
  }, []);

  useEffect(() => {
    return () => {
      wantsListeningRef.current = false;
      isRunningRef.current = false;
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  return {
    start,
    stop,
    clear,
    listening,
    fullTranscript,
    interimText,
    error,
    supported,
    setFullTranscript,
  };
}
