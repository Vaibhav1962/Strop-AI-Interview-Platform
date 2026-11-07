import { useCallback, useEffect, useRef, useState } from "react";

export type MediaPermissionState = "idle" | "requesting" | "granted" | "denied" | "unsupported";

/**
 * Robust camera stream acquisition cascade:
 * 1. HD user facing (e.g. mobile/laptop front camera)
 * 2. Standard user facing
 * 3. Any available video device (essential for desktop PCs, USB webcams, virtual cameras like OBS/Camo)
 */
async function requestVideoStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      },
    });
  } catch (e1) {
    console.warn("[useMediaCapture] HD user-facing video request failed, trying simple facingMode:", e1);
  }

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
    });
  } catch (e2) {
    console.warn("[useMediaCapture] Simple user-facing video request failed, falling back to any video device:", e2);
  }

  return await navigator.mediaDevices.getUserMedia({ video: true });
}

function formatMediaError(err: any, type: "camera" | "mic"): string {
  if (!err) return `${type === "camera" ? "Camera" : "Microphone"} device error.`;
  const name = err.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return `${type === "camera" ? "Camera" : "Microphone"} access denied. Please allow device access in browser settings.`;
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return `No ${type === "camera" ? "camera" : "microphone"} detected on this system.`;
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return `${type === "camera" ? "Camera" : "Microphone"} is already in use by another application.`;
  }
  if (name === "OverconstrainedError") {
    return `${type === "camera" ? "Camera" : "Microphone"} constraints could not be satisfied.`;
  }
  return err.message || `${type === "camera" ? "Camera" : "Microphone"} unavailable.`;
}

/**
 * Requests real camera + microphone access via getUserMedia with graceful fallbacks.
 * Features an auto-attaching callback ref and dynamic track acquisition
 * to ensure video streams never appear black across screen transitions or re-renders.
 */
export function useMediaCapture() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [permission, setPermission] = useState<MediaPermissionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [hasVideoTrack, setHasVideoTrack] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [retryTick, setRetryTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!navigator.mediaDevices?.getUserMedia) {
      setPermission("unsupported");
      setError("Browser mediaDevices API is not supported in this environment or requires HTTPS/localhost.");
      return;
    }

    setPermission("requesting");
    setError(null);
    setCameraError(null);

    const acquireMedia = async () => {
      let videoTrack: MediaStreamTrack | null = null;
      let audioTrack: MediaStreamTrack | null = null;
      let videoErrMsg: string | null = null;
      let audioErrMsg: string | null = null;

      // 1. Acquire video with robust fallback cascade
      try {
        const videoStream = await requestVideoStream();
        videoTrack = videoStream.getVideoTracks()[0] || null;
      } catch (vErr: any) {
        console.warn("[useMediaCapture] Video acquisition cascade failed:", vErr);
        videoErrMsg = formatMediaError(vErr, "camera");
      }

      // 2. Acquire audio
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioTrack = audioStream.getAudioTracks()[0] || null;
      } catch (aErr: any) {
        console.warn("[useMediaCapture] Audio acquisition failed:", aErr);
        audioErrMsg = formatMediaError(aErr, "mic");
      }

      if (cancelled) {
        videoTrack?.stop();
        audioTrack?.stop();
        return;
      }

      const activeTracks = [videoTrack, audioTrack].filter(Boolean) as MediaStreamTrack[];

      if (activeTracks.length > 0) {
        const combined = new MediaStream(activeTracks);
        streamRef.current = combined;
        setStream(combined);
        setPermission("granted");

        const hasVideo = !!videoTrack;
        setHasVideoTrack(hasVideo);
        setCameraOn(hasVideo);
        if (!hasVideo && videoErrMsg) {
          setCameraError(videoErrMsg);
        }

        if (videoRef.current && hasVideo) {
          const node = videoRef.current;
          node.defaultMuted = true;
          node.muted = true;
          node.playsInline = true;
          node.setAttribute("playsinline", "true");
          node.setAttribute("muted", "true");
          node.srcObject = combined;
          node.play().catch(() => {});
        }
      } else {
        setPermission("denied");
        const msg = audioErrMsg || videoErrMsg || "Camera and microphone access were denied. Please allow device access in browser settings.";
        setError(msg);
        setCameraError(videoErrMsg || msg);
      }
    };

    acquireMedia();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [retryTick]);

  // Callback ref: Called by React whenever a <video> element mounts into the DOM
  const attachVideoNode = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;

    if (node && streamRef.current && streamRef.current.getVideoTracks().length > 0) {
      node.defaultMuted = true;
      node.muted = true;
      node.playsInline = true;
      node.setAttribute("playsinline", "true");
      node.setAttribute("muted", "true");

      if (node.srcObject !== streamRef.current) {
        node.srcObject = streamRef.current;
      }

      node.onloadedmetadata = () => {
        node.play().catch((e) => console.warn("[useMediaCapture] play() onloadedmetadata:", e));
      };

      node.play().catch((e) => console.warn("[useMediaCapture] direct play():", e));
    }
  }, []);

  useEffect(() => {
    if (videoRef.current && stream && hasVideoTrack) {
      const node = videoRef.current;
      node.defaultMuted = true;
      node.muted = true;
      node.playsInline = true;
      node.setAttribute("playsinline", "true");
      node.setAttribute("muted", "true");

      if (node.srcObject !== stream) {
        node.srcObject = stream;
      }

      node.play().catch(() => {});
    }
  }, [stream, hasVideoTrack]);

  // Dynamic Camera Toggle: If camera track doesn't exist yet, actively request it with cascade
  const toggleCamera = useCallback(async () => {
    if (!streamRef.current) {
      try {
        setCameraError(null);
        const vStream = await requestVideoStream();
        streamRef.current = vStream;
        setStream(vStream);
        setHasVideoTrack(true);
        setCameraOn(true);
        if (videoRef.current) {
          videoRef.current.srcObject = vStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        setCameraError(formatMediaError(err, "camera"));
      }
      return;
    }

    const currentVideoTracks = streamRef.current.getVideoTracks();

    // If no video track is in the active stream, request one from getUserMedia
    if (currentVideoTracks.length === 0) {
      try {
        setCameraError(null);
        const vStream = await requestVideoStream();
        const newTrack = vStream.getVideoTracks()[0];
        if (newTrack && streamRef.current) {
          streamRef.current.addTrack(newTrack);
          setHasVideoTrack(true);
          setCameraOn(true);

          if (videoRef.current) {
            const node = videoRef.current;
            node.defaultMuted = true;
            node.muted = true;
            node.playsInline = true;
            node.srcObject = streamRef.current;
            node.play().catch(() => {});
          }
        }
      } catch (err: any) {
        console.warn("[useMediaCapture] Dynamic video track request failed:", err);
        setCameraError(formatMediaError(err, "camera"));
      }
      return;
    }

    // Toggle enabled state of existing video tracks
    setCameraOn((on) => {
      const next = !on;
      currentVideoTracks.forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  const toggleMic = useCallback(() => {
    setMicOn((on) => {
      const next = !on;
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }, []);

  const stopAll = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }, []);

  const retry = useCallback(() => setRetryTick((n) => n + 1), []);

  return {
    stream,
    videoRef,
    attachVideoNode,
    permission,
    error,
    cameraError,
    cameraOn,
    micOn,
    hasVideoTrack,
    toggleCamera,
    toggleMic,
    stopAll,
    retry,
  };
}
