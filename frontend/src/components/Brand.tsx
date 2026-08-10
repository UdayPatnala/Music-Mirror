/**
 * MusicMirror Brand Components — Light Premium System
 * ---
 * Canonical logo, wordmark, CDDisc, and ambient background.
 * Light theme: white glass, violet accent, airy aurora, charcoal text.
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

/* ── CD Disc Brand Symbol ───────────────────────────────────── */
interface CDDiscProps {
  size?: number;
  spinning?: boolean;
  className?: string;
  moodColor?: string;
}

export function CDDisc({ size = 180, spinning = true, className = "" }: CDDiscProps) {

  return (
    <div
      className={`mm-cd-disc ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "radial-gradient(circle at 35% 35%, #FFFFFF 0%, #F5F7FA 50%, #EDF0F4 100%)",
        border: `1.5px solid rgba(99, 91, 255, 0.18)`,
        boxShadow: `0 8px 32px rgba(23,24,28,0.07), 0 2px 8px rgba(99,91,255,0.08)`,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        animation: spinning ? "mm-cd-spin 20s linear infinite" : "none",
        flexShrink: 0,
        transition: "border-color 500ms ease, box-shadow 500ms ease",
      }}
    >
      {/* Iridescent rainbow ring */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: `conic-gradient(
            from 0deg,
            rgba(99,91,255,0.28)   0deg,
            rgba(139,124,255,0.24) 60deg,
            rgba(71,212,219,0.24)  120deg,
            rgba(47,163,107,0.20)  180deg,
            rgba(216,154,43,0.24)  240deg,
            rgba(217,92,92,0.20)   300deg,
            rgba(99,91,255,0.28)   360deg
          )`,
          mixBlendMode: "multiply",
          opacity: 0.55,
        }}
      />

      {/* Groove rings */}
      {[8, 22, 36].map((pct) => (
        <div
          key={pct}
          style={{
            position: "absolute",
            inset: `${pct}%`,
            borderRadius: "50%",
            border: `1px solid rgba(95,99,109,0.07)`,
          }}
        />
      ))}

      {/* Light sheen */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 40%, rgba(99,91,255,0.05) 55%, rgba(71,212,219,0.06) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Center hub — violet ring */}
      <div
        style={{
          width: "32%",
          height: "32%",
          borderRadius: "50%",
          background: `linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: `0 4px 14px rgba(99,91,255,0.24)`,
          transition: "background 500ms ease",
        }}
      >
        {/* Inner ring */}
        <div
          style={{
            width: "55%",
            height: "55%",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #8B7CFF, #47D4DB)",
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
              border: "1px solid #E5E7EC",
              boxShadow: "inset 0 0 4px rgba(23,24,28,0.10)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ── SVG Logo mark ─────────────────────────────────────────── */
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
          <stop offset="0%"   stopColor="#635BFF" />
          <stop offset="40%"  stopColor="#8B7CFF" />
          <stop offset="75%"  stopColor="#4F8FD9" />
          <stop offset="100%" stopColor="#47D4DB" />
        </linearGradient>
      </defs>
      {/* Card background */}
      <rect width="64" height="64" rx="14" fill="#FFFFFF" stroke="#E5E7EC" strokeWidth="1" />
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
      <line x1="28" y1="32" x2="33" y2="32" stroke="url(#mmg1)" strokeWidth="1.5" opacity="0.55" />
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
      <span
        className="mm-wordmark-text"
        style={{
          fontSize,
          background: "linear-gradient(135deg, #17181C 0%, #635BFF 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        Music Mirror
      </span>
      {showBadge && (
        <span className="mm-wordmark-badge">v2</span>
      )}
    </span>
  );
}

/* ── Themed Background Canvas (Light Aurora) ───────────────── */
const NOTES = ["♪", "♫", "♩", "♬", "𝅘𝅥𝅮", "♭", "♯"];

interface ThemeBackgroundProps {
  noteCount?: number;
  showAurora?: boolean;
}

export function ThemeBackground({
  noteCount = 10,
  showAurora = true,
}: ThemeBackgroundProps) {
  const notes = useMemo(() => {
    return Array.from({ length: noteCount }, (_, i) => ({
      id: i,
      char: NOTES[i % NOTES.length],
      left: `${5 + (i * 9.3) % 88}%`,
      bottom: `${(i * 13) % 65}%`,
      dur: `${12 + (i * 3.1) % 10}s`,
      delay: `${(i * 2.1) % 9}s`,
      fontSize: `${1.0 + (i * 0.12) % 1.0}rem`,
    }));
  }, [noteCount]);

  return (
    <div className="mm-bg-canvas" aria-hidden="true">
      {/* Light aurora blobs */}
      {showAurora && (
        <>
          <div className="mm-aurora-blob mm-aurora-blob--primary" />
          <div className="mm-aurora-blob mm-aurora-blob--secondary" />
          <div className="mm-aurora-blob mm-aurora-blob--accent" />
        </>
      )}

      {/* Floating music notes — very subtle */}
      {notes.map((n) => (
        <span
          key={n.id}
          className="mm-note"
          style={{
            left: n.left,
            bottom: n.bottom,
            fontSize: n.fontSize,
            ["--dur" as never]: n.dur,
            ["--delay" as never]: n.delay,
          }}
        >
          {n.char}
        </span>
      ))}

      {/* Face outline watermark */}
      <svg
        style={{
          position: "absolute",
          bottom: "5%",
          right: "8%",
          width: 240,
          height: 300,
          opacity: 0.022,
          animation: "aurora-drift 10s ease-in-out infinite alternate",
        }}
        viewBox="0 0 120 150"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M60 10 C35 10 20 28 20 52 L20 90 C20 115 38 130 60 130 C82 130 100 115 100 90 L100 52 C100 28 85 10 60 10 Z"
          stroke="url(#faceGradLight)"
          strokeWidth="1.5"
          fill="none"
        />
        <circle cx="44" cy="56" r="4" stroke="url(#faceGradLight)" strokeWidth="1" fill="none"/>
        <circle cx="76" cy="56" r="4" stroke="url(#faceGradLight)" strokeWidth="1" fill="none"/>
        <path d="M46 80 Q60 92 74 80" stroke="url(#faceGradLight)" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <line x1="60" y1="130" x2="60" y2="150" stroke="url(#faceGradLight)" strokeWidth="2"/>
        <line x1="40" y1="150" x2="80" y2="150" stroke="url(#faceGradLight)" strokeWidth="2" strokeLinecap="round"/>
        <defs>
          <linearGradient id="faceGradLight" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#635BFF"/>
            <stop offset="50%"  stopColor="#8B7CFF"/>
            <stop offset="100%" stopColor="#47D4DB"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
