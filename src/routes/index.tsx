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
            className="h-full w-full object-cover"
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
        className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 sm:p-2 text-white hover:bg-black/50 transition z-10"
      >
        <ChevronLeft className="h-4 w-4 sm:h-6 sm:w-6" />
      </button>
      <button
        onClick={next}
        className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-1.5 sm:p-2 text-white hover:bg-black/50 transition z-10"
      >
        <ChevronRight className="h-4 w-4 sm:h-6 sm:w-6" />
      </button>
    </div>
  );
}

// ---------- Main Landing ----------
function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav – using imported logo */}
      <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-background/60 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="FOCATTEN" className="h-7 w-7 sm:h-9 sm:w-9 object-contain" />
            <span className="font-display text-xs sm:text-sm font-bold text-foreground">FOCATTEN</span>
          </Link>
          <Link
            to="/auth"
            className="rounded-full bg-primary px-3.5 sm:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-primary-foreground hover:opacity-90 transition"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* HERO – full‑screen background carousel, text centered */}
      <section className="relative h-screen w-full flex items-center justify-center overflow-hidden">
        {/* Carousel as background */}
        <div className="absolute inset-0">
          <ImageCarousel />
          <div className="absolute inset-0 bg-black/60 sm:bg-black/50" />
        </div>

        {/* Centered text content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="animate-fade-in-up">
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] sm:leading-[1.05] text-white">
              <span className="block">Welcome to</span>
              <span className="text-gold block mt-1">FOCATTEN</span>
            </h1>
            <p className="mt-3 sm:mt-4 max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-white/80 px-2">
              Smart attendance system for the Faculty of Computing, ATBU.
              Rotating QR codes, GPS verification, and real-time analytics.
            </p>
            <div className="mt-6 sm:mt-8 flex flex-wrap gap-2 sm:gap-3 justify-center">
              <Link
                to="/auth"
                className="rounded-full bg-gold-gradient px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-gold-foreground shadow-gold hover:opacity-95 transition"
              >
                Get started
              </Link>
              <a
                href="#features"
                className="rounded-full border border-white/30 px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-white hover:bg-white/10 transition"
              >
                How it works
              </a>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="w-5 h-8 sm:w-6 sm:h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1">
            <div className="w-1 h-2 sm:w-1.5 sm:h-3 rounded-full bg-white/60 animate-pulse" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-20 bg-background">
        <h2 className="mx-auto max-w-2xl text-center font-display text-2xl sm:text-3xl md:text-4xl font-bold">
          Five walls that stop proxy attendance
        </h2>
        <p className="mx-auto mt-2 sm:mt-3 max-w-xl text-center text-sm sm:text-base text-muted-foreground px-2">
          Each check runs before an attendance record can be created. Fail any
          one — no record.
        </p>
        <div className="mt-8 sm:mt-12 grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
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
              className="group rounded-2xl sm:rounded-3xl border bg-card-gradient p-5 sm:p-6 transition hover:shadow-elev"
            >
              <div className="mb-3 sm:mb-4 grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-2xl bg-primary text-gold">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <h3 className="font-display text-base sm:text-lg font-bold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-12 sm:pb-24 bg-background">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-hero p-6 sm:p-10 md:p-16 text-white">
          <div className="relative z-10 max-w-xl mx-auto text-center">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold">
              Ready to run your first paperless session?
            </h2>
            <p className="mt-2 sm:mt-3 text-sm sm:text-base text-white/80 px-2">
              Sign in with your ATBU email, pick a course, generate a code and
              watch attendance stream in live.
            </p>
            <Link
              to="/auth"
              className="mt-4 sm:mt-6 inline-flex rounded-full bg-gold-gradient px-5 sm:px-6 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-gold-foreground shadow-gold hover:opacity-95 transition"
            >
              Sign in to your account
            </Link>
          </div>
          <div className="absolute -bottom-16 -right-16 h-48 w-48 sm:h-64 sm:w-64 rounded-full bg-gold/20 blur-3xl" />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white/80">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-1 gap-8 sm:gap-10 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <img src={logo} alt="FCAttend" className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
                <span className="font-display text-base sm:text-lg font-bold">FCAttend</span>
              </div>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm text-white/60 max-w-xs">
                Smart attendance for the Faculty of Computing, ATBU. Rotating QR
                codes, GPS verification, and real-time analytics.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm sm:text-base">Quick Links</h3>
              <ul className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li><Link to="/" className="hover:text-gold transition">Home</Link></li>
                <li><a href="#features" className="hover:text-gold transition">Features</a></li>
                <li><Link to="/auth" className="hover:text-gold transition">Sign in</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm sm:text-base">Legal</h3>
              <ul className="mt-2 sm:mt-3 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <li><a href="#" className="hover:text-gold transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-gold transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-gold transition">Cookie Policy</a></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm sm:text-base">Connect</h3>
              <div className="mt-2 sm:mt-3 flex gap-2 sm:gap-3 flex-wrap">
                <a href="#" className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-gold/20 hover:text-gold" aria-label="Facebook"><Facebook className="h-4 w-4 sm:h-5 sm:w-5" /></a>
                <a href="#" className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-gold/20 hover:text-gold" aria-label="Twitter"><Twitter className="h-4 w-4 sm:h-5 sm:w-5" /></a>
                <a href="#" className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-gold/20 hover:text-gold" aria-label="Instagram"><Instagram className="h-4 w-4 sm:h-5 sm:w-5" /></a>
                <a href="#" className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-gold/20 hover:text-gold" aria-label="LinkedIn"><Linkedin className="h-4 w-4 sm:h-5 sm:w-5" /></a>
                <a href="#" className="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-gold/20 hover:text-gold" aria-label="YouTube"><Youtube className="h-4 w-4 sm:h-5 sm:w-5" /></a>
              </div>
            </div>
          </div>
          <div className="mt-8 sm:mt-12 border-t border-white/10 pt-6 sm:pt-8 text-center text-xs sm:text-sm text-white/40">
            &copy; {new Date().getFullYear()} Faculty of Computing, Abubakar Tafawa Balewa University. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}