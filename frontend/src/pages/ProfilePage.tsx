import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import type { Song, UserProfile } from "../types";
import { BarChart3, Heart, ShieldCheck, Plus, Trash2, Upload, Sliders, RefreshCw, Check } from "lucide-react";
import { Wordmark } from "../components/Brand";
import { sanitizeInputText } from "../utils/security";

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

const AVAILABLE_GENRES = [
  "Telugu Pop", "Telugu Melodic", "Telugu Classical Fusion", "Telugu Folk Dance",
  "Tamil Kuthu", "Tamil Classic Soul", "Bollywood Romantic", "Bollywood Dance",
  "Indie Pop", "Synthwave Pop", "Classic Rock", "Lo-Fi Ambient", "Classical Piano",
];

const AVAILABLE_MOODS = [
  "happy", "calm", "energetic", "romantic", "focused", "sad", "nostalgic", "epic",
];

const AVAILABLE_LANGUAGES = [
  "Telugu", "Tamil", "Hindi", "English", "Malayalam", "Punjabi", "Instrumental",
];

const DEFAULT_SAVED: Song[] = [
  { title: "Buttabomma",       artist: "Armaan Malik",  genre: "Telugu Pop",      language: "Telugu"  },
  { title: "Samajavaragamana", artist: "Sid Sriram",    genre: "Telugu Soul",     language: "Telugu"  },
  { title: "Blinding Lights",  artist: "The Weeknd",    genre: "Synthpop",        language: "English" },
  { title: "Tum Hi Ho",        artist: "Arijit Singh",  genre: "Bollywood Ballad",language: "Hindi"   },
  { title: "Rowdy Baby",       artist: "Dhanush & Dhee",genre: "Tamil Dance",     language: "Tamil"   },
];

const LANG_COLOR: Record<string, string> = {
  Telugu:  "#22D3EE",
  English: "#6366F1",
  Tamil:   "#2DD4BF",
  Hindi:   "#8B5CF6",
};

const ART_COLORS = [
  "linear-gradient(135deg,#22D3EE,#6366F1)",
  "linear-gradient(135deg,#8B5CF6,#6366F1)",
  "linear-gradient(135deg,#2DD4BF,#34D399)",
  "linear-gradient(135deg,#F472B6,#8B5CF6)",
  "linear-gradient(135deg,#F59E0B,#22D3EE)",
];
function artBg(title: string): string {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) & 0xffffffff;
  return ART_COLORS[Math.abs(h) % ART_COLORS.length];
}

