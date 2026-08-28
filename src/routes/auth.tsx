import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QrCode, Loader2 } from "lucide-react";
import { z } from "zod";
import { useSession } from "@/hooks/useSession";
import { useEffect } from "react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email" }).max(255),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }).max(72),
});
const signUpSchema = signInSchema.extend({
  full_name: z.string().trim().min(2, { message: "Enter your full name" }).max(120),
  matric_number: z.string().trim().max(30).optional(),
  role: z.enum(["student", "lecturer"]),
  level: z.string().max(10).optional(),
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signupRole, setSignupRole] = useState<"student" | "lecturer">("student");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { session } = useSession();

  useEffect(() => {
    if (session) navigate({ to: "/dashboard", replace: true });
  }, [session, navigate]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setLoading(true);
    try {
      if (mode === "signin") {
        const p = signInSchema.parse({ email: fd.get("email"), password: fd.get("password") });
        const { error } = await supabase.auth.signInWithPassword(p);
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard", replace: true });
      } else {
        const p = signUpSchema.parse({
          email: fd.get("email"),
          password: fd.get("password"),
          full_name: fd.get("full_name"),
          matric_number: fd.get("matric_number") || undefined,
          role: fd.get("role"),
          level: fd.get("level") || undefined,
        });
        const { error } = await supabase.auth.signUp({
          email: p.email,
          password: p.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: p.full_name,
              matric_number: p.matric_number,
              role: p.role,
              level: p.level,
              department: "Computer Science",
            },
          },
        });
        if (error) throw error;
        toast.success("Account created — you're signed in.");
        navigate({ to: "/dashboard", replace: true });
      }
    } catch (err: any) {
      toast.error(err?.errors?.[0]?.message ?? err?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Left brand panel */}
      <div className="relative hidden overflow-hidden bg-hero p-10 text-white md:flex md:flex-col md:justify-between">
        <Link to="/" className="inline-flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 backdrop-blur">
            <QrCode className="h-5 w-5 text-gold" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-bold">ATBU Attendance</div>
            <div className="text-[10px] uppercase tracking-widest text-white/70">Faculty of Computing</div>
          </div>
        </Link>
        <div>
          <h2 className="font-display text-4xl font-extrabold leading-tight">
            Sign roll,<br />not paper.
          </h2>
          <p className="mt-3 max-w-sm text-white/70">
            Rotating QR codes + GPS proximity keep every attendance record honest.
          </p>
        </div>
        <div className="text-xs text-white/60">Abubakar Tafawa Balewa University · Bauchi</div>
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-gold/20 blur-3xl" />
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          <div className="mb-8 md:hidden">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-hero">
                <QrCode className="h-5 w-5 text-gold" />
              </div>
              <div className="font-display font-bold text-primary">ATBU Attendance</div>
            </Link>
          </div>

          <div className="mb-6 flex rounded-full border p-1 text-sm">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full py-2 font-semibold transition ${mode === m ? "bg-primary text-primary-foreground shadow-elev" : "text-muted-foreground hover:text-foreground"}`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <h1 className="font-display text-3xl font-bold">
            {mode === "signin" ? "Welcome back" : "Join the faculty"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in with your ATBU email." : "Register as a student or lecturer."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <>
                <Field name="full_name" label="Full name" placeholder="Ahmad Musa" />
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">I am a</label>
                  <select
                    name="role"
                    value={signupRole}
                    onChange={(e) => setSignupRole(e.target.value as "student" | "lecturer")}
                    required
                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
                  >
                    <option value="student">Student</option>
                    <option value="lecturer">Lecturer</option>
                  </select>
                </div>
                {signupRole === "student" && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field name="matric_number" label="Matric no." placeholder="18/45CSC/123" />
                    <Field name="level" label="Level" placeholder="400" />
                  </div>
                )}
              </>
            )}
            <Field name="email" type="email" label="Email" placeholder="you@atbu.edu.ng" required />
            <Field name="password" type="password" label="Password" placeholder="At least 6 characters" required />

            <button
              type="submit"
              disabled={loading}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-elev hover:opacity-95 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</label>
      <input
        {...props}
        className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none ring-ring/40 focus:ring-2"
      />
    </div>
  );
}
