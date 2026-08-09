/**
 * MusicMirror Brand Components
 * ---
 * Canonical logo, wordmark, and themed background elements.
 * Import these wherever the brand needs to appear.
 */
import { useMemo } from "react";


/* ── Logo mark (image) ─────────────────────────────────────── */
interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 28, className = "" }: LogoMarkProps) {
  return (
    <img
      src="/mm-logo.jpg"
      alt="Music Mirror logo"
      className={`mm-logo-mark ${className}`}
      style={{ width: size, height: size, borderRadius: size * 0.25 }}
      width={size}
      height={size}
    />
  );
}

/* ── CD Disc Brand Symbol Component ────────────────────────── */
interface CDDiscProps {
  size?: number;
  spinning?: boolean;
  interactive?: boolean;
  className?: string;
}

export function CDDisc({ size = 180, spinning = true, className = "" }: CDDiscProps) {
  return (
    <div
      className={`mm-cd-disc ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #222 0%, #0D0D0D 50%, #050505 100%)",
        border: "1.5px solid rgba(212,175,55,0.35)",
        boxShadow: "0 0 40px rgba(212,175,55,0.18), 0 20px 60px rgba(0,0,0,0.8)",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        animation: spinning ? "mm-cd-spin 18s linear infinite" : "none",
        flexShrink: 0,
      }}
    >
      {/* Holographic groove rings */}
      <div
        style={{
          position: "absolute",
          inset: "8%",
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "inset 0 0 20px rgba(168,85,247,0.15)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "22%",
          borderRadius: "50%",
          border: "1px solid rgba(212,175,55,0.15)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "36%",
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      />

      {/* Light sheen reflection */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 45%, rgba(212,175,55,0.1) 50%, rgba(168,85,247,0.12) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Royal Gold Ring */}
      <div
        style={{
          width: "32%",
          height: "32%",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #D4AF37 0%, #8C6A19 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 16px rgba(212,175,55,0.4)",
        }}
      >
        {/* Amethyst Center Core */}
        <div
          style={{
            width: "55%",
            height: "55%",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #A855F7 0%, #5B21B6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Spindle hole */}
          <div
            style={{
              width: "45%",
              height: "45%",
              borderRadius: "50%",
              background: "#050505",
              boxShadow: "inset 0 0 4px rgba(0,0,0,0.9)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── SVG Logo mark (inline, scalable) ─────────────────────── */
export function LogoSVG({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Music Mirror icon"
    >
      <defs>
        <linearGradient id="mmg1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0D0D0D" />
      {/* Face profile */}
      <path
        d="M14 26 C14 15 22 10 30 12 C26 13 23 17 23 22 L23 36 C23 40 25 43 28 44 L20 44 C16 42 14 38 14 34 Z"
        fill="url(#mmg1)"
        opacity="0.9"
      />
      <rect x="24" y="44" width="5" height="5" rx="1" fill="url(#mmg1)" opacity="0.7" />
      {/* Audio wave bars */}
      <rect x="33" y="27" width="4" height="10" rx="2" fill="url(#mmg1)" />
      <rect x="39" y="22" width="4" height="20" rx="2" fill="url(#mmg1)" />
      <rect x="45" y="25" width="4" height="14" rx="2" fill="url(#mmg1)" />
      <rect x="51" y="29" width="4" height="6"  rx="2" fill="url(#mmg1)" opacity="0.85" />
      {/* Bridge */}
      <line x1="28" y1="32" x2="33" y2="32" stroke="url(#mmg1)" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

/* ── Wordmark ──────────────────────────────────────────────── */
interface WordmarkProps {
  size?: "sm" | "md" | "lg";
  showBadge?: boolean;
}

export function Wordmark({ size = "md", showBadge = false }: WordmarkProps) {
  const fontSize = { sm: "0.9rem", md: "1.05rem", lg: "1.4rem" }[size];
  const iconSize = { sm: 22, md: 28, lg: 38 }[size];

  return (
    <span className="mm-wordmark" style={{ gap: iconSize * 0.32 }}>
      <LogoSVG size={iconSize} />
      <span className="mm-wordmark-text" style={{ fontSize }}>
        Music Mirror
      </span>
      {showBadge && <span className="mm-wordmark-badge">v2</span>}
    </span>
  );
}

/* ── Themed Background Canvas ──────────────────────────────── */
const NOTES = ["♪", "♫", "♩", "♬", "𝅘𝅥𝅮", "♭", "♯"];

interface ThemeBackgroundProps {
  noteCount?: number;
  waveBarCount?: number;
  showHeroBg?: boolean;
}

export function ThemeBackground({
  noteCount = 14,
  waveBarCount = 40,
  showHeroBg = false,
}: ThemeBackgroundProps) {
  const notes = useMemo(() => {
    return Array.from({ length: noteCount }, (_, i) => ({
      id: i,
      char: NOTES[i % NOTES.length],
      left: `${5 + (i * 6.7) % 90}%`,
      bottom: `${(i * 13) % 70}%`,
      dur: `${10 + (i * 3.1) % 12}s`,
      delay: `${(i * 1.7) % 8}s`,
      fontSize: `${1 + (i * 0.15) % 1.2}rem`,
      opacity: 0.06 + (i * 0.008) % 0.1,
      color: i % 3 === 0 ? "var(--gold)" : i % 3 === 1 ? "var(--purple)" : "var(--sapphire-lt)",
    }));
  }, [noteCount]);

  const waveBars = useMemo(() => {
    return Array.from({ length: waveBarCount }, (_, i) => ({
      id: i,
      left: `${(i / waveBarCount) * 100}%`,
      height: `${40 + (i * 7.3) % 120}px`,
      dur: `${1.8 + (i * 0.23) % 2}s`,
      delay: `${(i * 0.11) % 1.8}s`,
    }));
  }, [waveBarCount]);

  return (
    <div className="mm-bg-canvas" aria-hidden="true">
      {/* Hero BG image (landing page only) */}
      {showHeroBg && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url(/mm-hero-bg.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center 40%",
            opacity: 0.06,
            filter: "blur(2px) saturate(1.2)",
          }}
        />
      )}

      {/* Floating music notes */}
      {notes.map((n) => (
        <span
          key={n.id}
          className="mm-note"
          style={{
            left: n.left,
            bottom: n.bottom,
            fontSize: n.fontSize,
            color: n.color,
            ["--dur" as never]: n.dur,
            ["--delay" as never]: n.delay,
          }}
        >
          {n.char}
        </span>
      ))}

      {/* Waveform bars along the bottom */}
      {waveBars.map((b) => (
        <div
          key={b.id}
          className="mm-wave-bar"
          style={{
            left: b.left,
            height: b.height,
            ["--dur" as never]: b.dur,
            ["--delay" as never]: b.delay,
          }}
        />
      ))}

      {/* Face-outline SVG watermark */}
      <svg
        className="mm-face-mark"
        style={{ bottom: "5%", right: "8%", width: 260, height: 320 }}
        viewBox="0 0 120 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M60 10 C35 10 20 28 20 52 L20 90 C20 115 38 130 60 130 C82 130 100 115 100 90 L100 52 C100 28 85 10 60 10 Z"
          stroke="url(#faceGrad)"
          strokeWidth="1.5"
          fill="none"
        />
        <circle cx="44" cy="56" r="4" stroke="url(#faceGrad)" strokeWidth="1" fill="none"/>
        <circle cx="76" cy="56" r="4" stroke="url(#faceGrad)" strokeWidth="1" fill="none"/>
        <path d="M46 80 Q60 92 74 80" stroke="url(#faceGrad)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <line x1="60" y1="130" x2="60" y2="150" stroke="url(#faceGrad)" strokeWidth="2"/>
        <line x1="40" y1="150" x2="80" y2="150" stroke="url(#faceGrad)" strokeWidth="2" strokeLinecap="round"/>
        <defs>
          <linearGradient id="faceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D4AF37"/>
            <stop offset="100%" stopColor="#A855F7"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
