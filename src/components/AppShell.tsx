import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { QrCode, LayoutDashboard, ScanLine, BookOpen, History, Shield, LogOut, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { ReactNode } from "react";
import { useProfile, type Role } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";

// Import the logo from assets
import logo from "@/assests/logo.png"; // or logo.svg, adjust path as needed

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, role } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const loc = useLocation();

  const nav = buildNav(role);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isActive = (to: string) => loc.pathname === to || (to !== "/dashboard" && loc.pathname.startsWith(to));

  const NavLinks = (
    <nav className="space-y-1">
      {nav.map((n) => {
        const active = isActive(n.to);
        return (
          <Link
            key={n.to}
            to={n.to}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-primary text-primary-foreground shadow-elev" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
          >
            <n.icon className="h-4 w-4 shrink-0" />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-muted/30">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={logo} alt="Logo" className="h-8 w-auto object-contain" />
          <span className="font-display font-bold text-primary">ATBU</span>
        </Link>
        <button onClick={signOut} aria-label="Sign out" className="rounded-lg border p-2 text-muted-foreground">
          <LogOut className="h-4 w-4" />
        </button>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 p-4 pb-24 md:grid-cols-[260px_minmax(0,1fr)] md:p-6 md:pb-6">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] flex-col rounded-3xl border bg-card p-4 md:flex">
          <Link to="/dashboard" className="mb-6 flex items-center gap-3 px-2">
            <img src={logo} alt="Logo" className="h-10 w-auto object-contain" />
            <div className="leading-tight">
              <div className="font-display text-sm font-bold text-primary">ATBU Attendance</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Faculty of Computing</div>
            </div>
          </Link>

          <div className="mb-4 rounded-2xl border bg-card-gradient p-3">
            <div className="text-xs text-muted-foreground">Signed in as</div>
            <div className="truncate font-semibold">{profile?.full_name ?? "…"}</div>
            <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold-gradient px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-foreground">
              {role ?? "…"}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">{NavLinks}</div>

          <button onClick={signOut} className="mt-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </aside>

        <main className="min-w-0">{children}</main>
      </div>

      {/* Bottom tab bar (mobile) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-2 backdrop-blur md:hidden"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-7xl items-stretch justify-around">
          {nav.map((n) => {
            const active = isActive(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`flex flex-1 flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <n.icon className={`h-5 w-5 ${active ? "text-primary" : ""}`} />
                <span className="truncate">{n.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function buildNav(role?: Role) {
  const base = [{ to: "/dashboard", label: "Dashboard", icon: LayoutDashboard }];
  if (role === "student") {
    return [
      ...base,
      { to: "/scan", label: "Scan QR", icon: ScanLine },
      { to: "/courses", label: "Courses", icon: BookOpen },
      { to: "/history", label: "My history", icon: History },
    ];
  }
  if (role === "lecturer") {
    return [
      ...base,
      { to: "/courses", label: "My courses", icon: BookOpen },
      { to: "/sessions", label: "Sessions", icon: PlayCircle },
      { to: "/history", label: "History", icon: History },
    ];
  }
  if (role === "admin") {
    return [
      ...base,
      { to: "/courses", label: "Courses", icon: BookOpen },
      { to: "/admin", label: "Administration", icon: Shield },
    ];
  }
  return base;
}