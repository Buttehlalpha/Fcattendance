import { useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X } from "lucide-react";

/**
 * Front-camera capture used for AI face verification.
 * Returns a compressed JPEG data URL.
 */
export function FaceCamera({
  onCapture,
  onCancel,
  busy,
  label = "Capture",
  hint,
}: {
  onCapture: (dataUrl: string) => void;
  onCancel?: () => void;
  busy?: boolean;
  label?: string;
  hint?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        setError("Camera access denied. Allow camera permission to continue.");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const side = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - side) / 2;
    const sy = (video.videoHeight - side) / 2;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
    setShot(canvas.toDataURL("image/jpeg", 0.8));
  }

  if (error) {
    return (
      <div className="rounded-3xl border bg-card p-6 text-center">
        <p className="text-sm text-destructive">{error}</p>
        {onCancel && (
          <button onClick={onCancel} className="mt-4 rounded-full border px-4 py-2 text-sm font-semibold">
            Back
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border bg-black shadow-elev">
      <div className="relative aspect-square">
        {shot ? (
          <img src={shot} alt="Captured face" className="h-full w-full object-cover" />
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full scale-x-[-1] object-cover"
          />
        )}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="h-[68%] w-[56%] rounded-[50%] border-4 border-gold/80 animate-pulse-ring" />
        </div>
        {busy && (
          <div className="absolute inset-0 grid place-items-center bg-black/60 text-center text-sm font-semibold text-white">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" /> Verifying your face…
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 bg-card p-4">
        {hint && <p className="text-center text-xs text-muted-foreground">{hint}</p>}
        {shot ? (
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => setShot(null)}
              className="flex-1 rounded-full border py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              Retake
            </button>
            <button
              disabled={busy}
              onClick={() => onCapture(shot)}
              className="flex-1 rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-elev disabled:opacity-40"
            >
              {label}
            </button>
          </div>
        ) : (
          <button
            disabled={!ready || busy}
            onClick={capture}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-hero py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            <Camera className="h-4 w-4" /> {ready ? "Take photo" : "Starting camera…"}
          </button>
        )}
        {onCancel && !busy && (
          <button
            onClick={onCancel}
            className="inline-flex w-full items-center justify-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        )}
      </div>
    </div>
  );
}
