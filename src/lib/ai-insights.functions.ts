import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Row = { session_id: string; marked_at: string | null; started_at: string; course_id: string };

/**
 * Attendance prediction & risk classification for the CURRENT user (student).
 * Uses simple math (deterministic) + optional AI narrative via Lovable AI.
 */
export const getStudentInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // All sessions of courses the student is enrolled in
    const { data: enrolls } = await supabase
      .from("enrollments")
      .select("course_id, courses(code, title)")
      .eq("student_id", userId);

    const courseIds = (enrolls ?? []).map((e: any) => e.course_id);
    if (courseIds.length === 0) return { perCourse: [], overall: null, narrative: null };

    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, course_id, started_at")
      .in("course_id", courseIds)
      .order("started_at", { ascending: true });

    const { data: attended } = await supabase
      .from("attendance")
      .select("session_id, marked_at")
      .eq("student_id", userId);

    const attendedSet = new Set((attended ?? []).map((a: any) => a.session_id));

    const REQUIRED = 75;
    const perCourse = (enrolls ?? []).map((e: any) => {
      const cSessions = (sessions ?? []).filter((s: any) => s.course_id === e.course_id);
      const held = cSessions.length;
      const present = cSessions.filter((s: any) => attendedSet.has(s.id)).length;
      const rate = held ? present / held : 0;
      const TOTAL_EST = Math.max(15, held);
      const predictedPct = Math.round(rate * 100);

      // Trend: compare attendance in first half vs second half of held sessions
      let trend: "improving" | "stable" | "declining" = "stable";
      if (held >= 4) {
        const mid = Math.floor(held / 2);
        const firstHalf = cSessions.slice(0, mid);
        const secondHalf = cSessions.slice(mid);
        const r1 = firstHalf.filter((s: any) => attendedSet.has(s.id)).length / Math.max(1, firstHalf.length);
        const r2 = secondHalf.filter((s: any) => attendedSet.has(s.id)).length / Math.max(1, secondHalf.length);
        if (r2 - r1 > 0.1) trend = "improving";
        else if (r1 - r2 > 0.1) trend = "declining";
      }

      let status: "safe" | "warning" | "critical" = "safe";
      if (predictedPct < 50) status = "critical";
      else if (predictedPct < REQUIRED) status = "warning";
      return {
        courseId: e.course_id,
        code: e.courses?.code,
        title: e.courses?.title,
        held,
        present,
        totalEstimate: TOTAL_EST,
        predictedPct,
        required: REQUIRED,
        status,
        trend,
      };
    });


    const totalHeld = perCourse.reduce((s, c) => s + c.held, 0);
    const totalPresent = perCourse.reduce((s, c) => s + c.present, 0);
    const overallPct = totalHeld ? Math.round((totalPresent / totalHeld) * 100) : 0;
    const overall = {
      pct: overallPct,
      status:
        overallPct >= REQUIRED ? "safe" : overallPct >= 50 ? "warning" : "critical",
      required: REQUIRED,
    } as const;

    // AI narrative (best-effort)
    let narrative: string | null = null;
    const key = process.env.LOVABLE_API_KEY;
    if (key && totalHeld > 0) {
      try {
        const summary = perCourse
          .map((c) => `${c.code}: ${c.present}/${c.held} (${c.predictedPct}%)`)
          .join(", ");
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { "content-type": "application/json", "Lovable-API-Key": key },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content:
                  "You are an academic advisor at ATBU Faculty of Computing. Write ONE short paragraph (max 45 words) giving actionable, encouraging advice on the student's attendance. Mention specific course codes only if risky. Do not use markdown.",
              },
              {
                role: "user",
                content: `Required: 75%. Overall: ${overallPct}%. Per course: ${summary}.`,
              },
            ],
          }),
        });
        if (r.ok) {
          const j = (await r.json()) as any;
          narrative = j?.choices?.[0]?.message?.content?.trim() ?? null;
        }
      } catch {
        // silent
      }
    }

    return { perCourse, overall, narrative };
  });

/**
 * Risk classification for a lecturer: for each course they own, list enrolled
 * students with their attendance % and Safe / Warning / Critical status.
 */
