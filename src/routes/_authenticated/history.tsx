import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const { user } = useSession();
  const { role } = useProfile();

  if (role === "lecturer") return <LecturerSessions />;
  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-primary">My attendance</h1>
        <p className="text-sm text-muted-foreground">Every session you signed in for.</p>
      </header>
      <StudentHistory userId={user?.id} />
    </AppShell>
  );
}

function StudentHistory({ userId }: { userId?: string }) {
  const { data } = useQuery({
    queryKey: ["my-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("attendance")
        .select("id, marked_at, sessions(started_at, courses(code, title))")
        .eq("student_id", userId!)
        .order("marked_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      {data?.length ? data.map((a: any) => (
        <div key={a.id} className="flex items-center justify-between border-b p-4 last:border-b-0">
          <div>
            <div className="text-xs font-bold text-secondary">{a.sessions?.courses?.code}</div>
            <div className="font-medium">{a.sessions?.courses?.title}</div>
          </div>
          <div className="text-xs text-muted-foreground">{new Date(a.marked_at).toLocaleString()}</div>
        </div>
      )) : <div className="p-8 text-center text-sm text-muted-foreground">No attendance yet.</div>}
    </div>
  );
}

function LecturerSessions() {
  const { user } = useSession();
  const { data } = useQuery({
    queryKey: ["my-sessions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("sessions")
        .select("id, status, started_at, ended_at, courses(code, title)")
        .eq("lecturer_id", user!.id)
        .order("started_at", { ascending: false });
      return data ?? [];
    },
  });
  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-primary">My sessions</h1>
        <p className="text-sm text-muted-foreground">All lectures you've held.</p>
      </header>
      <div className="overflow-hidden rounded-2xl border bg-card">
        {data?.length ? data.map((s: any) => (
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
        )) : <div className="p-8 text-center text-sm text-muted-foreground">No sessions yet.</div>}
      </div>
    </AppShell>
  );
}
