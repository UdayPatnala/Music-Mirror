import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import CustomDropdown from "../components/CustomDropdown";
import type { UserProfile } from "../types";

const genreOptions = ["Pop", "Acoustic", "Rock", "Lo-fi", "Indie"];
const goalOptions = [
  "Match my mood",
  "Lift my energy",
  "Help me focus",
  "Calm things down",
];

const LANGUAGES = [
  { code: "te", label: "తెలుగు", english: "Telugu", color: "#f97316" },
  { code: "en", label: "English", english: "English", color: "#a855f7" },
  { code: "ta", label: "தமிழ்", english: "Tamil", color: "#06b6d4" },
  { code: "hi", label: "हिंदी", english: "Hindi", color: "#ec4899" },
];

const FEATURE_BADGES = [
  { icon: "👁️", text: "Live Face Scan" },
  { icon: "🧠", text: "Emotion AI" },
  { icon: "🎵", text: "Instant Playback" },
  { icon: "🌐", text: "Multi-Language" },
];

// Animated audio wave bars component
function AudioBars({ count = 32, active = true }: { count?: number; active?: boolean }) {
  return (
    <div className="lp-audio-bars" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="lp-bar"
          style={{
            animationDelay: `${(i * 0.07).toFixed(2)}s`,
            animationDuration: `${(0.8 + Math.random() * 0.7).toFixed(2)}s`,
            opacity: active ? 1 : 0.15,
          }}
        />
      ))}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const setProfile = useAppStore((s) => s.setProfile);

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(
    ["Telugu", "English", "Tamil", "Hindi"]
  );
  const [showProfile, setShowProfile] = useState(false);
  const [form, setForm] = useState<UserProfile>({
    name: "Listener",
    email: "user@musicmirror.ai",
    genre: "Pop",
    goal: "Match my mood",
    languages: ["Telugu", "English", "Tamil", "Hindi"],
  });

  // Rotating tagline
  const taglines = [
    "The app that knows your mood before you do.",
    "Music that matches your face, not your playlist.",
    "Emotion-driven. Hands-free. Beautifully immersive.",
    "Your face is the remote control.",
  ];
  const [taglineIdx, setTaglineIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTaglineIdx((i) => (i + 1) % taglines.length), 3500);
    return () => clearInterval(t);
  }, []);

  const toggleLanguage = (english: string) => {
    setSelectedLanguages((prev) => {
      const next = prev.includes(english)
        ? prev.filter((l) => l !== english)
        : [...prev, english];
      return next.length > 0 ? next : [english];
    });
  };

  const handleGuestEntry = () => {
    setProfile({
      ...form,
      name: "Guest Listener",
      languages: selectedLanguages,
    });
    navigate("/room");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile({
      ...form,
      name: form.name.trim() || "Listener",
      email: form.email.trim() || "user@musicmirror.ai",
      languages: selectedLanguages,
    });
    navigate("/room");
  };

  return (
    <div className="lp-root">
      {/* ── Ambient background layers ── */}
      <div className="lp-bg-orb lp-orb-1" />
      <div className="lp-bg-orb lp-orb-2" />
      <div className="lp-bg-orb lp-orb-3" />
      <div className="lp-grid-overlay" aria-hidden />

      {/* ── Top nav ── */}
      <header className="lp-nav">
        <div className="lp-brand">
          <span className="lp-brand-icon">🪞</span>
          <span className="lp-brand-name">Music Mirror</span>
          <span className="lp-brand-v2">V2</span>
        </div>
        <div className="lp-nav-badge">
          <span className="lp-pulse-dot" />
          AI · Live · Emotion-Driven
        </div>
      </header>

      {/* ── Hero ── */}
      <main className="lp-hero">
        <motion.div
          className="lp-hero-content"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Kicker */}
          <div className="lp-kicker">
            <span className="lp-kicker-dot" />
            AI Emotion Music Companion
          </div>

          {/* Main headline */}
          <h1 className="lp-headline">
            The App That{" "}
            <span className="lp-headline-grad">Understands You</span>
            <br />
            Before You Ask.
          </h1>

          {/* Rotating tagline */}
          <div className="lp-tagline-container">
            <AnimatePresence mode="wait">
              <motion.p
                key={taglineIdx}
                className="lp-tagline"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
              >
                {taglines[taglineIdx]}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Feature pills */}
          <div className="lp-feature-pills">
            {FEATURE_BADGES.map((b) => (
              <div key={b.text} className="lp-feature-pill">
                <span>{b.icon}</span>
                <span>{b.text}</span>
              </div>
            ))}
          </div>

          {/* Audio wave visualizer */}
          <div className="lp-visualizer">
            <AudioBars count={40} active />
          </div>

          {/* Language priority selector */}
          <div className="lp-lang-section">
            <div className="lp-lang-label">
              <span>🌐</span>
              <span>Preferred Language Priority</span>
            </div>
            <div className="lp-lang-chips">
              {LANGUAGES.map((lang, _idx) => {
                const isSelected = selectedLanguages.includes(lang.english);
                const priority = selectedLanguages.indexOf(lang.english) + 1;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLanguage(lang.english)}
                    className={`lp-lang-chip ${isSelected ? "lp-lang-chip--active" : ""}`}
                    style={isSelected ? ({ "--chip-color": lang.color } as React.CSSProperties) : {}}
                  >
                    {isSelected && (
                      <span className="lp-lang-priority">{priority}</span>
                    )}
                    <span className="lp-lang-native">{lang.label}</span>
                    <span className="lp-lang-en">{lang.english}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary CTA */}
          <motion.button
            type="button"
            onClick={handleGuestEntry}
            className="lp-cta-btn"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="lp-cta-icon">▶</span>
            <span>Try Now — Instant Hands-Free</span>
            <span className="lp-cta-arrow">→</span>
          </motion.button>

          <p className="lp-cta-note">No sign-up required · Camera permission needed for AI scan</p>

          {/* Optional profile toggle */}
          <button
            type="button"
            className="lp-profile-toggle"
            onClick={() => setShowProfile((v) => !v)}
          >
            {showProfile ? "▲" : "▼"} Personalize Profile &amp; Preferences
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35 }}
                style={{ overflow: "hidden" }}
              >
                <form onSubmit={handleSubmit} className="lp-profile-form">
                  <div className="lp-form-row">
                    <div className="lp-form-group">
                      <label>Display Name</label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                        className="lp-input"
                        placeholder="Your name"
                      />
                    </div>
                    <div className="lp-form-group">
                      <label>Email</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                        className="lp-input"
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div className="lp-form-row">
                    <CustomDropdown
                      label="Favorite Genre"
                      options={genreOptions}
                      value={form.genre}
                      onChange={(val) => setForm((p) => ({ ...p, genre: val }))}
                    />
                    <CustomDropdown
                      label="Primary Goal"
                      options={goalOptions}
                      value={form.goal}
                      onChange={(val) => setForm((p) => ({ ...p, goal: val }))}
                    />
                  </div>
                  <button type="submit" className="lp-save-btn">
                    Save Profile &amp; Enter Room
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right panel: visual identity */}
        <motion.div
          className="lp-visual-panel"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Vinyl record */}
          <div className="lp-vinyl">
            <div className="lp-vinyl-outer">
              <div className="lp-vinyl-groove lp-groove-1" />
              <div className="lp-vinyl-groove lp-groove-2" />
              <div className="lp-vinyl-groove lp-groove-3" />
              <div className="lp-vinyl-center">
                <span>🪞</span>
              </div>
            </div>
          </div>

          {/* Floating emotion cards */}
          <motion.div
            className="lp-float-card lp-float-card--1"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <span className="lp-float-emoji">😊</span>
            <div>
              <div className="lp-float-label">Detected Mood</div>
              <div className="lp-float-value">Happy</div>
            </div>
          </motion.div>

          <motion.div
            className="lp-float-card lp-float-card--2"
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 }}
          >
            <span className="lp-float-emoji">🎵</span>
            <div>
              <div className="lp-float-label">Now Playing</div>
              <div className="lp-float-value">Nuvvante Naa Jeevanam</div>
            </div>
          </motion.div>

          <motion.div
            className="lp-float-card lp-float-card--3"
            animate={{ y: [0, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
          >
            <span className="lp-float-emoji">🌐</span>
            <div>
              <div className="lp-float-label">Language</div>
              <div className="lp-float-value">Telugu · English</div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
