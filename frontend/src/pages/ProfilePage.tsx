import React, { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import type { Song, UserProfile } from "../types";
import { BarChart3, Heart, Sparkles, ArrowRight, ShieldCheck, Plus, Trash2, Upload } from "lucide-react";

/* ── AI-generated default avatars (5 themes) ─────────────────── */
const AI_AVATARS = [
  { src: "/avatars/av_gold.jpg",     label: "Royal Gold"   },
  { src: "/avatars/av_sapphire.jpg", label: "Sapphire"     },
  { src: "/avatars/av_purple.jpg",   label: "Royal Purple" },
  { src: "/avatars/av_emerald.jpg",  label: "Emerald"      },
  { src: "/avatars/av_crimson.jpg",  label: "Crimson"      },
];

const DEFAULT_ARTISTS = [
  "Sid Sriram", "Armaan Malik", "The Weeknd", "Dua Lipa",
  "Arijit Singh", "Anirudh Ravichander", "Harry Styles",
];

const DEFAULT_SAVED: Song[] = [
  { title: "Buttabomma",       artist: "Armaan Malik",  genre: "Telugu Pop",      language: "Telugu"  },
  { title: "Samajavaragamana", artist: "Sid Sriram",    genre: "Telugu Soul",     language: "Telugu"  },
  { title: "Blinding Lights",  artist: "The Weeknd",    genre: "Synthpop",        language: "English" },
  { title: "Tum Hi Ho",        artist: "Arijit Singh",  genre: "Bollywood Ballad",language: "Hindi"   },
  { title: "Rowdy Baby",       artist: "Dhanush & Dhee",genre: "Tamil Dance",     language: "Tamil"   },
];

const LANG_COLOR: Record<string, string> = {
  Telugu:  "var(--gold)",
  English: "var(--sapphire-lt)",
  Tamil:   "var(--emerald-lt)",
  Hindi:   "var(--purple-lt)",
};

const ART_COLORS = [
  "linear-gradient(135deg,#D4AF37,#FFD56A)",
  "linear-gradient(135deg,#2563EB,#60A5FA)",
  "linear-gradient(135deg,#7E22CE,#C084FC)",
  "linear-gradient(135deg,#16A34A,#34D399)",
  "linear-gradient(135deg,#B91C1C,#EF4444)",
  "linear-gradient(135deg,#B87333,#D99058)",
];
function artBg(title: string): string {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) & 0xffffffff;
  return ART_COLORS[Math.abs(h) % ART_COLORS.length];
}

const MOOD_DIST = [
  { label: "Happy",        percent: 45, color: "#D4AF37" },
  { label: "Calm",         percent: 25, color: "#7E22CE" },
  { label: "Reflective",   percent: 15, color: "#2563EB" },
  { label: "Surprised",    percent: 10, color: "#16A34A" },
  { label: "Intense",      percent:  5, color: "#B91C1C" },
];

