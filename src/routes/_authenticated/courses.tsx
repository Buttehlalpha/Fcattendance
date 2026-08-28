import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { BookOpen, Check, Plus, Trash2, Pencil, X, Search } from "lucide-react";
import { useMemo, useState } from "react";


export const Route = createFileRoute("/_authenticated/courses")({
  component: CoursesPage,
});

function CoursesPage() {
  const { user } = useSession();
  const { role } = useProfile();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");


  const coursesQ = useQuery({
    queryKey: ["courses", role, user?.id],
    enabled: !!user && !!role,
    queryFn: async () => {
      // Lecturers only see their own; students & admins see all
      let query = supabase
        .from("courses")
        .select("id, code, title, department, level, lecturer_id")
        .order("code");
      if (role === "lecturer") query = query.eq("lecturer_id", user!.id);
      const { data, error } = await query;
      if (error) {
        toast.error(error.message);
        return [];
      }
      const ids = Array.from(new Set((data ?? []).map((c: any) => c.lecturer_id).filter(Boolean)));
      const { data: lecturers } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as any[] };
      const nameById: Record<string, string> = {};
      (lecturers ?? []).forEach((p: any) => (nameById[p.id] = p.full_name));
      return (data ?? []).map((c: any) => ({
        ...c,
        profiles: c.lecturer_id ? { full_name: nameById[c.lecturer_id] ?? null } : null,
      }));
    },
  });
  const enrollsQ = useQuery({
    queryKey: ["my-enrollments", user?.id],
    enabled: !!user && role === "student",
    queryFn: async () => {
      const { data } = await supabase.from("enrollments").select("course_id").eq("student_id", user!.id);
      return new Set((data ?? []).map((e) => e.course_id));
    },
  });

  async function toggleEnroll(courseId: string, enrolled: boolean) {
    if (enrolled) {
      await supabase.from("enrollments").delete().eq("student_id", user!.id).eq("course_id", courseId);
    } else {
      const { error } = await supabase.from("enrollments").insert({ student_id: user!.id, course_id: courseId });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["my-enrollments"] });
    toast.success(enrolled ? "Unenrolled" : "Enrolled");
  }

  async function saveCourse(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      code: String(fd.get("code")).toUpperCase().trim(),
      title: String(fd.get("title")).trim(),
      department: String(fd.get("department")).trim(),
      level: String(fd.get("level")).trim(),
      lecturer_id: user!.id,
    };
    const { error } = editing
      ? await supabase.from("courses").update(payload).eq("id", editing.id)
      : await supabase.from("courses").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Course updated" : "Course created");
    setShowForm(false);
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["courses"] });
  }

  async function deleteCourse(id: string) {
    if (!confirm("Delete this course? Sessions and enrollments will be affected.")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Course deleted");
    qc.invalidateQueries({ queryKey: ["courses"] });
  }

  const isLecturer = role === "lecturer";

  return (
    <AppShell>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">
            {isLecturer ? "My courses" : "Courses"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {role === "student"
              ? "Browse every course in the faculty and enrol in the ones you are taking."
              : isLecturer
              ? "Create and manage the courses you teach. Students can enrol from their dashboard."
              : "All faculty courses."}
          </p>
        </div>
        {isLecturer && (
          <button
            onClick={() => { setEditing(null); setShowForm((v) => !v); }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elev hover:opacity-90"
          >
            {showForm ? <><X className="h-4 w-4" /> Cancel</> : <><Plus className="h-4 w-4" /> Add course</>}
          </button>
        )}
      </header>

      {isLecturer && showForm && (
        <form onSubmit={saveCourse} className="mb-6 rounded-3xl border bg-card-gradient p-5 shadow-elev">
          <div className="mb-3 font-display text-lg font-bold text-primary">
            {editing ? "Edit course" : "New course"}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field name="code" label="Course code" placeholder="CSC401" defaultValue={editing?.code} required />
            <Field name="level" label="Level" placeholder="400" defaultValue={editing?.level} required />
            <div className="sm:col-span-2">
              <Field name="title" label="Title" placeholder="Advanced Databases" defaultValue={editing?.title} required />
            </div>
            <div className="sm:col-span-2">
              <Field name="department" label="Department" defaultValue={editing?.department ?? "Computer Science"} required />
            </div>
          </div>
          <button className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-hero py-2.5 text-sm font-semibold text-white hover:opacity-90 sm:w-auto sm:px-6">
            {editing ? "Save changes" : "Create course"}
          </button>
        </form>
      )}

      {/* Search bar */}
      <div className="mb-5 relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by course code or title…"
          className="w-full rounded-full border bg-card py-3 pl-11 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {(() => {
        const q = search.trim().toLowerCase();
        const filtered = (coursesQ.data ?? []).filter((c: any) =>
          !q ||
          c.code?.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q)
        );
        if (!coursesQ.data?.length) {
          return (
            <div className="rounded-3xl border border-dashed bg-card p-10 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                {isLecturer ? "You haven't added any courses yet." : "No courses available."}
              </p>
            </div>
          );
        }
        if (!filtered.length) {
          return (
            <div className="rounded-3xl border border-dashed bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">No courses match "{search}".</p>
            </div>
          );
        }
        return (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c: any) => {
            const enrolled = enrollsQ.data?.has(c.id) ?? false;
            const isMine = isLecturer && c.lecturer_id === user?.id;

            return (
              <div key={c.id} className="rounded-3xl border bg-card-gradient p-5 transition hover:shadow-elev">
                <div className="mb-3 flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-hero text-gold">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <span className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] font-bold text-secondary">L{c.level}</span>
                </div>
                <div className="text-xs font-bold text-secondary">{c.code}</div>
                <div className="font-display font-bold">{c.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{c.department}</div>
                {c.profiles?.full_name && !isMine && (
                  <div className="mt-1 text-[11px] text-muted-foreground">Lecturer: {c.profiles.full_name}</div>
                )}

                {role === "student" && (
                  <button
                    onClick={() => toggleEnroll(c.id, enrolled)}
                    className={`mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-2 text-xs font-semibold transition ${enrolled ? "bg-success/10 text-success" : "bg-primary text-primary-foreground hover:opacity-90"}`}
                  >
                    {enrolled ? <><Check className="h-3 w-3" /> Enrolled</> : <><Plus className="h-3 w-3" /> Enrol</>}
                  </button>
                )}
                {isMine && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => { setEditing(c); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-primary/30 py-1.5 text-[11px] font-semibold text-primary hover:bg-primary/5"
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => deleteCourse(c.id)}
                      className="inline-flex items-center justify-center rounded-full border border-destructive/30 px-3 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        );
      })()}
    </AppShell>

  );
}

function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input {...props} className="w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}
