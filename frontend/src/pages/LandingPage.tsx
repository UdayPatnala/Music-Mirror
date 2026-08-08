// @ts-nocheck
import React, { useState, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ThemeBackground, Wordmark } from "../components/Brand";


/* ─────────────────────────────────────────────────────────────────
   MUSIC MIRROR V2 — LANDING PAGE
   Visual Metaphor: Premium CD Jewel Case → Intelligent AI Player
   Philosophy: Curious. Calm. Premium. Trust. Excitement.
───────────────────────────────────────────────────────────────── */

const FEATURES = [
  {
    title: "Emotion Detection",
    body: "WebGL facial biometrics read your expression in real time.",
    grad: "linear-gradient(135deg,#D4AF37,#FFD56A)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
        <circle cx="12" cy="8" r="4"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>
        <path d="M9 8s.5 2 3 2 3-2 3-2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: "AI Recommendation",
    body: "Deep learning maps emotion vectors to the perfect track.",
    grad: "linear-gradient(135deg,#7E22CE,#C084FC)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    title: "Automatic Playback",
    body: "Music starts instantly. Zero clicks required.",
    grad: "linear-gradient(135deg,#16A34A,#34D399)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
        <polygon points="5,3 19,12 5,21"/>
      </svg>
    ),
  },
  {
    title: "Multi-Source Music",
    body: "YouTube, Spotify, JioSaavn, Gaana — unified.",
    grad: "linear-gradient(135deg,#2563EB,#60A5FA)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
        <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>
      </svg>
    ),
  },
  {
    title: "Privacy First",
    body: "All processing is local. Nothing leaves your device.",
    grad: "linear-gradient(135deg,#B87333,#D99058)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    title: "Continuous Learning",
    body: "The system refines its understanding with every session.",
    grad: "linear-gradient(135deg,#B91C1C,#EF4444)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
        <path d="M21 12a9 9 0 11-6.219-8.56"/><polyline points="21,3 21,9 15,9"/>
      </svg>
    ),
  },
];