export default function ProfilePage() {
  const navigate  = useNavigate();
  const profile   = useAppStore(s => s.profile);
  const setProfile = useAppStore(s => s.setProfile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(!profile);
  const [newArtist, setNewArtist] = useState("");

  const [form, setForm] = useState<UserProfile>({
    name:            profile?.name            || "Patnala Uday Kumar",
    email:           profile?.email           || "uday@musicmirror.ai",
    genre:           profile?.genre           || "Telugu Pop",
    goal:            profile?.goal            || "Match my mood",
    languages:       profile?.languages       || ["Telugu", "English", "Tamil", "Hindi"],
    avatarUrl:       profile?.avatarUrl       || AI_AVATARS[0].src,
    favoriteArtists: profile?.favoriteArtists || DEFAULT_ARTISTS,
    savedSongs:      profile?.savedSongs      || DEFAULT_SAVED,
  });

  /* Local file profile picture */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const updated = { ...form, avatarUrl: url };
    setForm(updated);
    setProfile(updated);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile(form);
    setIsEditing(false);
  };

  const handleAddArtist = () => {
    if (!newArtist.trim()) return;
    const updated = { ...form, favoriteArtists: [...(form.favoriteArtists || []), newArtist.trim()] };
    setForm(updated); setProfile(updated); setNewArtist("");
  };

  const handleRemoveArtist = (name: string) => {
    const updated = { ...form, favoriteArtists: (form.favoriteArtists || []).filter(a => a !== name) };
    setForm(updated); setProfile(updated);
  };

  const handleRemoveSong = (title: string) => {
    const updated = { ...form, savedSongs: (form.savedSongs || []).filter(s => (s.title || s.name) !== title) };
    setForm(updated); setProfile(updated);
  };

  return (
    <div className="pr-root">
      {/* ── NAV ──────────────────────────────────────────────── */}
      <header className="room-nav">
        <div className="room-brand">
          <span className="room-brand-icon">🪞</span>
          <span className="room-brand-name">Music Mirror</span>
          <span className="room-brand-v2">V2</span>
        </div>
        <nav className="room-nav-tabs">
          <Link to="/room"    className="room-nav-tab">Music Room</Link>
          <Link to="/profile" className="room-nav-tab active">Profile</Link>
          <Link to="/summary" className="room-nav-tab">Summary</Link>
        </nav>
        <div className="room-nav-end">
          <button className="pill-button primary small" onClick={() => navigate("/room")} type="button">
            Enter Room <ArrowRight size={14} />
          </button>
        </div>
      </header>

      <main className="pr-main">

        {/* ── PROFILE HERO ─────────────────────────────────── */}
        <section className="pr-hero">
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {/* Avatar — click to upload */}
            <div className="pr-avatar-wrap" onClick={() => fileInputRef.current?.click()} title="Click to change photo">
              <img src={form.avatarUrl || AI_AVATARS[0].src} alt="Profile" className="pr-avatar" />
              <div className="pr-avatar-overlay">Change Photo</div>
              <input ref={fileInputRef} type="file" accept="image/*" className="pr-avatar-input" onChange={handleFileSelect} />
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <h1 className="pr-name">{form.name}</h1>
                <span className="pr-badge pr-badge-success">
                  <ShieldCheck size={11} /> Active
                </span>
              </div>
              <p className="pr-email">{form.email}</p>
              <div>
                <span className="pr-badge pr-badge-gold">{form.genre}</span>
                <span className="pr-badge pr-badge-sapp">{form.goal}</span>
                {form.languages?.map(l => (
                  <span key={l} className="pr-badge pr-badge-neutral">{l}</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="pill-button secondary" onClick={() => setIsEditing(v => !v)} type="button">
              {isEditing ? "Cancel" : "Edit Profile"}
            </button>
            <button className="pill-button primary" onClick={() => navigate("/room")} type="button">
              Music Room <ArrowRight size={15} />
            </button>
          </div>
        </section>

        {/* ── EDIT / SIGNUP FORM ───────────────────────────── */}
        {isEditing && (
          <section className="panel" style={{ marginBottom: 28, borderColor: "var(--gold-border)" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, marginBottom: 20, letterSpacing: "-0.02em" }}>
              Update Profile
            </h2>

            {/* Avatar picker */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: "0.76rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", marginBottom: 12 }}>
                Choose Avatar
              </label>
              {/* Upload from device */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: "999px", border: "1px dashed var(--gold-border)", background: "var(--gold-dim)", color: "var(--gold)", fontSize: "0.82rem", fontWeight: 700, cursor: "pointer", marginBottom: 16 }}
              >
                <Upload size={14} /> Upload from device
              </button>
              {/* AI-generated presets */}
              <div className="pr-avatar-grid">
                {AI_AVATARS.map(av => (
                  <div
                    key={av.src}
                    className={`pr-avatar-opt ${form.avatarUrl === av.src ? "selected" : ""}`}
                    onClick={() => { const u = { ...form, avatarUrl: av.src }; setForm(u); setProfile(u); }}
                    title={av.label}
                  >
                    <img src={av.src} alt={av.label} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSave}>
              <div className="lp-form-row">
                <div className="lp-form-group">
                  <label>Display Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="lp-input" required />
                </div>
                <div className="lp-form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="lp-input" required />
                </div>
              </div>
              <div className="lp-form-row">
                <div className="lp-form-group">
                  <label>Preferred Genre</label>
                  <select value={form.genre} onChange={e => setForm(p => ({ ...p, genre: e.target.value }))} className="lp-input">
                    <option>Telugu Pop</option><option>Pop</option><option>Synthpop</option>
                    <option>Bollywood Ballad</option><option>Tamil Dance</option><option>Lo-Fi</option>
                  </select>
                </div>
                <div className="lp-form-group">
                  <label>Music Goal</label>
                  <select value={form.goal} onChange={e => setForm(p => ({ ...p, goal: e.target.value }))} className="lp-input">
                    <option>Match my mood</option><option value="lift">Lift my mood</option>
                    <option value="relax">Relax</option><option value="focus">Deep Focus</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="submit" className="auth-submit" style={{ flex: 1 }}>Save Profile</button>
                <button type="button" className="ghost-btn" onClick={() => setIsEditing(false)}>Cancel</button>
              </div>
            </form>
          </section>
        )}

        {/* ── TWO COLUMN ───────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

          {/* LEFT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Mood analytics */}
            <section className="panel">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
                  <BarChart3 size={18} style={{ color: "var(--gold)" }} /> Mood Analytics
                </h3>
                <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>Last 30 sessions</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {MOOD_DIST.map(item => (
                  <div key={item.label} className="pr-mood-bar-wrap">
                    <div className="pr-mood-bar-label">
                      <span>{item.label}</span>
                      <strong style={{ color: item.color }}>{item.percent}%</strong>
                    </div>
                    <div className="pr-mood-bar-track">
                      <div className="pr-mood-bar-fill" style={{ width: `${item.percent}%`, background: item.color, boxShadow: `0 0 10px ${item.color}66` }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20, padding: "12px 16px", borderRadius: "var(--r-md)", background: "var(--gold-dim)", border: "1px solid var(--gold-border)" }}>
                <p style={{ fontSize: "0.82rem", color: "var(--gold-light)", lineHeight: 1.6, margin: 0 }}>
                  Primary state: <strong>Happy (45%)</strong> — system auto-boosts energetic Telugu tracks.
                </p>
              </div>
            </section>

            {/* Favorite artists */}
            <section className="panel">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkles size={18} style={{ color: "var(--sapphire-lt)" }} /> Favorite Artists
                </h3>
                <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{form.favoriteArtists?.length || 0} artists</span>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {form.favoriteArtists?.map(artist => (
                  <span key={artist} className="pr-artist-tag">
                    {artist}
                    <button onClick={() => handleRemoveArtist(artist)} style={{ background: "none", border: "none", color: "var(--text-4)", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: "1rem" }}>×</button>
                  </span>
                ))}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <input
                  type="text" placeholder="Add artist (e.g. A.R. Rahman)"
                  value={newArtist} onChange={e => setNewArtist(e.target.value)}
                  className="lp-input" style={{ flex: 1, padding: "8px 12px", fontSize: "0.84rem" }}
                  onKeyDown={e => e.key === "Enter" && handleAddArtist()}
                />
                <button type="button" onClick={handleAddArtist} className="pill-button primary small">
                  <Plus size={13} /> Add
                </button>
              </div>
            </section>
          </div>

          {/* RIGHT */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Saved songs */}
            <section className="panel">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
                  <Heart size={18} style={{ color: "var(--crimson-lt)" }} /> Saved Songs
                </h3>
                <span style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>{form.savedSongs?.length || 0} tracks</span>
              </div>

              <div>
                {form.savedSongs?.map((song, i) => {
                  const title = song.title || song.name || "Unknown";
                  return (
                    <div key={i} className="pr-song-row">
                      <div className="pr-song-art" style={{ background: artBg(title) }}>
                        {title[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p className="pr-song-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
                        <p className="pr-song-artist">{song.artist}</p>
                      </div>
                      <span className="pr-song-lang" style={{ color: LANG_COLOR[song.language || ""] || "var(--text-3)" }}>
                        {song.language || "—"}
                      </span>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button className="pill-button primary small" onClick={() => navigate("/room")} type="button">Play</button>
                        <button onClick={() => handleRemoveSong(title)} style={{ background: "none", border: "none", color: "var(--text-4)", cursor: "pointer", padding: 4 }} title="Remove" type="button">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Summary link */}
            <section className="panel" style={{ borderColor: "rgba(37,99,235,0.3)" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 8, letterSpacing: "-0.01em" }}>Project Summary</h3>
              <p style={{ fontSize: "0.86rem", color: "var(--text-3)", lineHeight: 1.6, marginBottom: 16 }}>
                View the complete BTech Final Project abstract, architecture breakdown, and technology overview.
              </p>
              <Link to="/summary" className="pill-button secondary" style={{ display: "flex", justifyContent: "center" }}>
                Open Summary
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
