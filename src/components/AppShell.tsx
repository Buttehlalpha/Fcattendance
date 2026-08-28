import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { QrCode, LayoutDashboard, ScanLine, BookOpen, History, Shield, LogOut, Menu, X, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useState, type ReactNode } from "react";
import { useProfile, type Role } from "@/hooks/useProfile";
import { useQueryClient } from "@tanstack/react-query";

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, role } = useProfile();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const nav = buildNav(role);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const NavLinks = (
    <nav className="space-y-1">
      {nav.map((n) => {
        const active = loc.pathname === n.to || (n.to !== "/dashboard" && loc.pathname.startsWith(n.to));
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={() => setOpen(false)}
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
    <div className="min-h-screen bg-muted/30">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-hero">
            <QrCode className="h-4 w-4 text-gold" />
          </div>
          <span className="font-display font-bold text-primary">ATBU</span>
        </Link>
        <button onClick={() => setOpen(true)} aria-label="Menu" className="rounded-lg border p-2">
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-background p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <span className="font-display font-bold">Menu</span>
              <button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            {NavLinks}
            <button onClick={signOut} className="mt-4 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl gap-6 p-4 md:grid-cols-[260px_minmax(0,1fr)] md:p-6">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] flex-col rounded-3xl border bg-card p-4 md:flex">
          <Link to="/dashboard" className="mb-6 flex items-center gap-3 px-2">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-hero shadow-elev">
              <QrCode className="h-5 w-5 text-gold" />
            </div>
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