const STEPS = [
  { n: "01", label: "Choose Language", sub: "Telugu · English · Tamil · Hindi" },
  { n: "02", label: "Allow Camera",     sub: "One-time permission" },
  { n: "03", label: "AI Detects Emotion", sub: "Facial biometrics" },
  { n: "04", label: "Song Found",       sub: "Vector matched" },
  { n: "05", label: "Music Starts",     sub: "Automatically" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  // Cursor tracking for CD parallax reflections
  const [cursor, setCursor] = useState({ x: 0.5, y: 0.5 });
  const heroRef = useRef<HTMLDivElement>(null);

  // Transition state machine
  // idle → spin → open → eject → insert → done
  const [phase] = useState<"idle"|"spin"|"open"|"eject"|"insert"|"done">("idle");

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    setCursor({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    });
  }, []);

  const handleEnter = () => {
    navigate("/room");
  };

  // Derived reflection values from cursor
  const rx = (cursor.x - 0.5) * 28;   // deg X tilt
  const ry = (cursor.y - 0.5) * -18;  // deg Y tilt
  const shine1X = cursor.x * 100;
  const shine1Y = cursor.y * 100;

  const isTransitioning = phase !== "idle";

  return (
    <>
      {/* ─── Scoped Styles ─────────────────────────────────────── */}
      <style>{`
        /* ── Reset & Font ── */
        .lp2-root {
          min-height: 100vh;
          background: #080808;
          color: #F8F8F8;
          font-family: "Outfit", "Inter", system-ui, sans-serif;
          overflow-x: hidden;
          position: relative;
        }

        /* ── Grain Overlay ── */
        .lp2-root::before {
          content: "";
          position: fixed;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.035'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 200px 200px;
          pointer-events: none;
          z-index: 1;
          opacity: 0.6;
          mix-blend-mode: overlay;
        }

        /* ── Ambient center glow ── */
        .lp2-ambient {
          position: fixed;
          inset: 0;
          background: radial-gradient(ellipse 80% 60% at 50% 40%,
            rgba(212,175,55,0.06) 0%,
            rgba(168,85,247,0.04) 40%,
            transparent 70%
          );
          pointer-events: none;
          z-index: 1;
          transition: opacity 1.2s ease;
        }
        .lp2-ambient.fading { opacity: 0; }

        /* ── Floating Navbar ── */
        .lp2-nav {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 200;
          width: min(1120px, calc(100vw - 48px));
        }
        .lp2-nav-inner {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(24px) saturate(1.4);
          -webkit-backdrop-filter: blur(24px) saturate(1.4);
          border-radius: 999px;
          padding: 12px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 32px;
          transition: opacity 0.6s ease;
        }
        .lp2-nav-inner.hidden { opacity: 0; pointer-events: none; }
        .lp2-nav-brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #F8F8F8;
        }
        .lp2-nav-disc {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: conic-gradient(#D4AF37 0deg, #C084FC 120deg, #60A5FA 240deg, #D4AF37 360deg);
          box-shadow: 0 0 8px rgba(212,175,55,0.4);
          flex-shrink: 0;
        }
        .lp2-nav-links {
          display: flex;
          align-items: center;
          gap: 24px;
        }
        .lp2-nav-link {
          font-size: 0.82rem;
          font-weight: 600;
          color: #B3B3B3;
          transition: color 0.18s;
          text-decoration: none;
          letter-spacing: 0.01em;
        }
        .lp2-nav-link:hover { color: #F8F8F8; }
        .lp2-nav-link-accent {
          color: #D4AF37;
          background: rgba(212,175,55,0.08);
          border: 1px solid rgba(212,175,55,0.18);
          padding: 6px 16px;
          border-radius: 999px;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .lp2-nav-link-accent:hover { color: #FFD56A; }

        /* ── Hero Section ── */
        .lp2-hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          z-index: 10;
          padding: 100px 40px 60px;
          transition: opacity 0.8s ease;
        }
        .lp2-hero.fading-out {
          opacity: 0;
          transform: scale(0.98);
          transition: all 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .lp2-hero-inner {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 80px;
          max-width: 1200px;
          width: 100%;
          align-items: center;
        }

        /* ── Text Column ── */
        .lp2-text { display: flex; flex-direction: column; }
        .lp2-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #D4AF37;
          margin-bottom: 28px;
        }
        .lp2-eyebrow-line {
          width: 32px;
          height: 1px;
          background: #D4AF37;
          opacity: 0.6;
        }
        .lp2-headline {
          font-size: clamp(3rem, 5vw, 5rem);
          font-weight: 900;
          line-height: 1.02;
          letter-spacing: -0.05em;
          color: #F8F8F8;
          margin: 0 0 24px;
        }
        .lp2-headline em {
          font-style: normal;
          background: linear-gradient(135deg, #D4AF37 0%, #FFD56A 40%, #C084FC 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lp2-subline {
          font-size: 1.1rem;
          color: #B3B3B3;
          line-height: 1.65;
          font-weight: 300;
          max-width: 400px;
          margin-bottom: 48px;
        }

        /* ── CTA ── */
        .lp2-cta-wrap { display: flex; flex-direction: column; gap: 20px; }
        .lp2-cta-primary {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          padding: 18px 40px;
          border-radius: 999px;
          border: 1px solid rgba(212,175,55,0.35);
          background: rgba(212,175,55,0.08);
          backdrop-filter: blur(16px);
          color: #F8F8F8;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          letter-spacing: -0.01em;
          transition: all 0.28s cubic-bezier(0.25, 0.8, 0.25, 1);
          width: fit-content;
          box-shadow: 0 0 32px rgba(212,175,55,0.06), inset 0 1px 0 rgba(255,255,255,0.06);
          position: relative;
          overflow: hidden;
        }
        .lp2-cta-primary::before {
          content: "";
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(212,175,55,0.15), transparent 70%);
          opacity: 0;
          transition: opacity 0.28s;
        }
        .lp2-cta-primary:hover { 
          transform: scale(1.03) translateY(-1px);
          border-color: rgba(212,175,55,0.6);
          box-shadow: 0 0 48px rgba(212,175,55,0.15), 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
          background: rgba(212,175,55,0.14);
        }
        .lp2-cta-primary:hover::before { opacity: 1; }
        .lp2-cta-primary:active { transform: scale(0.99); }
        .lp2-cta-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #D4AF37, #FFD56A);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .lp2-cta-secondary {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .lp2-cta-ghost {
          font-size: 0.8rem;
          font-weight: 600;
          color: #6F6F6F;
          text-decoration: none;
          transition: color 0.18s;
          letter-spacing: 0.02em;
        }
        .lp2-cta-ghost:hover { color: #B3B3B3; }
        .lp2-cta-dot { width: 2px; height: 2px; border-radius: 50%; background: #3A3A3A; }

        /* ── CD Visual Column ── */
        .lp2-cd-column {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          min-height: 520px;
        }

        /* ── AI / Human silhouettes ── */
        .lp2-silhouettes {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          pointer-events: none;
          z-index: 1;
          opacity: 0.55;
        }
        .lp2-silhouette {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .lp2-sil-ai svg, .lp2-sil-human svg {
          opacity: 0.7;
        }
        /* Waveform connector */
        .lp2-wave-connector {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: 65%;
          pointer-events: none;
          z-index: 2;
          opacity: 0.3;
        }

        /* ── Jewel Case Outer ── */
        .lp2-jewel-case-wrap {
          position: relative;
          z-index: 10;
          perspective: 1000px;
          cursor: pointer;
          user-select: none;
        }
        .lp2-jewel-case {
          width: 320px;
          height: 320px;
          position: relative;
          transform-style: preserve-3d;
          transition: transform 1.2s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        /* Case open animation */
        .phase-open .lp2-jewel-case,
        .phase-eject .lp2-jewel-case,
        .phase-insert .lp2-jewel-case { transform: rotateY(-15deg) rotateX(5deg); }

        /* Outer glass case panel */
        .lp2-case-glass {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: rgba(255,255,255,0.015);
          border: 1px solid rgba(255,255,255,0.10);
          backdrop-filter: blur(2px);
          box-shadow: 
            0 32px 80px rgba(0,0,0,0.8),
            0 0 0 1px rgba(255,255,255,0.04),
            inset 0 1px 0 rgba(255,255,255,0.08),
            inset 0 -1px 0 rgba(0,0,0,0.4);
          z-index: 20;
          pointer-events: none;
          overflow: hidden;
        }
        /* Glass shine */
        .lp2-case-glass::after {
          content: "";
          position: absolute;
          top: 0; left: 0;
          width: 40%; height: 100%;
          background: linear-gradient(
            105deg,
            rgba(255,255,255,0.04) 0%,
            rgba(255,255,255,0.02) 40%,
            transparent 100%
          );
          pointer-events: none;
        }
        /* Case open lid */
        .lp2-case-lid {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: rgba(255,255,255,0.01);
          border: 1px solid rgba(255,255,255,0.06);
          transform-origin: right center;
          transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 19;
          box-shadow: inset 0 0 40px rgba(0,0,0,0.5);
        }
        .phase-open .lp2-case-lid,
        .phase-eject .lp2-case-lid,
        .phase-insert .lp2-case-lid { transform: rotateY(-105deg); }

        /* ── The CD Disc ── */
        .lp2-cd-disc-wrap {
          position: absolute;
          inset: 24px;
          border-radius: 50%;
          z-index: 15;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 1.4s cubic-bezier(0.4, 0, 0.2, 1),
                      opacity 0.6s ease;
        }
        /* CD ejects upward */
        .phase-eject .lp2-cd-disc-wrap {
          transform: translateY(-160px) scale(1.1);
        }
        .phase-insert .lp2-cd-disc-wrap {
          transform: translateY(-160px) translateX(40px) scale(0.85);
          opacity: 0.3;
        }

        .lp2-cd-disc {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          position: relative;
          overflow: hidden;
          /* Spinning */
          animation: lp2-idle-spin 120s linear infinite;
        }
        .phase-spin .lp2-cd-disc,
        .phase-open .lp2-cd-disc,
        .phase-eject .lp2-cd-disc,
        .phase-insert .lp2-cd-disc {
          animation-duration: 2s;
        }
        @keyframes lp2-idle-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* Brushed aluminum base */
        .lp2-cd-base {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: 
            radial-gradient(circle at 30% 30%, #3a3a3a 0%, #1a1a1a 40%, #0d0d0d 70%, #050505 100%);
        }

        /* Rainbow iridescent ring */
        .lp2-cd-rainbow {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            rgba(212,175,55,0.6)   0deg,
            rgba(192,132,252,0.55) 60deg,
            rgba(96,165,250,0.55)  120deg,
            rgba(52,211,153,0.5)   180deg,
            rgba(251,146,60,0.55)  240deg,
            rgba(239,68,68,0.5)    300deg,
            rgba(212,175,55,0.6)   360deg
          );
          mix-blend-mode: overlay;
          opacity: 0.7;
        }

        /* Brushed radial lines */
        .lp2-cd-brush {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: repeating-conic-gradient(
            rgba(255,255,255,0.018) 0deg 1deg,
            transparent 1deg 2.5deg
          );
        }

        /* Dynamic cursor shine */
        .lp2-cd-shine {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          transition: background 0.08s linear;
          mix-blend-mode: screen;
          opacity: 0.4;
        }

        /* Track grooves */
        .lp2-cd-grooves {
          position: absolute;
          inset: 0;
          border-radius: 50%;
        }
        .lp2-cd-groove {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.03);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        }

        /* Center label art */
        .lp2-cd-label {
          position: absolute;
          inset: 28%;
          border-radius: 50%;
          background: radial-gradient(circle, #1A1A1A 0%, #111 100%);
          border: 1px solid rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          z-index: 5;
        }
        .lp2-cd-label-text {
          font-size: 0.38rem;
          font-weight: 900;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.7);
          line-height: 1.3;
          text-align: center;
        }
        .lp2-cd-label-grad {
          font-size: 0.42rem;
          font-weight: 700;
          letter-spacing: 0.06em;
          background: linear-gradient(90deg, #D4AF37, #C084FC);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-top: 2px;
        }

        /* Center spindle hole */
        .lp2-cd-hole {
          position: absolute;
          inset: 44%;
          border-radius: 50%;
          background: #050505;
          border: 1px solid rgba(255,255,255,0.08);
          z-index: 6;
          box-shadow: inset 0 0 8px rgba(0,0,0,0.9);
        }

        /* Outer CD edge glow */
        .lp2-cd-edge-glow {
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow:
            0 0 24px rgba(212,175,55,0.08),
            inset 0 0 16px rgba(0,0,0,0.6);
          z-index: 6;
          pointer-events: none;
        }

        /* ── Below-hero ambient glow from CD ── */
        .lp2-cd-ambient {
          position: absolute;
          bottom: -60px;
          left: 50%;
          transform: translateX(-50%);
          width: 340px;
          height: 120px;
          background: radial-gradient(ellipse, rgba(212,175,55,0.12) 0%, transparent 70%);
          filter: blur(20px);
          pointer-events: none;
          z-index: 5;
        }

        /* ── Transition Overlay ── */
        .lp2-transition-overlay {
          position: fixed;
          inset: 0;
          background: #080808;
          z-index: 500;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.8s ease;
        }
        .lp2-transition-overlay.active {
          opacity: 1;
          pointer-events: all;
        }

        /* ── Player Insert Scene ── */
        .lp2-player-scene {
          position: fixed;
          inset: 0;
          z-index: 490;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 40px;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.6s ease;
        }
        .lp2-player-scene.visible { opacity: 1; }
        .lp2-player-body {
          width: 320px;
          height: 80px;
          background: linear-gradient(180deg, #1e1e1e 0%, #111 100%);
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 8px 48px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06);
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 24px;
          position: relative;
          overflow: hidden;
        }
        .lp2-player-slot {
          width: 140px;
          height: 4px;
          background: rgba(255,255,255,0.04);
          border-radius: 2px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.06);
          position: relative;
        }
        .lp2-player-slot-fill {
          height: 100%;
          border-radius: 2px;
          background: linear-gradient(90deg, #D4AF37, #C084FC);
          width: 0;
          transition: width 1.2s ease;
        }
        .lp2-player-scene.visible .lp2-player-slot-fill { width: 100%; }
        .lp2-player-led {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #D4AF37;
          box-shadow: 0 0 8px #D4AF37;
          animation: lp2-blink 0.6s ease infinite alternate;
          margin-left: auto;
        }
        @keyframes lp2-blink { from { opacity: 0.3; } to { opacity: 1; } }
        .lp2-player-label {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          color: #6F6F6F;
          text-transform: uppercase;
          margin-top: 16px;
          animation: fadeIn 0.6s ease;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* ── How It Works ── */
        .lp2-how-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px 120px;
          position: relative;
          z-index: 10;
        }
        .lp2-section-header {
          text-align: center;
          margin-bottom: 64px;
        }
        .lp2-section-kicker {
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #D4AF37;
          margin-bottom: 12px;
          display: block;
        }
        .lp2-section-title {
          font-size: clamp(2rem, 3.5vw, 2.8rem);
          font-weight: 900;
          letter-spacing: -0.04em;
          color: #F8F8F8;
          margin: 0;
        }

        .lp2-timeline {
          display: flex;
          align-items: flex-start;
          gap: 0;
          position: relative;
        }
        .lp2-timeline-step {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }
        /* Connector line between steps */
        .lp2-timeline-step:not(:last-child)::after {
          content: "";
          position: absolute;
          top: 24px;
          right: 0;
          width: 50%;
          height: 1px;
          background: linear-gradient(90deg, rgba(255,255,255,0.08), transparent);
          z-index: 0;
        }
        .lp2-timeline-step:not(:first-child)::before {
          content: "";
          position: absolute;
          top: 24px;
          left: 0;
          width: 50%;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08));
          z-index: 0;
        }
        .lp2-step-num {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.76rem;
          font-weight: 800;
          color: #D4AF37;
          letter-spacing: 0.04em;
          margin-bottom: 20px;
          position: relative;
          z-index: 1;
          box-shadow: 0 0 24px rgba(212,175,55,0.06);
        }
        .lp2-step-label {
          font-size: 0.9rem;
          font-weight: 700;
          color: #F8F8F8;
          text-align: center;
          margin-bottom: 6px;
        }
        .lp2-step-sub {
          font-size: 0.76rem;
          color: #6F6F6F;
          text-align: center;
          line-height: 1.4;
        }

        /* ── Feature Cards ── */
        .lp2-features-section {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px 160px;
          position: relative;
          z-index: 10;
        }
        .lp2-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .lp2-feat-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 20px;
          padding: 28px;
          position: relative;
          overflow: hidden;
          transition: all 0.28s cubic-bezier(0.25, 0.8, 0.25, 1);
          cursor: default;
          transform-style: preserve-3d;
        }
        .lp2-feat-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 20px;
          opacity: 0;
          transition: opacity 0.28s;
        }
        .lp2-feat-card:hover {
          transform: translateY(-6px) scale(1.01);
          border-color: rgba(255,255,255,0.12);
          box-shadow: 0 20px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04);
        }
        .lp2-feat-card:hover::before { opacity: 1; }
        .lp2-feat-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          color: #F8F8F8;
        }
        .lp2-feat-title {
          font-size: 1rem;
          font-weight: 800;
          color: #F8F8F8;
          margin-bottom: 10px;
          letter-spacing: -0.01em;
        }
        .lp2-feat-body {
          font-size: 0.84rem;
          color: #6F6F6F;
          line-height: 1.55;
          margin: 0;
        }
        .lp2-feat-corner {
          position: absolute;
          bottom: 20px;
          right: 24px;
          font-size: 2.2rem;
          font-weight: 900;
          color: rgba(255,255,255,0.025);
          letter-spacing: -0.06em;
          user-select: none;
          line-height: 1;
        }

        /* ── Footer ── */
        .lp2-footer {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 40px 60px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 10;
          border-top: 1px solid rgba(255,255,255,0.04);
          padding-top: 32px;
        }
        .lp2-footer-brand {
          font-size: 0.82rem;
          font-weight: 700;
          color: #3A3A3A;
        }
        .lp2-footer-links {
          display: flex;
          gap: 20px;
        }
        .lp2-footer-link {
          font-size: 0.78rem;
          color: #3A3A3A;
          text-decoration: none;
          transition: color 0.18s;
        }
        .lp2-footer-link:hover { color: #6F6F6F; }

        /* ── Reduced Motion ── */
        @media (prefers-reduced-motion: reduce) {
          .lp2-cd-disc { animation: none !important; }
          .lp2-cta-primary, .lp2-feat-card { transition: none !important; }
        }

        /* ── Mobile ── */
        @media (max-width: 768px) {
          .lp2-nav-links { display: none; }
          .lp2-hero-inner { grid-template-columns: 1fr; gap: 48px; }
          .lp2-cd-column { order: -1; min-height: 280px; }
          .lp2-jewel-case { width: 240px; height: 240px; }
          .lp2-headline { font-size: 2.8rem; }
          .lp2-timeline { flex-direction: column; align-items: center; gap: 24px; }
          .lp2-timeline-step::before,
          .lp2-timeline-step::after { display: none; }
          .lp2-features-grid { grid-template-columns: 1fr; }
          .lp2-footer { flex-direction: column; gap: 16px; text-align: center; }
        }
      `}</style>

      {/* ─── Root ─────────────────────────────────────────────── */}
      <div className={`lp2-root phase-${phase}`}>

        {/* Themed background: floating notes, waveform bars, face watermark */}
        <ThemeBackground noteCount={16} waveBarCount={50} showHeroBg />

        {/* Ambient glow */}
        <div className={`lp2-ambient${isTransitioning ? " fading" : ""}`} />

        {/* Transition overlay */}
        <div className={`lp2-transition-overlay${phase === "insert" || phase === "done" ? " active" : ""}`} />

        {/* Player insert scene */}
        <div className={`lp2-player-scene${phase === "insert" || phase === "done" ? " visible" : ""}`}>
          <div className="lp2-player-body">
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#3A3A3A" }}>MusicMirror AI</div>
              <div className="lp2-player-slot">
                <div className="lp2-player-slot-fill" />
              </div>
            </div>
            <div className="lp2-player-led" />
          </div>
          <div className="lp2-player-label">Entering Music Room...</div>
        </div>

        {/* ── Floating Navbar ── */}
        <nav className="lp2-nav" aria-label="Main navigation">
          <div className={`lp2-nav-inner${isTransitioning ? " hidden" : ""}`}>
            <div className="lp2-nav-brand">
              <Wordmark size="md" showBadge />
            </div>
            <div className="lp2-nav-links">
              <a href="#how" className="lp2-nav-link">How It Works</a>
              <Link to="/summary" className="lp2-nav-link">About</Link>

              <Link to="/dashboard" className="lp2-nav-link">Docs</Link>
              <Link to="/profile" className="lp2-nav-link lp2-nav-link-accent">Login</Link>
            </div>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section
          className={`lp2-hero${isTransitioning ? " fading-out" : ""}`}
          ref={heroRef}
          onMouseMove={handleMouseMove}
          aria-label="Hero"
        >
          <div className="lp2-hero-inner">

            {/* LEFT: Text */}
            <div className="lp2-text">
              <div className="lp2-eyebrow" aria-hidden>
                <span className="lp2-eyebrow-line" />
                Emotion-First AI Music
                <span className="lp2-eyebrow-line" />
              </div>

              <h1 className="lp2-headline">
                Music that<br /><em>understands you.</em>
              </h1>

              <p className="lp2-subline">
                AI reads your emotion and starts the right song instantly — no searches, no playlists, no decisions.
              </p>

              <div className="lp2-cta-wrap">
                <button
                  className="lp2-cta-primary"
                  onClick={handleEnter}
                  type="button"
                  disabled={isTransitioning}
                  aria-label="Enter Music Room"
                >
                  <span className="lp2-cta-icon" aria-hidden>
                    <svg viewBox="0 0 16 16" fill="#090909" width="12" height="12">
                      <polygon points="3,1 14,8 3,15" />
                    </svg>
                  </span>
                  Enter Music Room
                </button>

                <div className="lp2-cta-secondary" aria-label="Secondary links">
                  <a href="#how" className="lp2-cta-ghost">How it works</a>
                  <span className="lp2-cta-dot" aria-hidden />
                  <Link to="/summary" className="lp2-cta-ghost">About</Link>
                  <span className="lp2-cta-dot" aria-hidden />
                  <Link to="/dashboard" className="lp2-cta-ghost">Docs</Link>
                </div>
              </div>
            </div>

            {/* RIGHT: CD Visual */}
            <div className="lp2-cd-column" aria-hidden>

              {/* AI + Human silhouettes behind CD */}
              <div className="lp2-silhouettes">
                {/* Left: AI Neural Network */}
                <div className="lp2-silhouette lp2-sil-ai">
                  <svg width="90" height="120" viewBox="0 0 90 120" fill="none">
                    {/* Neural nodes */}
                    {[[10,20],[10,60],[10,100],[45,10],[45,40],[45,70],[45,100],[80,30],[80,70]].map(([x,y],i) => (
                      <circle key={i} cx={x} cy={y} r="3.5" fill="rgba(212,175,55,0.5)" />
                    ))}
                    {/* Connections */}
                    {[
                      [10,20,45,10],[10,20,45,40],[10,60,45,40],[10,60,45,70],[10,100,45,70],[10,100,45,100],
                      [45,10,80,30],[45,40,80,30],[45,70,80,70],[45,100,80,70]
                    ].map(([x1,y1,x2,y2],i) => (
                      <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(212,175,55,0.2)" strokeWidth="0.8" />
                    ))}
                  </svg>
                  <div style={{ fontSize: "0.6rem", color: "rgba(212,175,55,0.4)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>AI</div>
                </div>

                {/* Right: Human head silhouette */}
                <div className="lp2-silhouette lp2-sil-human">
                  <svg width="80" height="110" viewBox="0 0 80 110" fill="none">
                    {/* Head outline */}
                    <ellipse cx="40" cy="36" rx="28" ry="32" stroke="rgba(192,132,252,0.3)" strokeWidth="1" fill="none" />
                    {/* Facial landmarks */}
                    {[[30,28],[50,28],[40,38],[33,46],[47,46]].map(([x,y],i) => (
                      <circle key={i} cx={x} cy={y} r="2" fill="rgba(192,132,252,0.5)" />
                    ))}
                    {/* Lines connecting landmarks */}
                    <path d="M30 28 L40 38 L50 28" stroke="rgba(192,132,252,0.2)" strokeWidth="0.7" fill="none" />
                    <path d="M33 46 L40 38 L47 46" stroke="rgba(192,132,252,0.2)" strokeWidth="0.7" fill="none" />
                    {/* Neck + shoulders */}
                    <path d="M30 68 Q40 64 50 68 Q60 90 55 110 L25 110 Q20 90 30 68z" fill="rgba(192,132,252,0.04)" stroke="rgba(192,132,252,0.15)" strokeWidth="0.8" />
                  </svg>
                  <div style={{ fontSize: "0.6rem", color: "rgba(192,132,252,0.4)", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Human</div>
                </div>

                {/* Waveform between them */}
                <div className="lp2-wave-connector">
                  <svg viewBox="0 0 200 40" fill="none" style={{ width: "100%", animation: "pulse 3s ease-in-out infinite" }}>
                    <path
                      d="M0 20 Q10 5 20 20 Q30 35 40 20 Q50 5 60 20 Q70 35 80 20 Q90 5 100 20 Q110 35 120 20 Q130 5 140 20 Q150 35 160 20 Q170 5 180 20 Q190 35 200 20"
                      stroke="url(#waveGrad)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <defs>
                      <linearGradient id="waveGrad" x1="0" x2="200" y1="0" y2="0" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#D4AF37" />
                        <stop offset="50%" stopColor="#C084FC" />
                        <stop offset="100%" stopColor="#60A5FA" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>

              {/* Jewel case + CD */}
              <div className="lp2-jewel-case-wrap" onClick={handleEnter}>
                <div
                  className="lp2-jewel-case"
                  style={{
                    transform: !isTransitioning
                      ? `perspective(1000px) rotateY(${rx}deg) rotateX(${ry}deg)`
                      : undefined
                  }}
                >
                  {/* Glass case panel */}
                  <div className="lp2-case-glass" />
                  {/* Openable lid */}
                  <div className="lp2-case-lid" />

                  {/* CD Disc */}
                  <div className="lp2-cd-disc-wrap">
                    <div className="lp2-cd-disc">
                      <div className="lp2-cd-base" />
                      <div className="lp2-cd-rainbow" />
                      <div className="lp2-cd-brush" />

                      {/* Cursor reactive shine */}
                      <div
                        className="lp2-cd-shine"
                        style={{
                          background: `radial-gradient(circle at ${shine1X}% ${shine1Y}%, rgba(255,255,255,0.25) 0%, transparent 55%)`
                        }}
                      />

                      {/* Groove rings */}
                      <div className="lp2-cd-grooves">
                        {[92,80,68,57,46,36].map(s => (
                          <div key={s} className="lp2-cd-groove" style={{ width: `${s}%`, height: `${s}%` }} />
                        ))}
                      </div>

                      {/* Center label */}
                      <div className="lp2-cd-label">
                        <div className="lp2-cd-label-text">Music Mirror</div>
                        <div className="lp2-cd-label-grad">V2</div>
                        {/* Tiny AI waveform on label */}
                        <svg viewBox="0 0 40 12" fill="none" style={{ width: 36, marginTop: 3, opacity: 0.6 }}>
                          <path d="M0 6 Q5 2 10 6 Q15 10 20 6 Q25 2 30 6 Q35 10 40 6" stroke="#D4AF37" strokeWidth="0.8" strokeLinecap="round" fill="none" />
                        </svg>
                      </div>

                      {/* Spindle hole */}
                      <div className="lp2-cd-hole" />

                      {/* Edge glow */}
                      <div className="lp2-cd-edge-glow" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Ambient floor glow from CD */}
              <div className="lp2-cd-ambient" />
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how" className="lp2-how-section" aria-labelledby="how-title">
          <div className="lp2-section-header">
            <span className="lp2-section-kicker">The Process</span>
            <h2 className="lp2-section-title" id="how-title">How It Works</h2>
          </div>

          <div className="lp2-timeline" role="list">
            {STEPS.map((s, i) => (
              <div key={i} className="lp2-timeline-step" role="listitem">
                <div className="lp2-step-num">{s.n}</div>
                <div className="lp2-step-label">{s.label}</div>
                <div className="lp2-step-sub">{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Feature Cards ── */}
        <section className="lp2-features-section" aria-labelledby="features-title">
          <div className="lp2-section-header">
            <span className="lp2-section-kicker">Capabilities</span>
            <h2 className="lp2-section-title" id="features-title">What It Does</h2>
          </div>

          <div className="lp2-features-grid">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className="lp2-feat-card"
                style={{ "--feat-grad": f.grad } as any}
                tabIndex={0}
              >
                <div
                  className="lp2-feat-icon"
                  style={{ background: `${f.grad.replace("linear-gradient(135deg,", "").split(",")[0].trim()}18`, border: `1px solid ${f.grad.replace("linear-gradient(135deg,", "").split(",")[0].trim()}28` }}
                >
                  {f.icon}
                </div>
                <div className="lp2-feat-title">{f.title}</div>
                <p className="lp2-feat-body">{f.body}</p>
                <div className="lp2-feat-corner">{String(i + 1).padStart(2, "0")}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="lp2-footer">
          <div className="lp2-footer-brand">© 2026 Music Mirror V2</div>
          <div className="lp2-footer-links">
            <Link to="/summary" className="lp2-footer-link">About</Link>

            <Link to="/dashboard" className="lp2-footer-link">Docs</Link>
            <Link to="/profile" className="lp2-footer-link">Privacy</Link>
          </div>
        </footer>
      </div>
    </>
  );
}
