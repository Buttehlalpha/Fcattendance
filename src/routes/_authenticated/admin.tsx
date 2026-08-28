import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { useState } from "react";
import { Shield, Plus, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const { role } = useProfile();
  if (role !== "admin") {
    return (
      <AppShell>
        <div className="rounded-3xl border bg-card p-12 text-center">
          <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-xl font-bold">Admins only</h1>
          <p className="mt-1 text-sm text-muted-foreground">You don't have permission to view this page.</p>
        </div>
      </AppShell>
    );
  }
  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-primary">Administration</h1>
        <p className="text-sm text-muted-foreground">Manage courses, assign lecturers, view reports.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <CourseManager />
        <LecturerAssign />
      </div>
    </AppShell>
  );
}

function CourseManager() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const { data } = await supabase.from("courses").select("id, code, title, department, level, lecturer_id, profiles:lecturer_id(full_name)").order("code");
      return data ?? [];
    },
  });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const { error } = await supabase.from("courses").insert({
      code: String(fd.get("code")).toUpperCase(),
      title: String(fd.get("title")),
      department: String(fd.get("department")),
      level: String(fd.get("level")),
    });
    if (error) return toast.error(error.message);
    toast.success("Course added");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
    qc.invalidateQueries({ queryKey: ["courses"] });
  }

  return (
    <section className="rounded-3xl border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Courses</h2>
        <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          <Plus className="h-3 w-3" /> New
        </button>
      </div>
      {open && (
        <form onSubmit={onSubmit} className="mb-4 space-y-2 rounded-2xl border bg-muted/40 p-3">
          <div className="grid grid-cols-2 gap-2">
            <input name="code" required placeholder="CSC401" className="rounded-lg border bg-background px-2 py-1.5 text-sm" />
            <input name="level" required placeholder="400" className="rounded-lg border bg-background px-2 py-1.5 text-sm" />
          </div>
          <input name="title" required placeholder="Course title" className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm" />
          <input name="department" required placeholder="Department" defaultValue="Computer Science" className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm" />
          <button className="w-full rounded-full bg-primary py-2 text-xs font-semibold text-primary-foreground">Create</button>
        </form>
      )}
      <div className="space-y-2">
        {q.data?.map((c: any) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border p-3">
            <div>
              <div className="text-xs font-bold text-secondary">{c.code} · L{c.level}</div>
              <div className="text-sm font-semibold">{c.title}</div>
              <div className="text-xs text-muted-foreground">{c.profiles?.full_name ? `Lecturer: ${c.profiles.full_name}` : "Unassigned"}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function LecturerAssign() {
  const qc = useQueryClient();
  const lecturersQ = useQuery({
    queryKey: ["lecturer-list"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "lecturer");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      return profiles ?? [];
    },
  });
  const coursesQ = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => (await supabase.from("courses").select("id, code, title, lecturer_id").order("code")).data ?? [],
  });

  async function assign(courseId: string, lecturerId: string | null) {
    const { error } = await supabase.from("courses").update({ lecturer_id: lecturerId }).eq("id", courseId);
    if (error) return toast.error(error.message);
    toast.success("Updated");
    qc.invalidateQueries({ queryKey: ["admin-courses"] });
  }

  return (
    <section className="rounded-3xl border bg-card p-5">
      <h2 className="mb-4 font-display text-lg font-bold">Assign lecturers</h2>
      {!lecturersQ.data?.length ? (
        <div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          <User className="mx-auto mb-2 h-6 w-6" />
          No lecturers registered yet. Ask them to sign up as "Lecturer".
        </div>
      ) : (
        <div className="space-y-2">
          {coursesQ.data?.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border p-3">
              <div className="min-w-0">
                <div className="text-xs font-bold text-secondary">{c.code}</div>
                <div className="truncate text-sm font-semibold">{c.title}</div>
              </div>
              <select
                defaultValue={c.lecturer_id ?? ""}
                onChange={(e) => assign(c.id, e.target.value || null)}
                className="rounded-lg border bg-background px-2 py-1.5 text-xs"
              >
                <option value="">Unassigned</option>
                {lecturersQ.data?.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.full_name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
