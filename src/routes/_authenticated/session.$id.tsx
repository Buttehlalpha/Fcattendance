import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Download, StopCircle, Users } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/_authenticated/session/$id")({
  component: SessionLive,
});

const ROTATE_SECONDS = 3600; // 1 hour — QR + PIN stay valid for the whole class

function randomToken(sessionId: string) {
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `ATBU-${sessionId.slice(0, 6)}-${dateStr}-${rnd}`;
}

function randomPin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}


function SessionLive() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [token, setToken] = useState<string>("");
  const [pin, setPin] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<number>(0);
  const [remaining, setRemaining] = useState<number>(ROTATE_SECONDS);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const rotatingRef = useRef(false);


  const sessionQ = useQuery({
    queryKey: ["session", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, status, started_at, ended_at, courses(code, title)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const attendanceQ = useQuery({
    queryKey: ["session-attendance", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("id, marked_at, profiles!attendance_student_profile_fkey(full_name, matric_number, level)")
        .eq("session_id", id)
        .order("marked_at", { ascending: false });
      if (error) { console.error(error); throw error; }
      return data ?? [];
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`att-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance", filter: `session_id=eq.${id}` }, () => {
        qc.invalidateQueries({ queryKey: ["session-attendance", id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, qc]);

  // Rotate token every ROTATE_SECONDS
  async function rotate() {
    if (rotatingRef.current) return;
    rotatingRef.current = true;
    try {
      const t = randomToken(id);
      const p = randomPin();
      const exp = new Date(Date.now() + ROTATE_SECONDS * 1000);
      const { error } = await supabase.from("session_tokens").insert({ session_id: id, token: t, pin_code: p, expires_at: exp.toISOString() });
      if (error) throw error;
      setToken(t);
      setPin(p);
      setExpiresAt(exp.getTime());
      const url = await QRCode.toDataURL(t, { width: 512, margin: 1, color: { dark: "#0A2540", light: "#FFFFFF" } });
      setQrDataUrl(url);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to rotate QR");
    } finally {
      rotatingRef.current = false;
    }
  }


  useEffect(() => {
    if (sessionQ.data?.status !== "active") return;
    rotate();
    const iv = setInterval(rotate, ROTATE_SECONDS * 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionQ.data?.status]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = setInterval(() => {
      const r = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setRemaining(r);
    }, 250);
    return () => clearInterval(tick);
  }, [expiresAt]);

  const isActive = sessionQ.data?.status === "active";
  const course: any = sessionQ.data?.courses;

  async function endSession() {
    if (!confirm("End this session? No more scans will be accepted.")) return;
    await supabase.from("sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["session", id] });
    toast.success("Session ended");
  }

  const rows = useMemo(() =>
    (attendanceQ.data ?? []).map((a: any) => ({
      Name: a.profiles?.full_name ?? "—",
      Matric: a.profiles?.matric_number ?? "—",
      Level: a.profiles?.level ?? "—",
      "Marked at": new Date(a.marked_at).toLocaleString(),
    })), [attendanceQ.data]);

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.writeFile(wb, `${course?.code ?? "session"}-attendance.xlsx`);
  }
  function exportPDF() {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(`${course?.code ?? ""} — ${course?.title ?? ""}`, 14, 16);
    doc.setFontSize(10);
    doc.text(`Session: ${new Date(sessionQ.data?.started_at ?? Date.now()).toLocaleString()}`, 14, 22);
    autoTable(doc, {
      startY: 28,
      head: [["Name", "Matric", "Level", "Marked at"]],
      body: rows.map((r) => [r.Name, r.Matric, r.Level, r["Marked at"]]),
      headStyles: { fillColor: [10, 37, 64] },
    });
    doc.save(`${course?.code ?? "session"}-attendance.pdf`);
  }

  return (
    <AppShell>
      <div className="mb-4 flex items-center justify-between">
        <Link to="/dashboard" className="text-sm text-muted-foreground hover:underline">← Back</Link>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isActive ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
          {isActive ? "LIVE" : "ENDED"}
        </span>
      </div>

      <header className="mb-6">
        <div className="text-xs font-bold text-secondary">{course?.code}</div>
        <h1 className="font-display text-3xl font-bold text-primary">{course?.title}</h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* QR card */}
        <div className="rounded-3xl border bg-card-gradient p-6 text-center shadow-elev">
          {isActive ? (
            <>
              <div className="mx-auto max-w-sm">
                <div className="relative rounded-2xl bg-white p-6">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Session QR" className="mx-auto h-full w-full" />
                  ) : (
                    <div className="grid aspect-square place-items-center text-muted-foreground">Generating…</div>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Refreshes in</span>
                  <span className="font-mono text-2xl font-bold text-primary">{`${String(Math.floor(remaining/60)).padStart(2,"0")}:${String(remaining%60).padStart(2,"0")}`}</span>
                </div>

                {/* 6-digit PIN — voice-friendly for large halls */}
                <div className="mt-4 rounded-2xl border-2 border-dashed border-gold bg-gold/10 p-4">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-secondary">Or read out this code</div>
                  <div className="mt-1 font-mono text-4xl font-black tracking-[0.4em] text-primary select-all">
                    {pin || "------"}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">Students can type this in the app instead of scanning.</div>
                </div>

                <div className="mt-2 text-xs text-muted-foreground truncate">{token}</div>
              </div>



              <button
                onClick={endSession}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-semibold text-destructive-foreground"
              >
                <StopCircle className="h-4 w-4" /> End session
              </button>
            </>
          ) : (
            <div className="p-8">
              <div className="font-display text-2xl font-bold">Session ended</div>
              <p className="mt-2 text-sm text-muted-foreground">Export attendance below.</p>
            </div>
          )}
        </div>

        {/* Attendance panel */}
        <div className="rounded-3xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h3 className="font-display font-bold">Present ({attendanceQ.data?.length ?? 0})</h3>
            </div>
            <div className="flex gap-2">
              <button onClick={exportExcel} className="rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-accent"><Download className="mr-1 inline h-3 w-3" />Excel</button>
              <button onClick={exportPDF} className="rounded-full border px-3 py-1.5 text-xs font-semibold hover:bg-accent"><Download className="mr-1 inline h-3 w-3" />PDF</button>
            </div>
          </div>
          <div className="max-h-[440px] space-y-2 overflow-y-auto">
            {(attendanceQ.data ?? []).length ? (attendanceQ.data ?? []).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl border p-3">
                <div>
                  <div className="text-sm font-semibold">{a.profiles?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">{a.profiles?.matric_number ?? "—"}</div>
                </div>
                <div className="text-[10px] text-muted-foreground">{new Date(a.marked_at).toLocaleTimeString()}</div>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Waiting for the first scan…
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
