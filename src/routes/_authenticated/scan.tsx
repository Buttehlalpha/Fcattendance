import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ScanLine, CheckCircle2, AlertTriangle, Keyboard, ScanFace, ShieldCheck } from "lucide-react";
import { FaceCamera } from "@/components/FaceCamera";
import { enrollFace, getFaceStatus, markAttendanceWithFace } from "@/lib/face.functions";

export const Route = createFileRoute("/_authenticated/scan")({
  component: ScanPage,
});

function deviceHash() {
  const key = "atbu-device-id";
  let id = localStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(key, id);
  }
  return id;
}

async function getCoords() {
  try {
    const pos = await new Promise<GeolocationPosition>((res, rej) => {
      if (!navigator.geolocation) return rej(new Error("no-geo"));
      navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 8000 });
    });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    return { lat: null, lon: null };
  }
}

function ScanPage() {
  const [status, setStatus] = useState<
    "idle" | "scanning" | "face" | "processing" | "success" | "error" | "enroll"
  >("idle");
  const [message, setMessage] = useState<string>("");
  const [token, setToken] = useState<string>("");
  const [detail, setDetail] = useState<{ code?: string; title?: string; faceScore?: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const faceStatusFn = useServerFn(getFaceStatus);
  const enrollFn = useServerFn(enrollFace);
  const markFn = useServerFn(markAttendanceWithFace);

  const faceQ = useQuery({ queryKey: ["face-status"], queryFn: () => faceStatusFn({} as any) });
  const enrolled = faceQ.data?.enrolled ?? false;

  function acceptToken(raw: string) {
    if (busy || status === "processing") return;
    const t = raw.trim();
    if (!t) return;
    setToken(t);
    if (!enrolled) {
      setStatus("enroll");
      toast.info("Enrol your face once to complete verification.");
      return;
    }
    setStatus("face");
  }

  async function submitSelfie(selfie: string) {
    setBusy(true);
    setMessage("Getting your location…");
    try {
      const { lat, lon } = await getCoords();
      setMessage("Verifying your face…");
      const res = await markFn({ data: { token, selfie, deviceHash: deviceHash(), lat, lon } });
      setDetail({ code: res.code, title: res.title, faceScore: res.faceScore });
      setStatus("success");
      toast.success("Face verified · attendance recorded!");
    } catch (e: any) {
      setStatus("error");
      setMessage(e?.message ?? "Failed to record attendance.");
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitEnrollment(image: string) {
    setBusy(true);
    try {
      await enrollFn({ data: { image } });
      await faceQ.refetch();
      toast.success("Face enrolled");
      setStatus(token ? "face" : "idle");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not enrol your face.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-primary">Sign in to lecture</h1>
        <p className="text-sm text-muted-foreground">
          Scan the QR code or type the 6-digit code — then a quick AI face check confirms it's really you.
        </p>
      </header>

      <div className="mx-auto max-w-md">
        {status === "idle" && (
          <div className="space-y-4">
            <div
              className={`flex items-center gap-3 rounded-2xl border p-4 text-sm ${
                enrolled ? "border-success/30 bg-success/5" : "border-gold/40 bg-gold/5"
              }`}
            >
              {enrolled ? (
                <ShieldCheck className="h-5 w-5 shrink-0 text-success" />
              ) : (
                <ScanFace className="h-5 w-5 shrink-0 text-secondary" />
              )}
              <div className="flex-1">
                <div className="font-semibold">
                  {enrolled ? "Face verification active" : "Face not enrolled yet"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {enrolled
                    ? "Your selfie is matched against your enrolled photo on every sign-in."
                    : "Enrol your face once — it blocks proxy attendance."}
                </p>
              </div>
              <button
                onClick={() => setStatus("enroll")}
                className="rounded-full border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/5"
              >
                {enrolled ? "Update" : "Enrol"}
              </button>
            </div>

            <button
              onClick={() => setStatus("scanning")}
              className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl bg-hero p-10 text-white shadow-elev transition hover:opacity-95"
            >
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white/10 backdrop-blur">
                <ScanLine className="h-10 w-10 text-gold" />
              </div>
              <span className="font-display text-xl font-bold">Open camera</span>
              <span className="text-sm text-white/70">Scan the QR on screen</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">or enter code</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <PinEntry onSubmit={(v) => acceptToken(v)} />
          </div>
        )}

        {status === "scanning" && (
          <div className="overflow-hidden rounded-3xl border bg-black">
            <div className="relative aspect-square">
              <Scanner
                onScan={(res) => res[0]?.rawValue && acceptToken(res[0].rawValue)}
                onError={() => {}}
                constraints={{ facingMode: "environment" }}
                styles={{ container: { width: "100%", height: "100%" }, video: { objectFit: "cover" } }}
              />
              <div className="pointer-events-none absolute inset-6 rounded-2xl border-4 border-gold animate-pulse-ring" />
            </div>
            <div className="p-4 text-center text-sm text-white">Scanning…</div>
          </div>
        )}

        {status === "enroll" && (
          <div className="space-y-3">
            <div className="rounded-2xl border bg-card p-4 text-center">
              <h2 className="font-display text-lg font-bold text-primary">Enrol your face</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Taken once and used only to verify your attendance.
              </p>
            </div>
            <FaceCamera
              busy={busy}
              label="Save my face"
              hint="Look straight at the camera, no cap or mask, good lighting."
              onCapture={submitEnrollment}
              onCancel={() => setStatus(token ? "scanning" : "idle")}
            />
          </div>
        )}

        {(status === "face" || (status === "processing" && !busy)) && (
          <div className="space-y-3">
            <div className="rounded-2xl border bg-card p-4 text-center">
              <h2 className="font-display text-lg font-bold text-primary">Face verification</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {busy ? message : "Take a live selfie to confirm your identity."}
              </p>
            </div>
            <FaceCamera
              busy={busy}
              label="Verify & sign in"
              hint="Your selfie is compared with your enrolled photo by AI."
              onCapture={submitSelfie}
              onCancel={() => { setToken(""); setStatus("idle"); }}
            />
          </div>
        )}

        {status === "success" && (
          <div className="rounded-3xl border bg-card p-8 text-center shadow-elev">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-success/10">
              <CheckCircle2 className="h-10 w-10 text-success" />
            </div>
            <h2 className="mt-4 font-display text-2xl font-bold">You're marked present</h2>
            {detail && <p className="mt-1 text-sm text-muted-foreground">{detail.code} · {detail.title}</p>}
            {typeof detail?.faceScore === "number" && (
              <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                <ShieldCheck className="h-3 w-3" /> Face match {detail.faceScore}%
              </p>
            )}
            <button
              onClick={() => { setStatus("idle"); setDetail(null); setToken(""); }}
              className="mt-6 block w-full rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Done
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="rounded-3xl border bg-card p-8 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <h2 className="mt-4 font-display text-xl font-bold">Couldn't record attendance</h2>
            <p className="mt-1 text-sm text-muted-foreground">{message}</p>
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setStatus(token ? "face" : "idle")}
                className="flex-1 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Try again
              </button>
              <button
                onClick={() => { setToken(""); setStatus("idle"); }}
                className="flex-1 rounded-full border px-5 py-2.5 text-sm font-semibold"
              >
                Start over
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}


function PinEntry({ onSubmit }: { onSubmit: (pin: string) => void }) {
  const [pin, setPin] = useState("");
  const ok = /^\d{6}$/.test(pin);
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (ok) onSubmit(pin); }}
      className="rounded-3xl border bg-card p-5 shadow-sm"
    >
      <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        <Keyboard className="h-3.5 w-3.5" /> 6-digit code
      </label>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        autoComplete="one-time-code"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder="••••••"
        className="mt-2 w-full rounded-2xl border-2 border-dashed bg-background py-4 text-center font-mono text-3xl font-black tracking-[0.4em] text-primary focus:border-gold focus:outline-none"
      />
      <button
        type="submit"
        disabled={!ok}
        className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-elev disabled:cursor-not-allowed disabled:opacity-40"
      >
        Sign me in
      </button>
    </form>
  );
}

