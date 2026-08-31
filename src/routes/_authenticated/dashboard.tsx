import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/hooks/useProfile";
import { useSession } from "@/hooks/useSession";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { QrCode, ScanLine, BookOpen, Users, TrendingUp, TrendingDown, Minus, PlayCircle, Plus, Check, Sparkles, ShieldAlert, Trophy, BarChart3, AlertCircle, Search, X } from "lucide-react";
import { toast } from "sonner";
import { getStudentInsights, getLecturerRisk } from "@/lib/ai-insights.functions";

// Import the logo
import logo from "@/assests/logo.png";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardRouter,
});

function DashboardRouter() {
  const { role, profile, isLoading } = useProfile();
  return (
    <AppShell>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="font-display text-3xl font-bold text-primary">{profile?.full_name ?? "…"}</h1>
        </div>
        <img src={logo} alt="Logo" className="h-12 w-auto object-contain" />
      </header>
      {isLoading || !role ? (
        <div className="rounded-3xl border bg-card p-10 text-center text-muted-foreground">Loading…</div>
      ) : role === "student" ? (
        <StudentDash />
      ) : role === "lecturer" ? (
        <LecturerDash />
      ) : (
        <AdminDash />
      )}
    </AppShell>
  );
}

/* ---------- STUDENT ---------- */
function StudentDash() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["student-dash", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: enrolls }, { data: att }, { data: liveSess }, { data: courseRows, error: coursesErr }] = await Promise.all([
        supabase.from("enrollments").select("id, course_id, courses(id, code, title)").eq("student_id", user!.id),
        supabase.from("attendance").select("id, session_id, marked_at, sessions(course_id, courses(code, title))").eq("student_id", user!.id).order("marked_at", { ascending: false }).limit(5),
        supabase.from("sessions").select("id, course_id, started_at, courses(code, title)").eq("status", "active").order("started_at", { ascending: false }).limit(5),
        supabase.from("courses").select("id, code, title, level, lecturer_id").order("code"),
      ]);
      if (coursesErr) console.error("courses fetch failed", coursesErr);
      // Lecturer names are fetched separately (no FK embed between courses and profiles)
      const lecturerIds = Array.from(new Set((courseRows ?? []).map((c: any) => c.lecturer_id).filter(Boolean)));
      const { data: lecturers } = lecturerIds.length
        ? await supabase.from("profiles").select("id, full_name").in("id", lecturerIds)
        : { data: [] as any[] };
      const nameById: Record<string, string> = {};
      (lecturers ?? []).forEach((p: any) => (nameById[p.id] = p.full_name));
      const allCourses = (courseRows ?? []).map((c: any) => ({
        ...c,
        profiles: c.lecturer_id ? { full_name: nameById[c.lecturer_id] ?? null } : null,
      }));
      const enrolledIds = new Set((enrolls ?? []).map((e: any) => e.course_id));
      return { enrolls: enrolls ?? [], att: att ?? [], liveSess: liveSess ?? [], allCourses, enrolledIds };
    },
  });

  async function toggleEnroll(courseId: string, enrolled: boolean) {
    if (enrolled) {
      const { error } = await supabase.from("enrollments").delete().eq("student_id", user!.id).eq("course_id", courseId);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("enrollments").insert({ student_id: user!.id, course_id: courseId });
      if (error) return toast.error(error.message);
    }
    toast.success(enrolled ? "Unenrolled" : "Enrolled");
    qc.invalidateQueries({ queryKey: ["student-dash", user?.id] });
  }

  const totalCourses = data?.enrolls.length ?? 0;
  const attended = data?.att.length ?? 0;
  const pct = totalCourses ? Math.min(100, Math.round((attended / Math.max(totalCourses, 1)) * 100)) : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Enrolled courses" value={totalCourses} icon={BookOpen} />
        <Stat label="Recent scans" value={attended} icon={ScanLine} />
        <Stat label="Attendance" value={`${pct}%`} icon={TrendingUp} accent />
      </div>

      <Link
        to="/scan"
        className="relative flex items-center justify-between overflow-hidden rounded-3xl bg-hero p-6 text-white shadow-elev"
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-gold">Ready to sign in?</div>
          <h2 className="mt-1 font-display text-2xl font-bold">Scan a lecture QR</h2>
          <p className="text-sm text-white/70">Point your camera at the code on the projector.</p>
        </div>
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-white/10 backdrop-blur">
          <ScanLine className="h-8 w-8 text-gold" />
        </div>
      </Link>

      <StudentAIInsights />

      {data?.enrolls?.length ? (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">My courses</h3>
            <Link to="/courses" className="text-sm text-primary hover:underline">Manage →</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.enrolls.map((e: any) => (
              <div key={e.id} className="rounded-2xl border bg-card-gradient p-4 transition hover:shadow-elev">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-secondary">{e.courses?.code}</div>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">Enrolled</span>
                </div>
                <div className="mt-1 font-semibold">{e.courses?.title}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="mb-3 font-display text-lg font-bold">Live sessions right now</h3>
        {data?.liveSess.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.liveSess.map((s: any) => (
              <div key={s.id} className="rounded-2xl border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-secondary">{s.courses?.code}</div>
                    <div className="font-semibold">{s.courses?.title}</div>
                  </div>
                  <span className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success">LIVE</span>
                </div>
                <Link to="/scan" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">
                  Scan to join →
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
            No active sessions right now.
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-bold">Recent attendance</h3>
        <div className="overflow-hidden rounded-2xl border bg-card">
          {data?.att.length ? data.att.map((a: any) => (
            <div key={a.id} className="flex items-center justify-between border-b p-4 last:border-b-0">
              <div>
                <div className="text-xs font-bold text-secondary">{a.sessions?.courses?.code}</div>
                <div className="font-medium">{a.sessions?.courses?.title}</div>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(a.marked_at).toLocaleString()}</div>
            </div>
          )) : <div className="p-6 text-center text-sm text-muted-foreground">No records yet.</div>}
        </div>
      </section>

      <EnrollSearch
        allCourses={data?.allCourses ?? []}
        enrolledIds={data?.enrolledIds ?? new Set()}
        onToggle={toggleEnroll}
      />
    </div>
  );
}

function EnrollSearch({ allCourses, enrolledIds, onToggle }: { allCourses: any[]; enrolledIds: Set<string>; onToggle: (id: string, enrolled: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const results = query
    ? allCourses.filter((c: any) =>
        c.code?.toLowerCase().includes(query) ||
        c.title?.toLowerCase().includes(query) ||
        c.profiles?.full_name?.toLowerCase().includes(query)
      ).slice(0, 20)
    : [];

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg font-bold">Find & enrol in a course</h3>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-2xl border bg-card p-4 text-left text-sm text-muted-foreground shadow-sm transition hover:shadow-elev"
      >
        <Search className="h-4 w-4" />
        Search by course code, title or lecturer…
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20 backdrop-blur-sm animate-in fade-in" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border bg-card shadow-elev animate-in slide-in-from-top-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b p-3">
              <Search className="ml-2 h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Type course code or title…"
                className="flex-1 bg-transparent py-2 text-sm focus:outline-none"
              />
              <button onClick={() => setOpen(false)} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {!query ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Start typing to find courses created by lecturers.</div>
              ) : results.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No courses match "{q}".</div>
              ) : (
                results.map((c: any) => {
                  const enrolled = enrolledIds.has(c.id);
                  return (
                    <div key={c.id} className="flex items-center gap-3 border-b p-4 last:border-b-0">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hero text-gold">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-secondary">{c.code}</div>
                        <div className="truncate text-sm font-semibold">{c.title}</div>
                        <div className="truncate text-[11px] text-muted-foreground">
                          {c.profiles?.full_name ? `by ${c.profiles.full_name}` : "Unassigned"} · L{c.level}
                        </div>
                      </div>
                      <button
                        onClick={() => onToggle(c.id, enrolled)}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition ${enrolled ? "bg-success/10 text-success hover:bg-success/20" : "bg-primary text-primary-foreground hover:opacity-90"}`}
                      >
                        {enrolled ? <><Check className="h-3 w-3" /> Enrolled</> : <><Plus className="h-3 w-3" /> Enrol</>}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- LECTURER ---------- */
function LecturerDash() {
  const { user } = useSession();
  const { data } = useQuery({
    queryKey: ["lecturer-dash", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: courses }, { data: sessions }] = await Promise.all([
        supabase.from("courses").select("id, code, title, level").eq("lecturer_id", user!.id),
        supabase.from("sessions").select("id, status, started_at, courses(code, title)").eq("lecturer_id", user!.id).order("started_at", { ascending: false }).limit(5),
      ]);
      return { courses: courses ?? [], sessions: sessions ?? [] };
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="My courses" value={data?.courses.length ?? 0} icon={BookOpen} />
        <Stat label="Total sessions" value={data?.sessions.length ?? 0} icon={PlayCircle} />
        <Stat label="Active now" value={data?.sessions.filter((s: any) => s.status === "active").length ?? 0} icon={QrCode} accent />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Start a session</h3>
          <div className="flex gap-3 text-sm">
            <Link to="/courses" className="text-primary hover:underline">Manage courses →</Link>
            <Link to="/sessions" className="text-primary hover:underline">All sessions →</Link>
          </div>
        </div>
        {data?.courses.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.courses.map((c) => (
              <div key={c.id} className="rounded-2xl border bg-card p-4">
                <div className="text-xs font-bold text-secondary">{c.code} · Level {c.level}</div>
                <div className="font-semibold">{c.title}</div>
                <StartSessionButton courseId={c.id} />
              </div>
            ))}
          </div>
        ) : (
          <Link to="/courses" className="block rounded-2xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground hover:bg-accent">
            You haven't added any courses yet. <span className="font-semibold text-primary">Add your first course →</span>
          </Link>
        )}
      </section>

      <LecturerAIRisk />

      <section>
        <h3 className="mb-3 font-display text-lg font-bold">Recent sessions</h3>
        <div className="overflow-hidden rounded-2xl border bg-card">
          {data?.sessions.length ? data.sessions.map((s: any) => (
            <Link key={s.id} to="/session/$id" params={{ id: s.id }} className="flex items-center justify-between border-b p-4 last:border-b-0 hover:bg-accent">
              <div>
                <div className="text-xs font-bold text-secondary">{s.courses?.code}</div>
                <div className="font-medium">{s.courses?.title}</div>
                <div className="text-xs text-muted-foreground">{new Date(s.started_at).toLocaleString()}</div>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                {s.status === "active" ? "LIVE" : "ENDED"}
              </span>
            </Link>
          )) : <div className="p-6 text-center text-sm text-muted-foreground">No sessions yet.</div>}
        </div>
      </section>
    </div>
  );
}

function StartSessionButton({ courseId }: { courseId: string }) {
  const { user } = useSession();
  return (
    <button
      onClick={async () => {
        // capture GPS
        const loc = await new Promise<GeolocationPosition | null>((res) => {
          if (!navigator.geolocation) return res(null);
          navigator.geolocation.getCurrentPosition(res, () => res(null), { enableHighAccuracy: true, timeout: 5000 });
        });
        const { data, error } = await supabase.from("sessions").insert({
          course_id: courseId,
          lecturer_id: user!.id,
          latitude: loc?.coords.latitude ?? null,
          longitude: loc?.coords.longitude ?? null,
        }).select("id").single();
        if (error || !data) { alert(error?.message ?? "Failed"); return; }
        window.location.href = `/session/${data.id}`;
      }}
      className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
    >
      <PlayCircle className="h-4 w-4" /> Start session
    </button>
  );
}

/* ---------- ADMIN ---------- */
function AdminDash() {
  const { data } = useQuery({
    queryKey: ["admin-dash"],
    queryFn: async () => {
      const [{ count: courses }, { count: users }, { count: sessions }, { count: attendance }] = await Promise.all([
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("sessions").select("*", { count: "exact", head: true }),
        supabase.from("attendance").select("*", { count: "exact", head: true }),
      ]);
      return { courses: courses ?? 0, users: users ?? 0, sessions: sessions ?? 0, attendance: attendance ?? 0 };
    },
  });
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={data?.users ?? 0} icon={Users} />
        <Stat label="Courses" value={data?.courses ?? 0} icon={BookOpen} />
        <Stat label="Sessions" value={data?.sessions ?? 0} icon={PlayCircle} />
        <Stat label="Records" value={data?.attendance ?? 0} icon={TrendingUp} accent />
      </div>
      <Link to="/admin" className="block rounded-3xl bg-hero p-6 text-white shadow-elev">
        <div className="text-xs font-semibold uppercase tracking-widest text-gold">Admin</div>
        <h2 className="mt-1 font-display text-2xl font-bold">Manage courses, lecturers & reports →</h2>
      </Link>
    </div>
  );
}

/* ---------- Shared ---------- */
function Stat({ label, value, icon: Icon, accent }: { label: string; value: number | string; icon: any; accent?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 ${accent ? "bg-gold-gradient text-gold-foreground" : "bg-card"}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold uppercase tracking-wider ${accent ? "text-gold-foreground/70" : "text-muted-foreground"}`}>{label}</span>
        <Icon className="h-4 w-4 opacity-70" />
      </div>
      <div className="mt-2 font-display text-3xl font-bold">{value}</div>
    </div>
  );
}

/* ---------- AI Insights ---------- */
const STATUS_STYLES = {
  safe: "bg-success/10 text-success",
  warning: "bg-gold/20 text-secondary",
  critical: "bg-destructive/10 text-destructive",
} as const;

function StudentAIInsights() {
  const call = useServerFn(getStudentInsights);
  const { data, isLoading } = useQuery({
    queryKey: ["ai-student-insights"],
    queryFn: () => call(),
    staleTime: 60_000,
  });
  if (isLoading) {
    return <div className="rounded-3xl border bg-card p-6 text-sm text-muted-foreground">Analysing your attendance…</div>;
  }
  if (!data || !data.overall) return null;
  const { overall, perCourse, narrative } = data;
  return (
    <section className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold-gradient text-gold-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-display text-lg font-bold">AI attendance insights</h3>
          <p className="text-xs text-muted-foreground">Prediction & risk based on your scans</p>
        </div>
        <span className={`ml-auto rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${STATUS_STYLES[overall.status]}`}>
          {overall.status}
        </span>
      </div>

      <div className="mb-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Predicted overall</span>
          <span className="font-display text-2xl font-bold">{overall.pct}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full transition-all ${overall.status === "safe" ? "bg-success" : overall.status === "warning" ? "bg-gold" : "bg-destructive"}`}
            style={{ width: `${Math.min(100, overall.pct)}%` }}
          />
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">Required: {overall.required}%</div>
      </div>

      {narrative && (
        <div className="mb-4 rounded-2xl bg-accent/50 p-3 text-sm">{narrative}</div>
      )}

      {perCourse.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {perCourse.map((c) => {
            const trend = (c as any).trend as "improving" | "stable" | "declining" | undefined;
            const TrendIcon = trend === "improving" ? TrendingUp : trend === "declining" ? TrendingDown : Minus;
            const trendColor = trend === "improving" ? "text-success" : trend === "declining" ? "text-destructive" : "text-muted-foreground";
            return (
              <div key={c.courseId} className="rounded-xl border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-secondary">{c.code}</div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[c.status]}`}>{c.status}</span>
                </div>
                <div className="mt-0.5 truncate text-sm font-medium">{c.title}</div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{c.present}/{c.held} sessions</span>
                  <span className="font-semibold text-foreground">{c.predictedPct}%</span>
                </div>
                {trend && (
                  <div className={`mt-1.5 flex items-center gap-1 text-[10px] font-semibold ${trendColor}`}>
                    <TrendIcon className="h-3 w-3" />
                    <span className="capitalize">{trend}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </section>
  );
}

function LecturerAIRisk() {
  const call = useServerFn(getLecturerRisk);
  const { data, isLoading } = useQuery({
    queryKey: ["ai-lecturer-risk"],
    queryFn: () => call(),
    staleTime: 60_000,
  });
  if (isLoading) {
    return <div className="rounded-3xl border bg-card p-6 text-sm text-muted-foreground">Scoring your students…</div>;
  }
  if (!data?.courses.length) return null;

  const flatFlagged = data.courses.flatMap((c: any) =>
    c.students.filter((s: any) => s.status !== "safe").map((s: any) => ({ ...s, code: c.code }))
  );
  const topPerformers = (data as any).topPerformers ?? [];
  const proxyAlerts = (data as any).proxyAlerts ?? [];

  return (
    <div className="space-y-6">
      {/* Course analytics */}
      <section className="rounded-3xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-hero text-gold">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">Course attendance analytics</h3>
            <p className="text-xs text-muted-foreground">Averages, high / low & count below 75%</p>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {data.courses.map((c: any) => (
            <div key={c.id} className="rounded-2xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-secondary">{c.code}</div>
                  <div className="text-sm font-semibold">{c.title}</div>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{c.held} held</span>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px]">
                <Metric label="Students" value={c.analytics.totalStudents} />
                <Metric label="Avg" value={`${c.analytics.avg}%`} />
                <Metric label="High" value={`${c.analytics.highest}%`} />
                <Metric label="Low" value={`${c.analytics.lowest}%`} tone={c.analytics.lowest < 50 ? "danger" : undefined} />
              </div>
              {c.analytics.belowThreshold > 0 && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {c.analytics.belowThreshold} student{c.analytics.belowThreshold === 1 ? "" : "s"} below 75%
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Top performers */}
      {topPerformers.length > 0 && (
        <section className="rounded-3xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold-gradient text-gold-foreground">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold">Best attendance</h3>
              <p className="text-xs text-muted-foreground">Top 5 students across your courses</p>
            </div>
          </div>
          <div className="space-y-2">
            {topPerformers.map((s: any, i: number) => (
              <div key={`${s.code}-${s.studentId}`} className="flex items-center justify-between rounded-xl border p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-gradient text-gold-foreground font-display font-black">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground">{s.matric || "—"} · {s.code}</div>
                  </div>
                </div>
                <span className="font-display text-lg font-bold text-success">{s.pct}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Proxy detection */}
      {proxyAlerts.length > 0 && (
        <section className="rounded-3xl border border-destructive/30 bg-destructive/5 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-destructive text-destructive-foreground">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-destructive">Proxy attendance detection</h3>
              <p className="text-xs text-muted-foreground">Suspicious device patterns worth reviewing</p>
            </div>
          </div>
          <div className="space-y-2">
            {proxyAlerts.map((s: any) => (
              <div key={`${s.code}-${s.studentId}`} className="flex items-center justify-between rounded-xl border border-destructive/20 bg-card p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">{s.matric || "—"} · {s.code}</div>
                  <div className="mt-0.5 text-[11px] text-destructive">{s.proxyReason}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg font-black text-destructive">{s.proxyScore}%</div>
                  <div className="text-[9px] font-bold uppercase text-destructive/70">risk</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* At-risk students */}
      <section className="rounded-3xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gold-gradient text-gold-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold">AI risk classification</h3>
            <p className="text-xs text-muted-foreground">Students below the 75% attendance threshold</p>
          </div>
        </div>

        {flatFlagged.length === 0 ? (
          <div className="rounded-2xl bg-success/10 p-4 text-sm text-success">Everyone is on track. No students at risk yet.</div>
        ) : (
          <div className="space-y-2">
            {flatFlagged.slice(0, 8).map((s: any) => (
              <div key={`${s.code}-${s.studentId}`} className="flex items-center justify-between rounded-xl border p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground">{s.matric || "—"} · {s.code} · {s.present}/{s.held}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold">{s.pct}%</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLES[s.status as keyof typeof STATUS_STYLES]}`}>{s.status}</span>
                </div>
              </div>
            ))}
            {flatFlagged.length > 8 && (
              <div className="pt-1 text-center text-xs text-muted-foreground">+{flatFlagged.length - 8} more at risk</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone?: "danger" }) {
  return (
    <div className={`rounded-lg border p-2 ${tone === "danger" ? "border-destructive/30 bg-destructive/5" : "bg-muted/30"}`}>
      <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-base font-bold ${tone === "danger" ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}