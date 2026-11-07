import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Wraps the browser's native speechSynthesis so the AI interviewer actually
 * speaks its questions out loud, instead of a silent timer standing in for
 * "AI speaking".
 */
export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [supported] = useState(() => typeof window !== "undefined" && "speechSynthesis" in window);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (!supported) return;
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speak = useCallback(
    (text: string) =>
      new Promise<void>((resolve) => {
        if (!supported) {
          resolve();
          return;
        }
        window.speechSynthesis.cancel();

        const utter = new SpeechSynthesisUtterance(text);
        utter.rate = 1.02;
        utter.pitch = 0.95;

        const voices = voicesRef.current.length ? voicesRef.current : window.speechSynthesis.getVoices();
        const preferred =
          voices.find((v) => /en-(US|GB)/i.test(v.lang) && /male|david|guy|daniel|fred/i.test(v.name)) ??
          voices.find((v) => /en/i.test(v.lang));
        if (preferred) utter.voice = preferred;

        utter.onstart = () => setSpeaking(true);
        utter.onboundary = () => setPulse((p) => p + 1);
        utter.onend = () => {
          setSpeaking(false);
          resolve();
        };
        utter.onerror = () => {
          setSpeaking(false);
          resolve();
        };

        window.speechSynthesis.speak(utter);
      }),
    [supported],
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  return { speak, cancel, speaking, pulse, supported };
}
