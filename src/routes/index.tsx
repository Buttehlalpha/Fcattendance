import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ShieldCheck,
  MapPin,
  Zap,
  BarChart3,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
} from "lucide-react";

// Import images from src/assets
import hero1 from "../assests/Hero1.png";
import hero2 from "../assests/Hero2.png";
import hero3 from "../assests/Hero3.png";
import hero4 from "../assests/Hero4.png";
import hero5 from "../assests/Hero5.png";
import logo from "../assests/logo.png";

export const Route = createFileRoute("/")({
  component: Landing,
});

// ---------- Carousel using imported images ----------
const slides = [hero1, hero2, hero3, hero4, hero5];

function ImageCarousel() {
  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prev = () => setCurrent((prev) => (prev - 1 + slides.length) % slides.length);

  useEffect(() => {
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-full h-full">
      {slides.map((src, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
            i === current ? "opacity-100" : "opacity-0"
          }`}
        >
          <img
            src={src}
            alt={`Slide ${i + 1}`}
            className="h-full w-full bg-black object-contain sm:object-cover"
          />
        </div>
      ))}

      {/* Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 w-2 rounded-full transition-all ${
              i === current ? "w-6 bg-white" : "bg-white/50"
            }`}
          />
        ))}
      </div>

      {/* Arrows */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 transition z-10"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 transition z-10"
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </div>
  );
}

// ---------- Main Landing ----------
function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      {/* Nav – using imported logo */}
     <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-lg">
  <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
    <Link to="/" className="flex items-center gap-2">
      <img src={logo} alt="FOCATTEN" className="h-9 w-9 object-contain" />
      <span className="font-display text-sm font-bold text-foreground">FOCATTEN</span>
    </Link>
    <Link
      to="/auth"
      className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
    >
      Sign in
    </Link>
  </div>
</header>

      {/* HERO – full‑screen background carousel, text centered, no badge */}
      <section className="relative min-h-dvh flex items-center justify-center overflow-hidden">
        {/* Carousel as background */}
        <div className="absolute inset-0">
          <ImageCarousel />
          <div className="absolute inset-0 bg-black/50" />
        </div>

        {/* Centered text content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <div className="animate-fade-in-up">
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl md:text-6xl text-white">
              <br />
              <span className="text-gold"></span>
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-lg text-white/80">
             
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link
                to="/auth"
                className="rounded-full bg-gold-gradient px-6 py-3 text-sm font-bold text-gold-foreground shadow-gold hover:opacity-95 transition"
              >
                Get started
              </Link>
              <a
                href="#features"
                className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                How it works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20 bg-background">
        <h2 className="mx-auto max-w-2xl text-center font-display text-3xl font-bold sm:text-4xl">
          Five walls that stop proxy attendance
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Each check runs before an attendance record can be created. Fail any
          one — no record.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              i: Zap,
              t: "30-second QR rotation",
              d: "Codes expire every 30 seconds so a screenshot is useless outside the room.",
            },
            {
              i: MapPin,
              t: "50 m GPS radius",
              d: "Student's device must be within the lecture-hall radius the lecturer set.",
            },
            {
              i: ShieldCheck,
              t: "One scan per session",
              d: "The database enforces a unique record per student per session.",
            },
            {
              i: BarChart3,
              t: "Live analytics & reports",
              d: "Lecturers export PDF/Excel; students see their eligibility percentage.",
            },
            {
              i: GraduationCap,
              t: "Session must be live",
              d: "Ended and expired sessions reject scans immediately.",
            },
          ].map(({ i: Icon, t, d }) => (
            <div
              key={t}
              className="group rounded-3xl border bg-card-gradient p-6 transition hover:shadow-elev"
            >
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
      <section className="mx-auto max-w-6xl px-4 pb-24 bg-background">
        <div className="relative overflow-hidden rounded-3xl bg-hero p-10 text-white sm:p-16">
          <div className="relative z-10 max-w-xl mx-auto text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to run your first paperless session?
            </h2>
            <p className="mt-3 text-white/80">
              Sign in with your ATBU email, pick a course, generate a code  and
              watch attendance stream in live.
            </p>
            <Link
              to="/auth"
              className="mt-6 inline-flex rounded-full bg-gold-gradient px-6 py-3 text-sm font-bold text-gold-foreground shadow-gold hover:opacity-95 transition"
            >
              Sign in to your account
            </Link>
          </div>
          <div className="absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
        </div>
      </section>

      {/* Footer – using imported logo */}
      <footer className="bg-black text-white/80">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <img src={logo} alt="FCAttend" className="h-8 w-8 object-contain" />
                <span className="font-display text-lg font-bold">FCAttend</span>
              </div>
              <p className="mt-3 text-sm text-white/60 max-w-xs">
                Smart attendance for the Faculty of Computing, ATBU. Rotating QR
                codes, GPS verification, and real-time analytics.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white">Quick Links</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><Link to="/" className="hover:text-gold transition">Home</Link></li>
                <li><a href="#features" className="hover:text-gold transition">Features</a></li>
                <li><Link to="/auth" className="hover:text-gold transition">Sign in</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white">Legal</h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="#" className="hover:text-gold transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-gold transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-gold transition">Cookie Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white">Connect</h3>
              <div className="mt-3 flex gap-3">
                <a href="#" className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-gold/20 hover:text-gold" aria-label="Facebook"><Facebook className="h-5 w-5" /></a>
                <a href="#" className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-gold/20 hover:text-gold" aria-label="Twitter"><Twitter className="h-5 w-5" /></a>
                <a href="#" className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-gold/20 hover:text-gold" aria-label="Instagram"><Instagram className="h-5 w-5" /></a>
                <a href="#" className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-gold/20 hover:text-gold" aria-label="LinkedIn"><Linkedin className="h-5 w-5" /></a>
                <a href="#" className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-gold/20 hover:text-gold" aria-label="YouTube"><Youtube className="h-5 w-5" /></a>
              </div>
            </div>
          </div>
          <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-white/40">
            &copy; {new Date().getFullYear()} Faculty of Computing, Abubakar Tafawa Balewa University. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}