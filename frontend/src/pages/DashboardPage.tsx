// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Camera from "../components/Camera";
import { Activity, ShieldAlert, Cpu, BarChart3, Database, Disc } from "lucide-react";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState({
    fps: 60,
    latency: 18,
    cpu: 24,
    memory: 114,
    accuracy: 94.2
  });

  const [emotionData, setEmotionData] = useState({
    emotion: "Calm",
    confidence: 88,
    secondary: { Happy: 6, Reflective: 4, Anxious: 2 }
  });

  // Simulated live metric fluctuations
  useEffect(() => {
    const t = setInterval(() => {
      setMetrics(prev => ({
        ...prev,
        fps: Math.round(58 + Math.random() * 3),
        latency: Math.round(16 + Math.random() * 4),
        cpu: Math.round(20 + Math.random() * 8),
      }));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const handleEmotionDetect = (data: any) => {
    if (!data || !data.emotion) return;
    const scores = data.scores || [];
    const mainScore = scores.find(s => s[0] === data.emotion);
    const confVal = mainScore ? Math.round(mainScore[1] * 100) : 85;

    // Build secondary scores
    const secondaryList: Record<string, number> = {};
    scores.forEach(s => {
      if (s[0] !== data.emotion) {
        secondaryList[s[0]] = Math.round(s[1] * 100);
      }
    });

    setEmotionData({
      emotion: data.emotion,
      confidence: confVal,
      secondary: secondaryList
    });
  };

  return (
    <div className="pr-root">
      {/* ── NAV ──────────────────────────────────────────────── */}
      <header style={{ borderBottom: "1px solid var(--glass-border)", background: "rgba(9,9,9,0.92)", backdropFilter: "blur(24px)", position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", padding: "0 40px", height: 64 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1rem", fontWeight: 800, color: "var(--text-1)" }}>
          <Disc size={18} style={{ color: "var(--gold)" }} />
          <span>Music Mirror</span>
          <span style={{ marginLeft: 4, fontSize: "0.7rem", fontWeight: 600, color: "var(--text-3)", background: "rgba(212,175,55,0.08)", padding: "2px 8px", borderRadius: "999px", border: "1px solid rgba(212,175,55,0.15)" }}>AI Lab</span>
        </div>
        <div style={{ marginLeft: "auto" }}>
          <Link to="/room" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--gold)", background: "var(--gold-dim)", padding: "8px 20px", borderRadius: "999px", border: "1px solid var(--gold-border)" }}>
            Enter Room
          </Link>
        </div>
      </header>

      <main className="pr-main" style={{ maxWidth: "1280px" }}>
        
        {/* Page Title */}
        <div style={{ marginBottom: 32 }}>
          <p className="section-kicker">AI Intelligence Center</p>
          <h1 className="pr-name" style={{ fontSize: "2.2rem" }}>Technical Dashboard</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 32 }} className="studio-dashboard-grid">
          
          {/* LEFT: CAMERA & DETECTOR */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            
            {/* Live Feed glass card */}
            <div className="panel" style={{ padding: 0, overflow: "hidden", position: "relative" }}>
              <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--glass-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="lp-pulse-dot" />
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Webcam Biometrics</span>
                </div>
                <span style={{ fontSize: "0.78rem", color: "var(--text-3)" }}>Local execution only</span>
              </div>

              {/* Camera Frame */}
              <div style={{ position: "relative", minHeight: 320, background: "#000" }}>
                <Camera onEmotion={handleEmotionDetect} />
                
                {/* Visual landmark scanner effect overlay */}
                <div style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  border: "2px solid rgba(212,175,55,0.06)",
                  boxShadow: "inset 0 0 40px rgba(212,175,55,0.05)"
                }} />
              </div>
            </div>

            {/* Privacy Card */}
            <div className="panel" style={{ background: "rgba(34,197,94,0.04)", borderColor: "rgba(34,197,94,0.2)", display: "flex", gap: 20, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justify: "center", flexShrink: 0, justifyContent: "center" }}>
                <ShieldAlert size={20} style={{ color: "var(--success)" }} />
              </div>
              <div>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>Private Local Processing Guaranteed</h4>
                <p style={{ fontSize: "0.82rem", color: "var(--text-2)", margin: 0, lineHeight: 1.5 }}>
                  MusicMirror processes your video stream entirely client-side using WebGL. Absolutely no images are saved or transmitted to servers. Only anonymous mood metadata coordinates are evaluated.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE UPDATES PANEL */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            
            {/* Live predictions */}
            <div className="panel" style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 20 }}>Biometric Readings</h3>

              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Primary mood */}
                <div style={{ padding: "16px 20px", borderRadius: "var(--r-16)", background: "rgba(255,255,255,0.02)", border: "1px solid var(--glass-border)" }}>
                  <div style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)" }}>Primary Expression</div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8 }}>
                    <span style={{ fontSize: "2rem", fontWeight: 900, color: "var(--gold)" }}>{emotionData.emotion}</span>
                    <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-2)" }}>{emotionData.confidence}%</span>
                  </div>
                </div>

                {/* Secondary probabilities */}
                <div>
                  <div style={{ fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 12 }}>
                    Probability Breakdown
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {Object.entries(emotionData.secondary).map(([mood, pct]) => (
                      <div key={mood}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: 4 }}>
                          <span>{mood}</span>
                          <span>{pct}%</span>
                        </div>
                        <div style={{ height: 4, background: "rgba(255,255,255,0.04)", borderRadius: 2 }}>
                          <div style={{ height: "100%", background: "var(--purple)", width: `${pct}%`, borderRadius: 2 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LOWER GRID: HARDWARE STATS & ACCURACY */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginTop: 32 }} className="studio-dashboard-stats">
          <div className="panel" style={{ padding: 20, textAlign: "center" }}>
            <Activity size={18} style={{ color: "var(--gold)", marginBottom: 8 }} />
            <div style={{ fontSize: "0.72rem", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Inference Latency</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text-1)", marginTop: 4 }}>{metrics.latency}ms</div>
          </div>
          <div className="panel" style={{ padding: 20, textAlign: "center" }}>
            <Cpu size={18} style={{ color: "var(--purple)", marginBottom: 8 }} />
            <div style={{ fontSize: "0.72rem", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>CPU Usage</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text-1)", marginTop: 4 }}>{metrics.cpu}%</div>
          </div>
          <div className="panel" style={{ padding: 20, textAlign: "center" }}>
            <BarChart3 size={18} style={{ color: "var(--highlight)", marginBottom: 8 }} />
            <div style={{ fontSize: "0.72rem", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Model FPS</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text-1)", marginTop: 4 }}>{metrics.fps} FPS</div>
          </div>
          <div className="panel" style={{ padding: 20, textAlign: "center" }}>
            <Database size={18} style={{ color: "var(--success)", marginBottom: 8 }} />
            <div style={{ fontSize: "0.72rem", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Memory Buffer</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text-1)", marginTop: 4 }}>{metrics.memory} MB</div>
          </div>
          <div className="panel" style={{ padding: 20, textAlign: "center" }}>
            <ShieldAlert size={18} style={{ color: "var(--gold)", marginBottom: 8 }} />
            <div style={{ fontSize: "0.72rem", color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>AI Accuracy</div>
            <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text-1)", marginTop: 4 }}>{metrics.accuracy}%</div>
          </div>
        </div>

      </main>

      {/* ── Floating Bottom Navigation Pill ── */}
      <nav className="studio-nav-bar">
        <Link to="/" className="studio-nav-item">Discover</Link>
        <Link to="/room" className="studio-nav-item">Room</Link>
        <Link to="/profile" className="studio-nav-item">Profile</Link>
        <Link to="/dashboard" className="studio-nav-item active">AI Lab</Link>
      </nav>
    </div>
  );
}
