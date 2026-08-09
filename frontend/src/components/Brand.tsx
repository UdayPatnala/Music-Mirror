/**
 * MusicMirror Brand Components — Multi-Accent Cinematic Dark System
 * ---
 * Canonical logo, wordmark, CDDisc, and ambient background system.
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
  moodColor?: string;
}

export function CDDisc({ size = 180, spinning = true, className = "", moodColor }: CDDiscProps) {
  const primaryGlow = moodColor || "var(--accent-violet)";

  return (
    <div
      className={`mm-cd-disc ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #FFFFFF 0%, #F4F1FF 55%, #E5E7EF 100%)",
        border: `2px solid ${primaryGlow}`,
        boxShadow: `0 12px 40px rgba(30,25,70,0.08)`,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        animation: spinning ? "mm-cd-spin 18s linear infinite" : "none",
        flexShrink: 0,
        transition: "border-color 500ms ease, box-shadow 500ms ease",
      }}
    >
      {/* Holographic groove rings */}
      <div
        style={{
          position: "absolute",
          inset: "8%",
          borderRadius: "50%",
          border: "1px solid rgba(111,113,128,0.12)",
          boxShadow: "inset 0 0 16px rgba(104,70,232,0.06)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "22%",
          borderRadius: "50%",
          border: `1px solid ${primaryGlow}30`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "36%",
          borderRadius: "50%",
          border: "1px solid rgba(111,113,128,0.12)",
        }}
      />

      {/* Subtle Aurora light sheen reflection */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 45%, rgba(76,154,255,0.08) 50%, rgba(213,108,255,0.08) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Aurora Center Ring */}
      <div
        style={{
          width: "32%",
          height: "32%",
          borderRadius: "50%",
          background: `var(--aurora-violet)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 4px 16px rgba(104,70,232,0.30)`,
          transition: "background 500ms ease",
        }}
      >
        {/* Aurora Blue AI Core */}
        <div
          style={{
            width: "55%",
            height: "55%",
            borderRadius: "50%",
            background: "var(--aurora-blue)",
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
              background: "#FFFFFF",
              border: "1px solid #E5E7EF",
              boxShadow: "inset 0 0 4px rgba(21,21,34,0.12)",
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
          <stop offset="0%" stopColor="#6846E8" />
          <stop offset="35%" stopColor="#9275FF" />
          <stop offset="70%" stopColor="#4C9AFF" />
          <stop offset="100%" stopColor="#6DE0E8" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#FFFFFF" stroke="#E5E7EF" />
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
      <span className="mm-wordmark-text" style={{ fontSize, background: "linear-gradient(135deg, #151522 0%, #6846E8 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        Music Mirror
      </span>
      {showBadge && <span className="mm-wordmark-badge" style={{ color: "#6846E8", borderColor: "#E5E7EF" }}>v2</span>}
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
    const colors = ["var(--accent-cyan)", "var(--accent-violet)", "var(--accent-teal)", "var(--accent-champagne)"];
    return Array.from({ length: noteCount }, (_, i) => ({
      id: i,
      char: NOTES[i % NOTES.length],
      left: `${5 + (i * 6.7) % 90}%`,
      bottom: `${(i * 13) % 70}%`,
      dur: `${10 + (i * 3.1) % 12}s`,
      delay: `${(i * 1.7) % 8}s`,
      fontSize: `${1 + (i * 0.15) % 1.2}rem`,
      opacity: 0.05 + (i * 0.007) % 0.08,
      color: colors[i % colors.length],
    }));
  }, [noteCount]);

  const waveBars = useMemo(() => {
    return Array.from({ length: waveBarCount }, (_, i) => ({
      id: i,
      left: `${(i / waveBarCount) * 100}%`,
      height: `${30 + (i * 6.5) % 100}px`,
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
            opacity: 0.04,
            filter: "blur(4px) saturate(1.1)",
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
            <stop offset="0%" stopColor="#22D3EE"/>
            <stop offset="50%" stopColor="#6366F1"/>
            <stop offset="100%" stopColor="#8B5CF6"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
