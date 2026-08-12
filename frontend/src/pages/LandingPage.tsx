import { useState } from "react";
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
    iconBg: "rgba(47,163,107,0.12)",
    iconBorder: "rgba(47,163,107,0.22)",
    iconColor: "#2FA36B",
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
    iconBg: "rgba(99,91,255,0.10)",
    iconBorder: "rgba(99,91,255,0.22)",
    iconColor: "#635BFF",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
        <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
      </svg>
    ),
  },
  {
    title: "Automatic Playback",
    body: "Music starts instantly. Zero clicks required.",
    iconBg: "rgba(79,143,217,0.10)",
    iconBorder: "rgba(79,143,217,0.22)",
    iconColor: "#4F8FD9",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
        <polygon points="5,3 19,12 5,21"/>
      </svg>
    ),
  },
  {
    title: "Multi-Source Music",
    body: "Jamendo CC, YouTube, Local — unified.",
    iconBg: "rgba(139,124,255,0.10)",
    iconBorder: "rgba(139,124,255,0.22)",
    iconColor: "#8B7CFF",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
        <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>
      </svg>
    ),
  },
  {
    title: "Privacy First",
    body: "All processing is local. Nothing leaves your device.",
    iconBg: "rgba(71,212,219,0.10)",
    iconBorder: "rgba(71,212,219,0.22)",
    iconColor: "#47D4DB",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    title: "Continuous Learning",
    body: "The system refines its understanding with every session.",
    iconBg: "rgba(244,114,182,0.10)",
    iconBorder: "rgba(244,114,182,0.22)",
    iconColor: "#F472B6",
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

  // Transition state machine
  const [phase] = useState<"idle"|"spin"|"open"|"eject"|"insert"|"done">("idle");

  const handleEnter = () => {
    navigate("/room");
  };

  const isTransitioning = phase !== "idle";

  return (
    <>




      {/* ─── Root ─────────────────────────────────────────────── */}
      <div className={`lp2-root phase-${phase}`}>

        {/* Themed background: floating notes, waveform bars, face watermark */}
        <ThemeBackground noteCount={10} showAurora />

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
              <Link to="/room" className="lp2-nav-link">Studio Room</Link>
              <Link to="/dashboard" className="lp2-nav-link">AI Lab</Link>
              <Link to="/summary" className="lp2-nav-link">Blueprint</Link>
              <Link to="/profile" className="lp2-nav-link lp2-nav-link-accent">Profile</Link>
            </div>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section
          className={`lp2-hero${isTransitioning ? " fading-out" : ""}`}
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

              {/* Hero Feature Pill Highlights */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                marginTop: 48,
                flexWrap: "wrap"
              }}>
                <span style={{ fontSize: "0.82rem", color: "#5F636D", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", padding: "8px 18px", borderRadius: "999px", border: "1px solid #E5E7EC", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                  ⚡ Real-Time Emotion Match
                </span>
                <span style={{ fontSize: "0.82rem", color: "#5F636D", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", padding: "8px 18px", borderRadius: "999px", border: "1px solid #E5E7EC", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                  🎵 200+ Real Catalog Songs
                </span>
                <span style={{ fontSize: "0.82rem", color: "#5F636D", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", padding: "8px 18px", borderRadius: "999px", border: "1px solid #E5E7EC", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                  🔒 100% On-Device Privacy
                </span>
              </div>
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
                tabIndex={0}
              >
                <div
                  className="lp2-feat-icon"
                  style={{
                    background: f.iconBg,
                    border: `1px solid ${f.iconBorder}`,
                    color: f.iconColor,
                  }}
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
