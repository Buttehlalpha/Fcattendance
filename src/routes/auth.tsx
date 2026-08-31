import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { z } from "zod";

// Import images from src/assets
import hero1 from "../assests/Hero1.png";
import logo from "../assests/logo.png";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .email({ message: "Enter a valid email" })
    .max(255),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" })
    .max(72),
});

const signUpSchema = signInSchema.extend({
  full_name: z
    .string()
    .trim()
    .min(2, { message: "Enter your full name" })
    .max(120),
  matric_number: z
    .string()
    .trim()
    .max(30)
    .optional(),
  role: z.enum(["student", "lecturer"]),
  level: z
    .string()
    .max(10)
    .optional(),
});

const Field = memo(function Field({
  label,
  ...props
}: {
  label: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-muted-foreground">
        {label}
      </label>
      <input
        {...props}
        className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none ring-ring/40 focus:ring-2"
      />
    </div>
  );
});

const ModeToggle = memo(
  ({
    mode,
    setMode,
  }: {
    mode: "signin" | "signup";
    setMode: (m: "signin" | "signup") => void;
  }) => (
    <div className="mb-6 flex rounded-full border p-1 text-sm">
      {(["signin", "signup"] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className={`flex-1 rounded-full py-2 font-semibold transition ${
            mode === m
              ? "bg-primary text-primary-foreground shadow-elev"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {m === "signin" ? "Sign in" : "Create account"}
        </button>
      ))}
    </div>
  )
);

function AuthPage() {
  console.log("AuthPage rendering...");

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signupRole, setSignupRole] = useState<"student" | "lecturer">("student");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      console.log("📝 Form submitted, mode:", mode);
      const fd = new FormData(e.currentTarget);
      setLoading(true);
      try {
        if (mode === "signin") {
          console.log("🔐 Signing in...");
          const p = signInSchema.parse({
            email: fd.get("email"),
            password: fd.get("password"),
          });
          const { error } = await supabase.auth.signInWithPassword(p);
          if (error) throw error;
          toast.success("Welcome back!");
          navigate({
            to: "/dashboard",
            replace: true,
          });
        } else {
          console.log("📝 Signing up...");
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
          navigate({
            to: "/dashboard",
            replace: true,
          });
        }
      } catch (err: any) {
        console.error("❌ Submit error:", err);
        toast.error(
          err?.errors?.[0]?.message ?? err?.message ?? "Something went wrong"
        );
      } finally {
        setLoading(false);
      }
    },
    [mode, navigate]
  );

  const handleRoleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSignupRole(e.target.value as "student" | "lecturer");
    },
    []
  );

  const handleModeChange = useCallback((m: "signin" | "signup") => {
    setMode(m);
  }, []);

  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      {/* LEFT PANEL – only the hero image */}
      <div
        className="relative hidden overflow-hidden md:flex md:items-center md:justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${hero1})` }}
      />

      {/* RIGHT FORM – with centered logo at the top */}
      <div className="flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md">
          {/* LOGO – centered, with FOCATTEN text */}
          <div className="flex flex-col items-center mb-6">
            <Link
              to="/"
              className="flex flex-col items-center gap-1"
            >
              <img
                src={logo}
                alt="FOCATTEN"
                className="h-12 w-auto object-contain"
              />
              <span className="font-display font-bold text-primary text-lg">
                FOCATTEN
              </span>
            </Link>
          </div>

          <ModeToggle mode={mode} setMode={handleModeChange} />

          <h1 className="font-display text-3xl font-bold">
            {mode === "signin" ? "Welcome back" : "Join the faculty"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in with your ATBU email."
              : "Register as a student or lecturer."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            {mode === "signup" && (
              <>
                <Field
                  name="full_name"
                  label="Full name"
                  placeholder="Ahmad Musa"
                  autoComplete="name"
                />
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    I am a
                  </label>
                  <select
                    name="role"
                    value={signupRole}
                    onChange={handleRoleChange}
                    required
                    className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm"
                  >
                    <option value="student">Student</option>
                    <option value="lecturer">Lecturer</option>
                  </select>
                </div>
                {signupRole === "student" && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      name="matric_number"
                      label="Matric no."
                      placeholder="18/45CSC/123"
                      autoComplete="off"
                    />
                    <Field
                      name="level"
                      label="Level"
                      placeholder="400"
                      autoComplete="off"
                    />
                  </div>
                )}
              </>
            )}

            <Field
              name="email"
              type="email"
              label="Email"
              placeholder="you@atbu.edu.ng"
              required
              autoComplete="email"
              inputMode="email"
            />

            <Field
              name="password"
              type="password"
              label="Password"
              placeholder="At least 6 characters"
              required
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
            />

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