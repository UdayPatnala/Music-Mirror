import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import CustomDropdown from "../components/CustomDropdown";
import { Sparkles, BrainCircuit, AudioWaveform, Globe, Play } from "lucide-react";
import type { UserProfile } from "../types";

const genreOptions = ["Pop", "Acoustic", "Rock", "Lo-fi", "Indie"];
const goalOptions = [
  "Match my mood",
  "Lift my energy",
  "Help me focus",
  "Calm things down",
];

const availableLanguages = ["Telugu", "English", "Tamil", "Hindi"];

export default function LandingPage() {
  const navigate = useNavigate();
  const setProfile = useAppStore((state) => state.setProfile);

  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["Telugu", "English", "Tamil", "Hindi"]);

  const [form, setForm] = useState<UserProfile>({
    name: "Listener",
    email: "user@musicmirror.ai",
    genre: "Pop",
    goal: "Match my mood",
    languages: ["Telugu", "English", "Tamil", "Hindi"]
  });

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) => {
      const next = prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang];
      return next.length > 0 ? next : [lang];
    });
  };

  const handleGuestEntry = () => {
    const guestProfile: UserProfile = {
      ...form,
      name: "Guest Listener",
      languages: selectedLanguages
    };
    setProfile(guestProfile);
    navigate("/room");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const userProfile: UserProfile = {
      ...form,
      name: form.name.trim() || "Listener",
      email: form.email.trim() || "user@musicmirror.ai",
      languages: selectedLanguages
    };
    setProfile(userProfile);
    navigate("/room");
  };

  return (
    <div className="landing-page-wrapper">
      <motion.div 
        className="landing-hero-card glass-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="brand-badge-pill" style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(168, 85, 247, 0.15)", border: "1px solid rgba(168, 85, 247, 0.3)", padding: "6px 16px", borderRadius: "20px", marginBottom: "20px" }}>
          <Sparkles size={16} color="#a855f7" />
          <span style={{ color: "#c084fc", fontSize: "0.85rem", fontWeight: 600 }}>AI Emotion-Driven Music Companion</span>
        </div>

        <h1 className="hero-title" style={{ fontSize: "2.8rem", fontWeight: 800, lineHeight: 1.15, marginBottom: "16px", background: "linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          The App That Understands You Before You Ask.
        </h1>

        <p className="hero-description" style={{ color: "#94a3b8", fontSize: "1.05rem", lineHeight: 1.6, marginBottom: "24px", maxWidth: "560px" }}>
          Music Mirror reads your real-time facial expression, selects appropriate acoustic tracks across your preferred languages, and begins playback automatically with minimal effort.
        </p>

        {/* LANGUAGE SELECTION BLOCK */}
        <div className="language-selector-section" style={{ background: "rgba(15, 23, 42, 0.5)", padding: "16px 20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <Globe size={18} color="#0ea5e9" />
            <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#cbd5e1" }}>Preferred Languages Priority</span>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            {availableLanguages.map((lang, idx) => {
              const isSelected = selectedLanguages.includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleLanguage(lang)}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: isSelected ? "1px solid #0ea5e9" : "1px solid rgba(255,255,255,0.1)",
                    background: isSelected ? "rgba(14, 165, 233, 0.2)" : "rgba(255,255,255,0.03)",
                    color: isSelected ? "#38bdf8" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <span>{idx + 1}. {lang}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PRIMARY CTA & GUEST ENTRY */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <button 
            type="button"
            onClick={handleGuestEntry}
            className="pill-button primary" 
            style={{ flex: 1, padding: "14px", fontSize: "1rem", fontWeight: 700, borderRadius: "12px", background: "linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          >
            <Play size={20} fill="currentColor" /> Try Now (Instant Hands-Free)
          </button>
        </div>

        {/* OPTIONAL PROFILE FORM */}
        <details style={{ marginTop: "16px", textDecoration: "none" }}>
          <summary style={{ cursor: "pointer", color: "#94a3b8", fontSize: "0.85rem", outline: "none", marginBottom: "12px" }}>
            Optional: Personalize Profile & Preferences
          </summary>

          <form onSubmit={handleSubmit} className="landing-form-box" style={{ background: "rgba(15, 23, 42, 0.6)", padding: "20px", borderRadius: "14px", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>Display Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="input-field"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="input-field"
                  style={{ width: "100%", padding: "10px", borderRadius: "8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <CustomDropdown
                label="Favorite Genre"
                options={genreOptions}
                value={form.genre}
                onChange={(val) => setForm((prev) => ({ ...prev, genre: val }))}
              />
              <CustomDropdown
                label="Primary Goal"
                options={goalOptions}
                value={form.goal}
                onChange={(val) => setForm((prev) => ({ ...prev, goal: val }))}
              />
            </div>

            <button type="submit" className="pill-button" style={{ padding: "12px", fontSize: "0.95rem", borderRadius: "10px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", cursor: "pointer" }}>
              Save Profile & Enter Room
            </button>
          </form>
        </details>

        <div className="features-strip" style={{ display: "flex", gap: "24px", marginTop: "24px", justifyContent: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#64748b" }}>
            <BrainCircuit size={16} color="#0ea5e9" /> Biometric AI Vision
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#64748b" }}>
            <AudioWaveform size={16} color="#a855f7" /> Spectrum Visualizer
          </div>
        </div>
      </motion.div>
    </div>
  );
}
