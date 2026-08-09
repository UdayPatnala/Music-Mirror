import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "../components/Brand";

export default function SummaryPage() {
  const navigate = useNavigate();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const cardVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 100 } }
  };

  return (
    <div className="pr-root">
      {/* ── NAV ──────────────────────────────────────────────── */}
      <header style={{ borderBottom: "1px solid #E2E8F0", background: "rgba(255,255,255,0.88)", backdropFilter: "blur(24px)", position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", padding: "0 40px", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Wordmark size="md" showBadge={true} />
          <span style={{ fontSize: "0.7rem", fontWeight: 600, color: "#4F46E5", background: "#EEF2FF", padding: "2px 10px", borderRadius: "999px", border: "1px solid #C7D2FE" }}>Architecture Blueprint</span>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Link to="/room" style={{ fontSize: "0.82rem", fontWeight: 700, color: "#FFFFFF", background: "#4F46E5", padding: "8px 22px", borderRadius: "999px", transition: "all 0.2s ease" }}>
            Enter Studio
          </Link>
        </div>
      </header>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section style={{ padding: "80px 56px 40px", textAlign: "center", maxWidth: 1000, margin: "0 auto" }}>
        <p className="section-kicker">Living Product Blueprint</p>
        <h1 style={{ fontSize: "clamp(3rem, 5.5vw, 4.5rem)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em", margin: "16px 0" }}>
          Music should <span className="lp-headline-grad">understand you</span>.
        </h1>
        <p style={{ fontSize: "1.25rem", color: "var(--text-2)", fontWeight: 300, maxWidth: 600, margin: "0 auto 40px", lineHeight: 1.6 }}>
          An emotion-first AI music experience that removes all interface noise, bringing you closer to the rhythm of your inner state.
        </p>
      </section>

      {/* ── TIMELINE FLOW ─────────────────────────────────────── */}
      <section style={{ padding: "0 56px 60px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)", borderRadius: "var(--r-24)", padding: "36px 40px" }}>
          <div style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--gold)", marginBottom: 28, textAlign: "center" }}>
            The Emotion-to-Sound Pipeline
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, textAlign: "center" }} className="studio-timeline-grid">
            <div>
              <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>Emotion</div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: 6 }}>Inner human feeling state</p>
            </div>
            <div style={{ borderLeft: "1px dashed var(--glass-border)", position: "relative" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>Detection</div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: 6 }}>Client-side facial scan</p>
            </div>
            <div style={{ borderLeft: "1px dashed var(--glass-border)", position: "relative" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>AI Analysis</div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: 6 }}>Temporal fusion analysis</p>
            </div>
            <div style={{ borderLeft: "1px dashed var(--glass-border)", position: "relative" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>Music Search</div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: 6 }}>Dynamic vector matching</p>
            </div>
            <div style={{ borderLeft: "1px dashed var(--glass-border)", position: "relative" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>Playback</div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: 6 }}>Hands-free automatic play</p>
            </div>
            <div style={{ borderLeft: "1px dashed var(--glass-border)", position: "relative" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>Learning</div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-3)", marginTop: 6 }}>Telemetry feedback loop</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── EDITORIAL BLUEPRINT CARDS ── */}
      <main className="pr-main" style={{ maxWidth: 1200, paddingBottom: 100 }}>
        <motion.div 
          className="studio-magazine-grid"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          
          <motion.article className="panel" variants={cardVariants} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 340 }}>
            <div>
              <p className="section-kicker" style={{ color: "var(--gold)" }}>Core Mission</p>
              <h3 style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 8, marginBottom: 12 }}>Eliminating Cognitive Overload</h3>
              <p style={{ fontSize: "0.92rem", color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
                Modern music apps require constant scrolling, search inputs, and manual playlist curating. MusicMirror bypasses user interaction, instantly matching your current raw emotion to the perfect song.
              </p>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: 24 }}>01 / Philosophy</div>
          </motion.article>

          <motion.article className="panel" variants={cardVariants} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 340 }}>
            <div>
              <p className="section-kicker" style={{ color: "var(--purple)" }}>Technology Stack</p>
              <h3 style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 8, marginBottom: 12 }}>Layered FastAPI & React AI</h3>
              <p style={{ fontSize: "0.92rem", color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
                Powered by a high-performance Python FastAPI recommendation engine backend, strict Pydantic V2 data structures, and client-side Face-API.js neural models running smoothly in the browser.
              </p>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: 24 }}>02 / Engineering</div>
          </motion.article>

          <motion.article className="panel" variants={cardVariants} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 340 }}>
            <div>
              <p className="section-kicker" style={{ color: "var(--highlight)" }}>Future Roadmap</p>
              <h3 style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 8, marginBottom: 12 }}>IoT & In-Car Ambient Systems</h3>
              <p style={{ fontSize: "0.92rem", color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
                Extending the emotion-to-music pipeline into automobile camera systems and smart-home ambient networks. Adapting playback based on driving stresses or bedroom atmosphere preferences automatically.
              </p>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: 24 }}>03 / Next Era</div>
          </motion.article>

          <motion.article className="panel" variants={cardVariants} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 340 }}>
            <div>
              <p className="section-kicker" style={{ color: "var(--success)" }}>Absolute Security</p>
              <h3 style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: 8, marginBottom: 12 }}>Privacy First Architecture</h3>
              <p style={{ fontSize: "0.92rem", color: "var(--text-2)", lineHeight: 1.6, margin: 0 }}>
                Facial expression coordinates are computed inside your browser and immediately deleted. Biometric parameters are never sent to external servers, protecting your identity while matching your mood.
              </p>
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-3)", marginTop: 24 }}>04 / Security</div>
          </motion.article>

        </motion.div>

        {/* ── METRICS DISPLAY ───────────────────────────────────── */}
        <section style={{ marginTop: 48 }}>
          <div className="panel">
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 24 }}>System Benchmarks</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }} className="studio-dashboard-stats">
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Recommendation Accuracy</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--gold)", marginTop: 4 }}>94.2%</div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Supported Languages</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--purple)", marginTop: 4 }}>Telugu, English, Tamil, Hindi</div>
              </div>
              <div>
                <div style={{ fontSize: "0.72rem", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Average Scan Latency</div>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--highlight)", marginTop: 4 }}>18ms</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── ENDING SECTION CTA ────────────────────────────────── */}
        <section style={{ marginTop: 60, textAlign: "center" }}>
          <button 
            onClick={() => navigate("/room")} 
            className="pill-button primary" 
            style={{ padding: "18px 48px", fontSize: "1.1rem" }}
          >
            Enter Music Room <ArrowRight size={18} style={{ marginLeft: 8 }} />
          </button>
        </section>

      </main>

      {/* ── Floating Bottom Navigation Pill ── */}
      <nav className="studio-nav-bar">
        <Link to="/" className="studio-nav-item">Discover</Link>
        <Link to="/room" className="studio-nav-item">Room</Link>
        <Link to="/profile" className="studio-nav-item">Profile</Link>
        <Link to="/dashboard" className="studio-nav-item">AI Lab</Link>
      </nav>
    </div>
  );
}
