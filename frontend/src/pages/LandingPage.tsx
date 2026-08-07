import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import CustomDropdown from "../components/CustomDropdown";
import { Sparkles, BrainCircuit, AudioWaveform } from "lucide-react";
import type { UserProfile } from "../types";

const genreOptions = ["Pop", "Acoustic", "Rock", "Lo-fi", "Indie"];
const goalOptions = [
  "Match my mood",
  "Lift my energy",
  "Help me focus",
  "Calm things down",
];

export default function LandingPage() {
  const navigate = useNavigate();
  const setProfile = useAppStore((state) => state.setProfile);

  const [form, setForm] = useState<UserProfile>({
    name: "Listener",
    email: "user@musicmirror.ai",
    genre: "Pop",
    goal: "Match my mood",
  });

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedName = form.name.trim() || "Listener";
    const trimmedEmail = form.email.trim() || "user@musicmirror.ai";

    const userProfile: UserProfile = {
      ...form,
      name: trimmedName,
      email: trimmedEmail,
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
          <span style={{ color: "#c084fc", fontSize: "0.85rem", fontWeight: 600 }}>AI Biometric Sound Studio</span>
        </div>

        <h1 className="hero-title" style={{ fontSize: "2.8rem", fontWeight: 800, lineHeight: 1.15, marginBottom: "16px", background: "linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Music That Mirror Your Emotions in Real-Time.
        </h1>

        <p className="hero-description" style={{ color: "#94a3b8", fontSize: "1.05rem", lineHeight: 1.6, marginBottom: "32px", maxWidth: "540px" }}>
          Connect your camera for live facial emotion mapping, explore local disk audio files, or launch automated acoustic mood transitions.
        </p>

        <form onSubmit={handleSubmit} className="landing-form-box" style={{ background: "rgba(15, 23, 42, 0.6)", padding: "24px", borderRadius: "16px", border: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>Your Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="input-field"
                style={{ width: "100%", padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", color: "#94a3b8", marginBottom: "6px" }}>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="input-field"
                style={{ width: "100%", padding: "12px", borderRadius: "10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
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

          <button type="submit" className="pill-button primary" style={{ marginTop: "12px", width: "100%", padding: "14px", fontSize: "1rem", fontWeight: 700, borderRadius: "12px", background: "linear-gradient(135deg, #0ea5e9 0%, #a855f7 100%)", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <AudioWaveform size={20} /> Launch Music Mirror
          </button>
        </form>

        <div className="features-strip" style={{ display: "flex", gap: "24px", marginTop: "32px", justifyContent: "center" }}>
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
