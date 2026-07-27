// @ts-nocheck
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import BrandLockup from "../components/BrandLockup";
import { emotionLabels } from "../components/EmotionCard";
import { Users, Code, Brain, Database, Sparkles, Zap, ShieldCheck, Layers, Cpu, Activity } from "lucide-react";

export default function SummaryPage({ profile, history, favorites, insightSummary }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="app-shell" style={{ overflowY: 'auto' }}>
      <div className="app-noise" />
      <header className="topbar">
        <BrandLockup label="BTech Final Project & Architecture Summary" labelClassName="topbar-label" />
        <div className="topbar-actions">
          <Link to="/room" className="ghost-btn">Back to Room</Link>
        </div>
      </header>

      <main className="workspace" style={{ display: 'block', maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
        
        {/* PROJECT ABSTRACT SECTION */}
        <motion.section 
          className="panel"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          style={{ marginBottom: '32px' }}
        >
          <motion.div variants={itemVariants}>
            <p className="section-kicker">Department of CSE (Data Science) — Final Semester Project</p>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '16px', lineHeight: 1.1 }}>
              Smart Music Recommendation System Based on User Emotions
            </h2>
            <p className="poster-text" style={{ maxWidth: '100%', opacity: 0.9 }}>
              The AI-Based Facial Emotion Music Recommender System is a web-based application that automatically recommends music by detecting the user’s real-time facial emotions through a webcam. The system employs <strong>face-api.js</strong> with pre-trained deep learning models to analyze facial expressions. The frontend is developed using <strong>React 18 + Vite</strong>, while the backend is implemented using <strong>FastAPI (Layered Architecture)</strong>.
            </p>
          </motion.div>
        </motion.section>

        {/* VERSION COMPARISON: TEAM BASELINE VS PERSONAL UPGRADES */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          style={{ marginBottom: '40px' }}
        >
          <p className="section-kicker" style={{ marginBottom: '16px' }}>Project Evolution & System Architecture</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
            
            {/* Version 1.0 - BTech Team Baseline */}
            <motion.div className="panel" variants={itemVariants} style={{ borderLeft: '4px solid #94a3b8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Users size={24} color="#64748b" />
                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>v1.0 Team Baseline</h3>
              </div>
              <p className="meta-label" style={{ marginBottom: '16px' }}>Original 4-Member Semester Project MVP</p>
              
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.92rem', lineHeight: 1.8, color: 'var(--text-soft)' }}>
                <li><strong>Build System:</strong> Create-React-App (`react-scripts`), vanilla JS (`.jsx`).</li>
                <li><strong>Backend Architecture:</strong> Monolithic single-file `main.py` with basic JSON response.</li>
                <li><strong>Emotion Detection:</strong> Single-frame instant thresholding without temporal smoothing.</li>
                <li><strong>Recommendation Logic:</strong> Basic static mapping from emotion to predefined genre lists.</li>
                <li><strong>UI & Design:</strong> Default flat blue/white layout.</li>
                <li><strong>Dataset:</strong> Small sample JSON track list.</li>
              </ul>
            </motion.div>

            {/* Version 2.0 - Personal Enterprise AI Upgrades */}
            <motion.div className="panel" variants={itemVariants} style={{ borderLeft: '4px solid var(--accent)', background: 'rgba(99, 102, 241, 0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <Sparkles size={24} color="var(--accent)" />
                <h3 style={{ margin: 0, fontSize: '1.4rem' }}>v2.0 Personal AI Overhaul</h3>
              </div>
              <p className="meta-label" style={{ marginBottom: '16px', color: 'var(--accent)' }}>Advanced Production & Engineering Upgrades</p>
              
              <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.92rem', lineHeight: 1.8, color: 'var(--text)' }}>
                <li><strong>Build System:</strong> React 18 + Vite + 100% TypeScript (1.6s sub-second builds).</li>
                <li><strong>Backend Architecture:</strong> Layered FastAPI (`routes/`, `services/`, `schemas/`, strict Pydantic V2).</li>
                <li><strong>Biometric AI:</strong> 5-frame Temporal Fusion, 3s Face-Lost Recovery, and Real-time Frame Luminance & Lighting Analysis.</li>
                <li><strong>Recommendation Engine:</strong> 9-Stage Hybrid Pipeline (Context Fusion, Artist Cooldowns, Novelty Boosts, Euclidean Vector Search).</li>
                <li><strong>Explainable AI & Telemetry:</strong> Dynamic track reasoning strings and continuous Self-Evolution background loop.</li>
                <li><strong>UI & Dataset:</strong> Pristine Light AI theme + 100+ track curated audio feature dataset.</li>
              </ul>
            </motion.div>

          </div>
        </motion.section>

        {/* TEAM MEMBERS SECTION */}
        <motion.section 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          style={{ marginBottom: '40px' }}
        >
          <p className="section-kicker" style={{ marginBottom: '16px' }}>Original Project Team Roles</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            
            {/* Team Member 1 */}
            <motion.div className="panel profile-panel" variants={itemVariants} whileHover={{ y: -5 }}>
              <Code size={28} color="var(--accent)" style={{ marginBottom: '12px' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem' }}>P. Uday Kumar</h4>
              <p className="meta-label">223J1A44D9</p>
              <strong style={{ display: 'block', margin: '12px 0 8px 0', color: 'var(--accent)' }}>Full-Stack & System Architect</strong>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)', margin: 0, lineHeight: 1.5 }}>Architected the Vite + TypeScript frontend, designed the UI/UX theme, and led the v2.0 Enterprise refactor.</p>
            </motion.div>

            {/* Team Member 2 */}
            <motion.div className="panel profile-panel" variants={itemVariants} whileHover={{ y: -5 }}>
              <Brain size={28} color="var(--accent)" style={{ marginBottom: '12px' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem' }}>P. Chaitanya</h4>
              <p className="meta-label">223J1A44E0</p>
              <strong style={{ display: 'block', margin: '12px 0 8px 0', color: 'var(--accent)' }}>Deep Learning Lead</strong>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)', margin: 0, lineHeight: 1.5 }}>Configured face-api.js deep learning models for real-time facial expression classification.</p>
            </motion.div>

            {/* Team Member 3 */}
            <motion.div className="panel profile-panel" variants={itemVariants} whileHover={{ y: -5 }}>
              <Database size={28} color="var(--accent)" style={{ marginBottom: '12px' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem' }}>P. Rohith</h4>
              <p className="meta-label">223J1A44F5</p>
              <strong style={{ display: 'block', margin: '12px 0 8px 0', color: 'var(--accent)' }}>Backend API Engineer</strong>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)', margin: 0, lineHeight: 1.5 }}>Developed the initial FastAPI server routes and recommendation endpoints.</p>
            </motion.div>

            {/* Team Member 4 */}
            <motion.div className="panel profile-panel" variants={itemVariants} whileHover={{ y: -5 }}>
              <Users size={28} color="var(--accent)" style={{ marginBottom: '12px' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem' }}>R. Prem Sagar</h4>
              <p className="meta-label">233J5A4416</p>
              <strong style={{ display: 'block', margin: '12px 0 8px 0', color: 'var(--accent)' }}>Data & Integration Engineer</strong>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)', margin: 0, lineHeight: 1.5 }}>Curated music metadata datasets, tested system performance, and managed data structures.</p>
            </motion.div>
          </div>
        </motion.section>

        {/* SESSION SUMMARY SECTION */}
        {profile && (
          <motion.div 
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <section className="panel">
              <p className="section-kicker">Live Demo Metrics</p>
              <h3>Session Pulse for {profile.name}</h3>
              <div className="stats-grid" style={{ marginTop: '24px' }}>
                <div>
                  <span className="meta-label">Total Scans</span>
                  <strong style={{ fontSize: '1.8rem' }}>{insightSummary?.totalScans || 0}</strong>
                </div>
                <div>
                  <span className="meta-label">Top Mood</span>
                  <strong style={{ fontSize: '1.8rem' }}>{insightSummary?.topMood ? (emotionLabels[insightSummary.topMood] || "Neutral") : "Neutral"}</strong>
                </div>
              </div>
            </section>

            <section className="panel">
              <p className="section-kicker">Queue History</p>
              <h3>Recent Tracks</h3>
              <div className="history-list" style={{ marginTop: '16px', maxHeight: '200px', overflowY: 'auto' }}>
                {!history || history.length === 0 ? (
                  <p className="state-copy">No tracks played yet in this session.</p>
                ) : (
                  history.slice(0, 4).map((entry) => (
                    <div key={entry.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.95rem' }}>{entry.title}</strong>
                        <span className="meta-label">{emotionLabels[entry.emotion]}</span>
                      </div>
                      <div className="song-note" style={{ fontSize: '0.8rem' }}>{entry.artist}</div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </motion.div>
        )}
      </main>
    </div>
  );
}
