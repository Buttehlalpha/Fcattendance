import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode, ShieldCheck, MapPin, Zap, BarChart3, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-hero shadow-elev">
              <QrCode className="h-5 w-5 text-gold" />
            </div>
            <div className="leading-tight">
              <div className="font-display text-sm font-bold">ATBU Attendance</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Faculty of Computing</div>
            </div>
          </Link>
          <Link
            to="/auth"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-hero pt-32 pb-24 text-white">
        <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, oklch(0.82 0.16 85) 0, transparent 40%), radial-gradient(circle at 80% 60%, oklch(0.4 0.13 265) 0, transparent 40%)" }} />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 md:grid-cols-2 md:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-gold animate-pulse" />
              Live at Faculty of Computing, ATBU
            </div>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl md:text-6xl">
              End proxy attendance.<br />
              <span className="text-gold">Take roll in seconds.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">
              A QR-code smart attendance system built for lecturers and students of the Faculty of Computing. Rotating codes, GPS proximity, and one-scan-per-session security — no more paper sheets.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/auth"
                className="rounded-full bg-gold-gradient px-6 py-3 text-sm font-bold text-gold-foreground shadow-gold hover:opacity-95"
              >
                Get started
              </Link>
              <a href="#features" className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10">
                How it works
              </a>
            </div>
          </div>

          {/* QR mock */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="animate-float rounded-3xl bg-white p-6 shadow-elev">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-secondary">Live session</div>
                  <div className="font-display text-lg font-bold text-primary">CSC 401 · Operating Systems</div>
                </div>
                <span className="rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold text-success">ACTIVE</span>
              </div>
              <div className="relative rounded-2xl border-2 border-dashed border-primary/20 p-6">
                <div className="grid grid-cols-10 gap-0.5">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className={`aspect-square rounded-sm ${Math.random() > 0.5 ? "bg-primary" : "bg-transparent"}`} />
                  ))}
                </div>
                <div className="absolute inset-0 animate-pulse-ring rounded-2xl" />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>Refreshes in 00:22</span>
                <span className="font-mono">ATBU-CSC401-A3F9</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <h2 className="mx-auto max-w-2xl text-center font-display text-3xl font-bold sm:text-4xl">
          Five walls that stop proxy attendance
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Each check runs before an attendance record can be created. Fail any one — no record.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            { i: Zap, t: "30-second QR rotation", d: "Codes expire every 30 seconds so a screenshot is useless outside the room." },
            { i: MapPin, t: "50 m GPS radius", d: "Student's device must be within the lecture-hall radius the lecturer set." },
            { i: ShieldCheck, t: "One scan per session", d: "The database enforces a unique record per student per session." },
            { i: QrCode, t: "Device fingerprint", d: "Each mark stores a device hash — same device signing twice gets flagged." },
            { i: GraduationCap, t: "Session must be live", d: "Ended and expired sessions reject scans immediately." },
            { i: BarChart3, t: "Live analytics & reports", d: "Lecturers export PDF/Excel; students see their eligibility percentage." },
          ].map(({ i: Icon, t, d }) => (
            <div key={t} className="group rounded-3xl border bg-card-gradient p-6 transition hover:shadow-elev">
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-primary text-gold">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-bold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-hero p-10 text-white sm:p-16">
          <div className="relative z-10 max-w-xl">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Ready to run your first paperless session?</h2>
            <p className="mt-3 text-white/80">Sign in with your ATBU email, pick a course, generate a code — and watch attendance stream in live.</p>
            <Link to="/auth" className="mt-6 inline-flex rounded-full bg-gold-gradient px-6 py-3 text-sm font-bold text-gold-foreground shadow-gold">
              Sign in to your account
            </Link>
          </div>
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Faculty of Computing · Abubakar Tafawa Balewa University
      </footer>
    </div>
  );
}