export default function ProfilePage() {
  const navigate  = useNavigate();
  const profile   = useAppStore(s => s.profile);
  const setProfile = useAppStore(s => s.setProfile);
  const userPreferences = useAppStore(s => s.userPreferences);
  const updateUserPreferences = useAppStore(s => s.updateUserPreferences);
  const resetUserPreferences = useAppStore(s => s.resetUserPreferences);
  const loadUserPreferences = useAppStore(s => s.loadUserPreferences);

  const setCurrentSong = useAppStore(s => s.setCurrentSong);
  const setSongsQueue = useAppStore(s => s.setSongsQueue);
  const favs = useAppStore(s => s.favs);
  const toggleFav = useAppStore(s => s.toggleFav);
  const clearFavs = useAppStore(s => s.clearFavs);
  const clearPlaybackHistory = useAppStore(s => s.clearPlaybackHistory);
  const purgeAllData = useAppStore(s => s.purgeAllData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(!profile);
  const [newArtist, setNewArtist] = useState("");
  const [prefSyncing, setPrefSyncing] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState(false);

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

  useEffect(() => {
    loadUserPreferences();
  }, [loadUserPreferences]);

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
    const sanitizedForm: UserProfile = {
      ...form,
      name: sanitizeInputText(form.name, 60) || "Patnala Uday Kumar",
      email: sanitizeInputText(form.email, 80) || "uday@musicmirror.ai",
    };

    setProfile(sanitizedForm);
    setIsEditing(false);
  };

  const handleAddArtist = () => {
    const trimmed = sanitizeInputText(newArtist.trim(), 50);
    if (!trimmed) return;

    const currentArtists = form.favoriteArtists || [];
    if (!currentArtists.includes(trimmed)) {
      const updated = { ...form, favoriteArtists: [...currentArtists, trimmed] };
      setForm(updated);
      setProfile(updated);
      // Also sync to user preferences database model
      updateUserPreferences({
        preferred_artists: Array.from(new Set([...(userPreferences.preferred_artists || []), trimmed])),
      });
    }
    setNewArtist("");
  };

  const handleRemoveArtist = (artist: string) => {
    const currentArtists = form.favoriteArtists || [];
    const updated = { ...form, favoriteArtists: currentArtists.filter(a => a !== artist) };
    setForm(updated);
    setProfile(updated);
    updateUserPreferences({
      preferred_artists: (userPreferences.preferred_artists || []).filter(a => a !== artist),
    });
  };

  const handleRemoveSong = (title: string) => {
    const updated = { ...form, savedSongs: (form.savedSongs || []).filter(s => (s.title || s.name) !== title) };
    setForm(updated);
    setProfile(updated);
  };

  const handleToggleGenrePref = async (genre: string) => {
    setPrefSyncing(true);
    const current = userPreferences.preferred_genres || [];
    const next = current.includes(genre)
      ? current.filter(g => g !== genre)
      : [...current, genre];
    try {
      await updateUserPreferences({ preferred_genres: next });
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 2000);
    } catch (_) {
      // Handled via store rollback
    } finally {
      setPrefSyncing(false);
    }
  };

  const handleToggleMoodPref = async (mood: string) => {
    setPrefSyncing(true);
    const current = userPreferences.preferred_moods || [];
    const next = current.includes(mood)
      ? current.filter(m => m !== mood)
      : [...current, mood];
    try {
      await updateUserPreferences({ preferred_moods: next });
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 2000);
    } catch (_) {
      // Handled via store rollback
    } finally {
      setPrefSyncing(false);
    }
  };

  const handleToggleLangPref = async (lang: string) => {
    setPrefSyncing(true);
    const current = userPreferences.preferred_languages || [];
    const next = current.includes(lang)
      ? current.filter(l => l !== lang)
      : [...current, lang];
    try {
      await updateUserPreferences({ preferred_languages: next });
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 2000);
    } catch (_) {
      // Handled via store rollback
    } finally {
      setPrefSyncing(false);
    }
  };

  const handleSetPreferenceField = async (field: string, val: string) => {
    setPrefSyncing(true);
    try {
      await updateUserPreferences({ [field]: val });
      setPrefSuccess(true);
      setTimeout(() => setPrefSuccess(false), 2000);
    } catch (_) {
      // Handled via store rollback
    } finally {
      setPrefSyncing(false);
    }
  };

  const handleResetPreferences = async () => {
    if (window.confirm("Reset all your music preferences to default settings?")) {
      setPrefSyncing(true);
      try {
        await resetUserPreferences();
        setPrefSuccess(true);
        setTimeout(() => setPrefSuccess(false), 2000);
      } finally {
        setPrefSyncing(false);
      }
    }
  };

  return (
    <div className="min-h-screen pb-24 text-[var(--text-primary)] font-sans antialiased" style={{ background: "var(--app-bg)" }}>
      {/* ── Top Header ── */}
      <header className="pr-header" style={{ backdropFilter: "blur(24px)", background: "rgba(255,255,255,0.88)", borderBottom: "1px solid #E2E8F0", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px", position: "sticky", top: 0, zIndex: 50 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link to="/">
            <Wordmark size="md" showBadge={true} />
          </Link>
          <span className="pr-header-tag" style={{ border: "1px solid #C7D2FE", color: "#4F46E5", background: "#EEF2FF", padding: "2px 10px", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <ShieldCheck size={11} style={{ color: "#4F46E5" }} /> Profile & Preferences
          </span>
        </div>

        {/* Center Nav Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 auto" }}>
          <Link to="/room" style={{ padding: "6px 14px", borderRadius: "999px", fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>Studio</Link>
          <Link to="/dashboard" style={{ padding: "6px 14px", borderRadius: "999px", fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>AI Lab</Link>
          <Link to="/summary" style={{ padding: "6px 14px", borderRadius: "999px", fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>Blueprint</Link>
          <Link to="/profile" style={{ padding: "6px 14px", borderRadius: "999px", fontSize: "0.82rem", fontWeight: 700, color: "#4F46E5", background: "#EEF2FF", border: "1px solid #C7D2FE" }}>Profile</Link>
        </div>
      </header>

      <main className="pr-main">
        {/* ── HERO BANNER ── */}
        <section className="pr-hero-card">
          <div className="pr-avatar-container">
            <img src={form.avatarUrl} alt={form.name} className="pr-avatar-img" />
            <button
              type="button"
              className="pr-avatar-upload-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Upload profile picture"
            >
              <Upload size={12} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleFileSelect}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <h1 className="pr-hero-name">{form.name}</h1>
              <span className="pill-button secondary small" style={{ fontSize: "0.68rem", cursor: "default" }}>
                AI Pro Listener
              </span>
            </div>
            <p className="pr-hero-email">{form.email}</p>
            <p className="pr-hero-meta">
              <span>Goal: <strong>{form.goal}</strong></span>
              <span style={{ color: "var(--text-4)" }}>•</span>
              <span>Top Genre: <strong>{form.genre}</strong></span>
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`pill-button ${isEditing ? "primary" : "secondary"} small`}
              type="button"
            >
              {isEditing ? "View Profile" : "Edit Profile"}
            </button>
            <Link to="/dashboard" className="pill-button secondary small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <BarChart3 size={13} /> AI Analytics
            </Link>
          </div>
        </section>

        {/* ── GRID LAYOUT ── */}
        <div className="pr-grid">
          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Profile Form (Edit Mode) */}
            {isEditing && (
              <section className="panel">
                <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.01em" }}>
                  Edit Listener Profile
                </h3>
                <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label className="lp-label" style={{ fontSize: "0.75rem", marginBottom: 4, display: "block" }}>Full Name</label>
                    <input
                      type="text" value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="lp-input" required
                    />
                  </div>
                  <div>
                    <label className="lp-label" style={{ fontSize: "0.75rem", marginBottom: 4, display: "block" }}>Email</label>
                    <input
                      type="email" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="lp-input" required
                    />
                  </div>
                  <div>
                    <label className="lp-label" style={{ fontSize: "0.75rem", marginBottom: 4, display: "block" }}>Listening Goal</label>
                    <select
                      value={form.goal}
                      onChange={e => setForm({ ...form, goal: e.target.value })}
                      className="lp-input"
                    >
                      <option value="Match my mood">Match my mood</option>
                      <option value="Boost focus & energy">Boost focus & energy</option>
                      <option value="Relax & de-stress">Relax & de-stress</option>
                      <option value="Discover new songs">Discover new songs</option>
                    </select>
                  </div>

                  <div>
                    <label className="lp-label" style={{ fontSize: "0.75rem", marginBottom: 8, display: "block" }}>Choose Avatar</label>
                    <div style={{ display: "flex", gap: 10 }}>
                      {AI_AVATARS.map((av, idx) => (
                        <img
                          key={idx}
                          src={av.src}
                          alt={av.label}
                          onClick={() => setForm({ ...form, avatarUrl: av.src })}
                          style={{
                            width: 36, height: 36, borderRadius: "50%", cursor: "pointer",
                            border: form.avatarUrl === av.src ? "2px solid #6846E8" : "2px solid transparent",
                            transform: form.avatarUrl === av.src ? "scale(1.1)" : "scale(1)",
                            transition: "all 0.18s ease",
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="pill-button primary" style={{ marginTop: 8, justifyContent: "center" }}>
                    Save Changes
                  </button>
                </form>
              </section>
            )}

            {/* ── REAL-TIME USER MUSIC PREFERENCES SECTION (BENTO GLASS CARD) ── */}
            <section className="panel" style={{ background: "rgba(255,255,255,0.75)", backdropFilter: "blur(24px)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 800, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
                    <Sliders size={18} style={{ color: "var(--primary-color)" }} /> Real-Time Music Personalization
                  </h3>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 2 }}>
                    Persisted directly to production database and applied live to AI recommendations.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {prefSyncing && <span style={{ fontSize: "0.72rem", color: "var(--primary-color)", display: "flex", alignItems: "center", gap: 4 }}><RefreshCw size={11} className="spin" /> Syncing...</span>}
                  {prefSuccess && <span style={{ fontSize: "0.72rem", color: "var(--success)", display: "flex", alignItems: "center", gap: 4 }}><Check size={11} /> Saved</span>}
                  <button type="button" onClick={handleResetPreferences} className="pill-button secondary small" style={{ fontSize: "0.7rem" }}>
                    Reset Defaults
                  </button>
                </div>
              </div>

              {/* 1. Favorite Genres */}
              <div style={{ marginBottom: 18 }}>
                <label className="lp-label" style={{ fontSize: "0.78rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                  Favorite Genres ({userPreferences.preferred_genres.length})
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {AVAILABLE_GENRES.map((g) => {
                    const active = userPreferences.preferred_genres.includes(g);
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleToggleGenrePref(g)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 999,
                          fontSize: "0.76rem",
                          fontWeight: active ? 700 : 500,
                          background: active ? "var(--primary-color)" : "var(--glass-tint)",
                          color: active ? "#FFFFFF" : "var(--text-primary)",
                          border: active ? "1px solid var(--primary-color)" : "1px solid var(--border)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {active ? `✓ ${g}` : `+ ${g}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Favorite Moods */}
              <div style={{ marginBottom: 18 }}>
                <label className="lp-label" style={{ fontSize: "0.78rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                  Preferred Moods ({userPreferences.preferred_moods.length})
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {AVAILABLE_MOODS.map((m) => {
                    const active = userPreferences.preferred_moods.includes(m);
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleToggleMoodPref(m)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 999,
                          fontSize: "0.76rem",
                          fontWeight: active ? 700 : 500,
                          background: active ? "var(--secondary-color)" : "var(--glass-tint)",
                          color: active ? "#FFFFFF" : "var(--text-primary)",
                          border: active ? "1px solid var(--secondary-color)" : "1px solid var(--border)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          textTransform: "capitalize",
                        }}
                      >
                        {active ? `✓ ${m}` : m}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Preferred Languages */}
              <div style={{ marginBottom: 18 }}>
                <label className="lp-label" style={{ fontSize: "0.78rem", fontWeight: 700, marginBottom: 8, display: "block" }}>
                  Preferred Languages ({userPreferences.preferred_languages.length})
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {AVAILABLE_LANGUAGES.map((l) => {
                    const active = userPreferences.preferred_languages.includes(l);
                    return (
                      <button
                        key={l}
                        type="button"
                        onClick={() => handleToggleLangPref(l)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 999,
                          fontSize: "0.76rem",
                          fontWeight: active ? 700 : 500,
                          background: active ? "#22D3EE" : "var(--glass-tint)",
                          color: active ? "#151522" : "var(--text-primary)",
                          border: active ? "1px solid #22D3EE" : "1px solid var(--border)",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {active ? `✓ ${l}` : l}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Listening Controls Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                {/* Energy */}
                <div>
                  <label className="lp-label" style={{ fontSize: "0.72rem", marginBottom: 4, display: "block" }}>Energy Level</label>
                  <select
                    value={userPreferences.energy_preference}
                    onChange={(e) => handleSetPreferenceField("energy_preference", e.target.value)}
                    className="lp-input"
                    style={{ fontSize: "0.8rem", padding: "6px 10px" }}
                  >
                    <option value="low">Low Energy</option>
                    <option value="balanced">Balanced Energy</option>
                    <option value="high">High Energy</option>
                  </select>
                </div>

                {/* Discovery Mode */}
                <div>
                  <label className="lp-label" style={{ fontSize: "0.72rem", marginBottom: 4, display: "block" }}>Discovery Mode</label>
                  <select
                    value={userPreferences.discovery_mode}
                    onChange={(e) => handleSetPreferenceField("discovery_mode", e.target.value)}
                    className="lp-input"
                    style={{ fontSize: "0.8rem", padding: "6px 10px" }}
                  >
                    <option value="more_familiar">More Like Favorites</option>
                    <option value="balanced">Balanced Discovery</option>
                    <option value="more_exploratory">Discover Something New</option>
                  </select>
                </div>

                {/* Explicit Content */}
                <div>
                  <label className="lp-label" style={{ fontSize: "0.72rem", marginBottom: 4, display: "block" }}>Explicit Content</label>
                  <select
                    value={userPreferences.explicit_content_mode}
                    onChange={(e) => handleSetPreferenceField("explicit_content_mode", e.target.value)}
                    className="lp-input"
                    style={{ fontSize: "0.8rem", padding: "6px 10px" }}
                  >
                    <option value="allow">Allow Explicit</option>
                    <option value="filter">Filter Explicit</option>
                    <option value="hide">Hide Explicit</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Favorite Artists */}
            <section className="panel">
              <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 16, letterSpacing: "-0.01em" }}>
                Favorite Artists
              </h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(form.favoriteArtists || []).map((artist, idx) => (
                  <span key={idx} className="pr-artist-chip">
                    {artist}
                    <button onClick={() => handleRemoveArtist(artist)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: "1rem" }}>×</button>
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
              {/* Merge store favs + profile savedSongs (dedupe by title+artist) */}
              {(() => {
                const favKey = (s: Song) => `${s.title || s.name}::${s.artist}`;
                const favSet = new Set(favs.map(favKey));
                const savedOnly = (form.savedSongs || []).filter(s => !favSet.has(favKey(s)));
                const allSongs: (Song & { fromFav?: boolean })[] = [
                  ...favs.map(s => ({ ...s, fromFav: true })),
                  ...savedOnly,
                ];
                return (
                  <>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                      <h3 style={{ fontSize: "1rem", fontWeight: 800, letterSpacing: "-0.01em", display: "flex", alignItems: "center", gap: 8 }}>
                        <Heart size={18} style={{ color: "#F472B6" }} /> Saved Songs
                      </h3>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{allSongs.length} tracks</span>
                    </div>
                    <div>
                      {allSongs.map((song, i) => {
                        const title = song.title || song.name || "Unknown";
                        return (
                          <div key={i} className="pr-song-row">
                            <div className="pr-song-art" style={{ background: artBg(title) }}>
                              {title[0]?.toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p className="pr-song-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</p>
                              <p className="pr-song-artist">{song.artist}{song.fromFav && <span style={{ marginLeft: 6, fontSize: "0.65rem", color: "#F472B6", fontWeight: 700 }}>♥ Favorited</span>}</p>
                            </div>
                            <span className="pr-song-lang" style={{ color: LANG_COLOR[song.language || ""] || "var(--text-secondary)" }}>
                              {song.language || "—"}
                            </span>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <button className="pill-button primary small" onClick={() => {
                                const storeSong: Song = { ...song, name: song.title || song.name || 'Unknown' };
                                setSongsQueue([storeSong]);
                                setCurrentSong(storeSong);
                                navigate("/room");
                              }} type="button">Play</button>
                              {song.fromFav ? (
                                <button onClick={() => toggleFav(song)} style={{ background: "none", border: "none", color: "#F472B6", cursor: "pointer", padding: 4 }} title="Remove from favorites" type="button">
                                  <Heart size={13} fill="#F472B6" />
                                </button>
                              ) : (
                                <button onClick={() => handleRemoveSong(title)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 4 }} title="Remove" type="button">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </section>

            {/* Summary link */}
            <section className="panel" style={{ borderColor: "rgba(37,99,235,0.3)" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, marginBottom: 8, letterSpacing: "-0.01em" }}>Project Summary</h3>
              <p style={{ fontSize: "0.86rem", color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
                View the complete BTech Final Project abstract, architecture breakdown, and technology overview.
              </p>
              <Link to="/summary" className="pill-button secondary" style={{ display: "flex", justifyContent: "center" }}>
                Open Summary
              </Link>
            </section>
          </div>
        </div>
      </main>

      {/* ── Privacy Controls (below main, above nav) ── */}
      <section style={{ maxWidth: 900, margin: "0 auto 80px", padding: "0 24px" }}>
        <div className="panel" style={{ borderColor: "rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.02)" }}>
          <h3 style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            🔒 Privacy Controls
          </h3>
          <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginBottom: 16, lineHeight: 1.5 }}>
            Your preferences are persisted to the database and tied to your user session.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="pill-button secondary small"
              onClick={() => { clearFavs(); }}
            >Clear Favorites ({favs.length})</button>
            <button type="button" className="pill-button secondary small"
              onClick={() => { clearPlaybackHistory(); }}
            >Clear Playback History</button>
            <button type="button"
              style={{ padding: "8px 16px", borderRadius: "999px", border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.06)", color: "#DC2626", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
              onClick={() => {
                if (window.confirm("Delete ALL your MusicMirror data? This cannot be undone.")) {
                  purgeAllData();
                }
              }}
            >🗑 Delete All My Data</button>
          </div>
        </div>
      </section>

      {/* ── Floating Bottom Navigation Pill ── */}
      <nav className="studio-nav-bar">
        <Link to="/" className="studio-nav-item">Discover</Link>
        <Link to="/room" className="studio-nav-item">Room</Link>
        <Link to="/profile" className="studio-nav-item active">Profile</Link>
        <Link to="/dashboard" className="studio-nav-item">AI Lab</Link>
      </nav>
    </div>
  );
}
