import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import type { Song, UserProfile } from "../types";
import { Music, Heart, BarChart3, Sparkles, ArrowRight, ShieldCheck, Plus, Trash2 } from "lucide-react";

const PRESET_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
];

const DEFAULT_ARTISTS = [
  "Sid Sriram", "Armaan Malik", "The Weeknd", "Dua Lipa", "Arijit Singh", "Anirudh Ravichander", "Harry Styles"
];

const DEFAULT_SAVED_SONGS: Song[] = [
  { title: "Buttabomma", artist: "Armaan Malik", genre: "Telugu Pop", language: "Telugu" },
  { title: "Samajavaragamana", artist: "Sid Sriram", genre: "Telugu Soul", language: "Telugu" },
  { title: "Blinding Lights", artist: "The Weeknd", genre: "Synthpop", language: "English" },
  { title: "Tum Hi Ho", artist: "Arijit Singh", genre: "Bollywood Ballad", language: "Hindi" },
  { title: "Rowdy Baby", artist: "Dhanush & Dhee", genre: "Tamil Dance", language: "Tamil" },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);

  const [isEditing, setIsEditing] = useState(!profile);
  const [newArtist, setNewArtist] = useState("");

  const [form, setForm] = useState<UserProfile>({
    name: profile?.name || "Patnala Uday Kumar",
    email: profile?.email || "uday@musicmirror.ai",
    genre: profile?.genre || "Telugu Pop",
    goal: profile?.goal || "Match my mood",
    languages: profile?.languages || ["Telugu", "English", "Tamil", "Hindi"],
    avatarUrl: profile?.avatarUrl || PRESET_AVATARS[0],
    favoriteArtists: profile?.favoriteArtists || DEFAULT_ARTISTS,
    savedSongs: profile?.savedSongs || DEFAULT_SAVED_SONGS,
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(form);
    setIsEditing(false);
  };

  const handleAddArtist = () => {
    if (!newArtist.trim()) return;
    const updated = [...(form.favoriteArtists || []), newArtist.trim()];
    const newForm = { ...form, favoriteArtists: updated };
    setForm(newForm);
    setProfile(newForm);
    setNewArtist("");
  };

  const handleRemoveArtist = (artistName: string) => {
    const updated = (form.favoriteArtists || []).filter((a) => a !== artistName);
    const newForm = { ...form, favoriteArtists: updated };
    setForm(newForm);
    setProfile(newForm);
  };

  const handleRemoveSavedSong = (songTitle: string) => {
    const updated = (form.savedSongs || []).filter((s) => (s.title || s.name) !== songTitle);
    const newForm = { ...form, savedSongs: updated };
    setForm(newForm);
    setProfile(newForm);
  };

  const moodDistribution = [
    { mood: "happy", label: "Happy / Upbeat", percent: 45, color: "#f59e0b", emoji: "😊" },
    { mood: "neutral", label: "Calm / Steady", percent: 25, color: "#8b5cf6", emoji: "😐" },
    { mood: "sad", label: "Reflective / Sad", percent: 15, color: "#3b82f6", emoji: "😔" },
    { mood: "surprise", label: "Surprised / Energized", percent: 10, color: "#06b6d4", emoji: "😲" },
    { mood: "angry", label: "Intense / Passionate", percent: 5, color: "#ef4444", emoji: "😤" },
  ];

  return (
    <div className="room-root" style={{ overflowY: "auto" }}>
      {/* NAV HEADER */}
      <header className="room-nav">
        <div className="room-brand">
          <span className="room-brand-icon">🪞</span>
          <span className="room-brand-name">Music Mirror</span>
          <span className="room-brand-v2">V2</span>
        </div>

        <nav className="room-nav-tabs">
          <Link to="/room" className="room-nav-tab">🎵 Music Room</Link>
          <Link to="/profile" className="room-nav-tab active">👤 Profile & Analytics</Link>
          <Link to="/summary" className="room-nav-tab">📊 Project Summary</Link>
        </nav>

        <div className="room-nav-end">
          <Link to="/room" className="room-nav-link">Enter Room →</Link>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: "1120px", margin: "0 auto", padding: "32px 24px 64px", width: "100%" }}>
        
        {/* HERO PROFILE HEADER */}
        <section className="panel" style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <img
                src={form.avatarUrl || PRESET_AVATARS[0]}
                alt="Profile Avatar"
                style={{ width: "90px", height: "90px", borderRadius: "50%", border: "3px solid rgba(168,85,247,0.5)", objectFit: "cover" }}
              />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <h1 style={{ fontSize: "1.8rem", fontWeight: "800", color: "#f1f5f9", margin: 0 }}>{form.name}</h1>
                  <span style={{ fontSize: "0.7rem", padding: "2px 8px", borderRadius: "999px", background: "rgba(34,197,94,0.15)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", gap: "4px" }}>
                    <ShieldCheck size={12} /> Active Member
                  </span>
                </div>
                <p style={{ color: "#94a3b8", fontSize: "0.9rem", margin: "0 0 10px" }}>{form.email}</p>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <span className="live-badge" style={{ background: "rgba(168,85,247,0.15)", color: "#c4b5fd" }}>🎵 {form.genre}</span>
                  <span className="live-badge" style={{ background: "rgba(6,182,212,0.15)", color: "#67e8f9" }}>🎯 {form.goal}</span>
                  {form.languages?.map((lang) => (
                    <span key={lang} className="live-badge" style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8" }}>{lang}</span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                className="pill-button primary"
                onClick={() => setIsEditing((v) => !v)}
                type="button"
                style={{ padding: "10px 20px" }}
              >
                {isEditing ? "Cancel Edit" : "Edit Profile / Sign Up"}
              </button>
              <button
                className="pill-button secondary"
                onClick={() => navigate("/room")}
                type="button"
                style={{ padding: "10px 20px" }}
              >
                Enter Music Room <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>

        {/* EDIT PROFILE / SIGN UP FORM */}
        {isEditing && (
          <section className="panel" style={{ marginBottom: "32px", border: "1px solid rgba(168,85,247,0.3)", background: "rgba(168,85,247,0.04)" }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: "700", marginBottom: "16px", color: "#f1f5f9" }}>
              👤 Update Profile Details & Preferences
            </h2>
            
            <form onSubmit={handleSaveProfile} className="auth-form" style={{ background: "transparent", border: "none", padding: 0 }}>
              <div className="lp-form-row">
                <div className="lp-form-group">
                  <label>Full Display Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="lp-input"
                    required
                  />
                </div>
                <div className="lp-form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="lp-input"
                    required
                  />
                </div>
              </div>

              <div className="lp-form-row">
                <div className="lp-form-group">
                  <label>Preferred Music Genre</label>
                  <select
                    value={form.genre}
                    onChange={(e) => setForm((p) => ({ ...p, genre: e.target.value }))}
                    className="lp-input"
                  >
                    <option value="Telugu Pop">Telugu Pop</option>
                    <option value="Pop">Pop</option>
                    <option value="Synthpop">Synthpop</option>
                    <option value="Bollywood Ballad">Bollywood Ballad</option>
                    <option value="Tamil Dance">Tamil Dance</option>
                    <option value="Rock">Rock</option>
                    <option value="Lo-Fi">Lo-Fi</option>
                  </select>
                </div>
                <div className="lp-form-group">
                  <label>Primary Cognitive Goal</label>
                  <select
                    value={form.goal}
                    onChange={(e) => setForm((p) => ({ ...p, goal: e.target.value }))}
                    className="lp-input"
                  >
                    <option value="Match my mood">Match my mood</option>
                    <option value="lift">Lift my mood</option>
                    <option value="relax">Relax & Unwind</option>
                    <option value="focus">Deep Focus</option>
                  </select>
                </div>
              </div>

              <div style={{ marginTop: "12px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#64748b", marginBottom: "8px" }}>Choose Avatar</label>
                <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                  {PRESET_AVATARS.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Avatar preset ${idx}`}
                      onClick={() => setForm((p) => ({ ...p, avatarUrl: url }))}
                      style={{
                        width: "56px",
                        height: "56px",
                        borderRadius: "50%",
                        cursor: "pointer",
                        border: form.avatarUrl === url ? "3px solid #a855f7" : "2px solid rgba(255,255,255,0.1)",
                        transform: form.avatarUrl === url ? "scale(1.1)" : "scale(1)",
                        transition: "all 0.2s",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
                <button type="submit" className="auth-submit" style={{ padding: "12px 28px" }}>
                  Save Profile Settings
                </button>
                <button type="button" className="ghost-btn" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* TWO-COLUMN ANALYTICS & FAVORITES */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>

          {/* LEFT COLUMN: MOOD SWING ANALYTICS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <section className="panel">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#f1f5f9", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <BarChart3 size={20} color="#a855f7" /> Mood Swing Analytics
                </h3>
                <span style={{ fontSize: "0.76rem", color: "#64748b" }}>Past 30 Sessions</span>
              </div>

              <p style={{ fontSize: "0.88rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: "20px" }}>
                Your real-time facial expression frequency breakdown across all biometric emotion detection runs:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {moodDistribution.map((item) => (
                  <div key={item.mood}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", marginBottom: "6px" }}>
                      <span style={{ color: "#cbd5e1", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>{item.emoji}</span> {item.label}
                      </span>
                      <strong style={{ color: item.color }}>{item.percent}%</strong>
                    </div>
                    <div style={{ height: "8px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                      <div
                        style={{
                          height: "100%",
                          width: `${item.percent}%`,
                          borderRadius: "999px",
                          background: item.color,
                          boxShadow: `0 0 10px ${item.color}`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: "24px", padding: "14px", borderRadius: "12px", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "#e9d5ff", lineHeight: 1.5 }}>
                  💡 <strong>Emotional Insight:</strong> Your primary emotional state is <strong>Happy / Upbeat (45%)</strong>. The system automatically boosts energetic Telugu & Synthpop tracks during morning runs.
                </p>
              </div>
            </section>

            {/* FAVORITE ARTISTS */}
            <section className="panel">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#f1f5f9", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Sparkles size={20} color="#06b6d4" /> Favorite Artists
                </h3>
                <span style={{ fontSize: "0.76rem", color: "#64748b" }}>{form.favoriteArtists?.length || 0} Artists</span>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
                {form.favoriteArtists?.map((artist) => (
                  <span
                    key={artist}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "7px 14px",
                      borderRadius: "999px",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      fontSize: "0.86rem",
                      color: "#e2e8f0",
                    }}
                  >
                    <span>🎤 {artist}</span>
                    <button
                      onClick={() => handleRemoveArtist(artist)}
                      style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: 0, display: "flex" }}
                      title="Remove artist"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <input
                  type="text"
                  placeholder="Add new artist (e.g. A.R. Rahman)"
                  value={newArtist}
                  onChange={(e) => setNewArtist(e.target.value)}
                  className="lp-input"
                  style={{ flex: 1, padding: "8px 14px", fontSize: "0.85rem" }}
                />
                <button
                  type="button"
                  onClick={handleAddArtist}
                  className="pill-button primary"
                  style={{ padding: "8px 16px", fontSize: "0.82rem" }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: SAVED SONGS & RECENT ACTIVITY */}
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            
            {/* SAVED & MOST PLAYED SONGS */}
            <section className="panel">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "1.2rem", fontWeight: "700", color: "#f1f5f9", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <Heart size={20} color="#ec4899" /> Saved & Favorite Songs
                </h3>
                <span style={{ fontSize: "0.76rem", color: "#64748b" }}>{form.savedSongs?.length || 0} Tracks</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {form.savedSongs?.map((song, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "12px",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div>
                      <h4 style={{ margin: "0 0 2px", fontSize: "0.92rem", fontWeight: "600", color: "#e2e8f0" }}>
                        {song.title || song.name}
                      </h4>
                      <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                        {song.artist} • <span style={{ color: "#a855f7" }}>{song.language || "Telugu"}</span>
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <button
                        className="pill-button primary small"
                        onClick={() => navigate("/room")}
                        style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                      >
                        Play
                      </button>
                      <button
                        onClick={() => handleRemoveSavedSong(song.title || song.name || "")}
                        style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", padding: "4px" }}
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* QUICK LINK TO SUMMARY PAGE */}
            <section className="panel" style={{ borderLeft: "4px solid #06b6d4", background: "rgba(6,182,212,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
                <Music size={24} color="#06b6d4" />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700", color: "#f1f5f9" }}>
                  Project Final Summary
                </h3>
              </div>
              <p style={{ fontSize: "0.86rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: "16px" }}>
                Inspect the complete BTech Final Project Abstract, Architecture comparisons, and long-term ecosystem roadmap on the final summary page.
              </p>
              <Link to="/summary" className="pill-button secondary" style={{ width: "100%", justifyContent: "center" }}>
                View Project Summary →
              </Link>
            </section>

          </div>
        </div>

      </main>
    </div>
  );
}
