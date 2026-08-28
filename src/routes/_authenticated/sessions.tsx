import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { useState } from "react";
import { PlayCircle, Plus, StopCircle, QrCode, X, MapPin, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sessions")({
  component: SessionsPage,
});

function SessionsPage() {
  const { user } = useSession();
  const { role } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [starting, setStarting] = useState(false);

  const coursesQ = useQuery({
    queryKey: ["my-lecturer-courses", user?.id],
    enabled: !!user && role === "lecturer",
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, code, title").eq("lecturer_id", user!.id).order("code");
      return data ?? [];
    },
  });

  const sessionsQ = useQuery({
    queryKey: ["my-sessions", user?.id],
    enabled: !!user && role === "lecturer",
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, title, status, started_at, ended_at, radius_meters, latitude, courses(code, title)")
        .eq("lecturer_id", user!.id)
        .order("started_at", { ascending: false });
      return data ?? [];
    },
  });

  async function startSession(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (starting) return;
    setStarting(true);
    try {
      const fd = new FormData(e.currentTarget);
      const courseId = String(fd.get("course_id"));
      const title = String(fd.get("title") || "").trim() || null;
      const radius = Number(fd.get("radius") || 50);
      if (!courseId) { toast.error("Choose a course"); return; }

      const loc = await new Promise<GeolocationPosition | null>((res) => {
        if (!navigator.geolocation) return res(null);
        navigator.geolocation.getCurrentPosition(res, () => res(null), { enableHighAccuracy: true, timeout: 6000 });
      });
      if (!loc) toast.warning("Location unavailable — students won't be GPS-verified.");

      const { data, error } = await supabase.from("sessions").insert({
        course_id: courseId,
        lecturer_id: user!.id,
        title,
        radius_meters: radius,
        latitude: loc?.coords.latitude ?? null,
        longitude: loc?.coords.longitude ?? null,
      }).select("id").single();
      if (error || !data) { toast.error(error?.message ?? "Failed to start"); return; }
      qc.invalidateQueries({ queryKey: ["my-sessions"] });
      navigate({ to: "/session/$id", params: { id: data.id } });
    } finally {
      setStarting(false);
    }
  }

  async function endSession(id: string) {
    if (!confirm("End this session?")) return;
    await supabase.from("sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["my-sessions"] });
    toast.success("Session ended");
  }

  if (role && role !== "lecturer" && role !== "admin") {
    return (
      <AppShell>
        <div className="rounded-3xl border bg-card p-12 text-center text-muted-foreground">
          Sessions management is for lecturers.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Sessions</h1>
          <p className="text-sm text-muted-foreground">Start a live class and let students scan the rotating QR to mark attendance.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elev hover:opacity-90"
        >
          {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> New session</>}
        </button>
      </header>

      {showForm && (
        <form onSubmit={startSession} className="mb-6 rounded-3xl border bg-card-gradient p-5 shadow-elev">
          <div className="mb-3 font-display text-lg font-bold text-primary">Start a new session</div>
          {!coursesQ.data?.length ? (
            <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              You need to add a course first. Go to{" "}
              <Link to="/courses" className="font-semibold text-primary hover:underline">My courses</Link>.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Course</span>
                <select name="course_id" required className="w-full rounded-xl border bg-background px-3 py-2 text-sm">
                  <option value="">Select a course…</option>
                  {coursesQ.data.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.title}</option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Session title (optional)</span>
                <input name="title" placeholder="Week 5 — Normalisation" className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">GPS radius (m)</span>
                <input name="radius" type="number" min={10} max={500} defaultValue={50} className="w-full rounded-xl border bg-background px-3 py-2 text-sm" />
              </label>
              <div className="flex items-end">
                <button
                  disabled={starting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-hero py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                >
                  <PlayCircle className="h-4 w-4" /> {starting ? "Starting…" : "Start & show QR"}
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      <section>
        <h3 className="mb-3 font-display text-lg font-bold">All sessions</h3>
        {!sessionsQ.data?.length ? (
          <div className="rounded-3xl border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
            No sessions yet. Click <span className="font-semibold">New session</span> to start one.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {sessionsQ.data.map((s: any) => {
              const active = s.status === "active";
              return (
                <div key={s.id} className="rounded-2xl border bg-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-secondary">{s.courses?.code}</div>
                      <div className="truncate font-display font-bold">{s.title || s.courses?.title}</div>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(s.started_at).toLocaleString()}</span>
                        {s.latitude != null && (
                          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{s.radius_meters}m</span>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${active ? "bg-success/10 text-success animate-pulse" : "bg-muted text-muted-foreground"}`}>
                      {active ? "LIVE" : "ENDED"}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      to="/session/$id"
                      params={{ id: s.id }}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-primary py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                    >
                      <QrCode className="h-3 w-3" /> {active ? "Open QR" : "View report"}
                    </Link>
                    {active && (
                      <button
                        onClick={() => endSession(s.id)}
                        className="inline-flex items-center justify-center gap-1 rounded-full border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
                      >
                        <StopCircle className="h-3 w-3" /> End
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AppShell>
  );
}