export const getLecturerRisk = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: courses } = await supabase
      .from("courses")
      .select("id, code, title")
      .eq("lecturer_id", userId);
    if (!courses?.length) return { courses: [] };

    const courseIds = courses.map((c: any) => c.id);

    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, course_id")
      .in("course_id", courseIds);

    const { data: enrolls } = await supabase
      .from("enrollments")
      .select("course_id, student_id")
      .in("course_id", courseIds);

    const studentIds = Array.from(new Set((enrolls ?? []).map((e: any) => e.student_id)));
    const { data: profs } = studentIds.length
      ? await supabase.from("profiles").select("id, full_name, matric_number").in("id", studentIds)
      : { data: [] as any[] };
    const profMap: Record<string, any> = {};
    (profs ?? []).forEach((p: any) => (profMap[p.id] = p));

    const sessionIds = (sessions ?? []).map((s: any) => s.id);
    const { data: att } = sessionIds.length
      ? await supabase
          .from("attendance")
          .select("session_id, student_id, device_hash, marked_at")
          .in("session_id", sessionIds)
      : { data: [] as any[] };

    const heldByCourse: Record<string, number> = {};
    (sessions ?? []).forEach((s: any) => {
      heldByCourse[s.course_id] = (heldByCourse[s.course_id] ?? 0) + 1;
    });
    const sessionCourse: Record<string, string> = {};
    (sessions ?? []).forEach((s: any) => (sessionCourse[s.id] = s.course_id));

    // present[courseId][studentId] = count
    const present: Record<string, Record<string, number>> = {};
    (att ?? []).forEach((a: any) => {
      const cid = sessionCourse[a.session_id];
      if (!cid) return;
      present[cid] ??= {};
      present[cid][a.student_id] = (present[cid][a.student_id] ?? 0) + 1;
    });

    // Proxy detection: same device_hash used by >1 different students, or a
    // single student marked from >2 distinct devices (suggests shared login).
    const deviceToStudents: Record<string, Set<string>> = {};
    const studentDevices: Record<string, Set<string>> = {};
    (att ?? []).forEach((a: any) => {
      if (!a.device_hash) return;
      (deviceToStudents[a.device_hash] ??= new Set()).add(a.student_id);
      (studentDevices[a.student_id] ??= new Set()).add(a.device_hash);
    });
    const proxyStudents = new Map<string, { score: number; reason: string }>();
    Object.entries(deviceToStudents).forEach(([, students]) => {
      if (students.size > 1) {
        students.forEach((sid) => {
          const prev = proxyStudents.get(sid);
          const score = Math.min(100, 60 + students.size * 15);
          if (!prev || score > prev.score) {
            proxyStudents.set(sid, { score, reason: `Same device used by ${students.size} students` });
          }
        });
      }
    });
    Object.entries(studentDevices).forEach(([sid, devs]) => {
      if (devs.size >= 3) {
        const prev = proxyStudents.get(sid);
        const score = Math.min(100, 40 + devs.size * 10);
        if (!prev || score > prev.score) {
          proxyStudents.set(sid, { score, reason: `Signed in from ${devs.size} different devices` });
        }
      }
    });

    const REQUIRED = 75;
    const out = courses.map((c: any) => {
      const held = heldByCourse[c.id] ?? 0;
      const students = (enrolls ?? [])
        .filter((e: any) => e.course_id === c.id)
        .map((e: any) => {
          const p = present[c.id]?.[e.student_id] ?? 0;
          const pct = held ? Math.round((p / held) * 100) : 0;
          let status: "safe" | "warning" | "critical" = "safe";
          if (held === 0) status = "safe";
          else if (pct < 50) status = "critical";
          else if (pct < REQUIRED) status = "warning";
          const proxy = proxyStudents.get(e.student_id) ?? null;
          return {
            studentId: e.student_id,
            name: profMap[e.student_id]?.full_name ?? "Student",
            matric: profMap[e.student_id]?.matric_number ?? "",
            present: p,
            held,
            pct,
            status,
            proxyScore: proxy?.score ?? 0,
            proxyReason: proxy?.reason ?? null,
          };
        })
        .sort((a: any, b: any) => a.pct - b.pct);

      // Course-level analytics
      const pcts = students.map((s: any) => s.pct);
      const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
      const highest = pcts.length ? Math.max(...pcts) : 0;
      const lowest = pcts.length ? Math.min(...pcts) : 0;
      const belowThreshold = students.filter((s: any) => s.pct < REQUIRED).length;

      return {
        id: c.id,
        code: c.code,
        title: c.title,
        held,
        students,
        analytics: {
          totalStudents: students.length,
          avg,
          highest,
          lowest,
          belowThreshold,
        },
      };
    });

    // Top performers across all courses (ranking)
    const allStudents = out.flatMap((c: any) => c.students.map((s: any) => ({ ...s, code: c.code })));
    const topPerformers = [...allStudents]
      .filter((s: any) => s.held > 0)
      .sort((a: any, b: any) => b.pct - a.pct)
      .slice(0, 5);
    const proxyAlerts = allStudents
      .filter((s: any) => s.proxyScore >= 60)
      .sort((a: any, b: any) => b.proxyScore - a.proxyScore)
      .slice(0, 8);

    return { courses: out, topPerformers, proxyAlerts };
  });

