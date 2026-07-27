// @ts-nocheck
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import BrandLockup from "../components/BrandLockup";
import { emotionLabels } from "../components/EmotionCard";
import { Users, Code, Brain, Database } from "lucide-react";

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
        <BrandLockup label="BTech Final Project" labelClassName="topbar-label" />
        <div className="topbar-actions">
          <Link to="/room" className="ghost-btn">Back to Room</Link>
        </div>
      </header>

      <main className="workspace" style={{ display: 'block', maxWidth: '1000px', margin: '0 auto', paddingBottom: '60px' }}>
        
        {/* PROJECT ABSTRACT SECTION */}
        <motion.section 
          className="panel"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          style={{ marginBottom: '32px' }}
        >
          <motion.div variants={itemVariants}>
            <p className="section-kicker">Department of CSE (Data Science)</p>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '16px', lineHeight: 1.1 }}>
              Smart Music Recommendation System Based on User Emotions
            </h2>
            <p className="poster-text" style={{ maxWidth: '100%', opacity: 0.9 }}>
              The AI-Based Facial Emotion Music Recommender System is a web-based application that automatically recommends music by detecting the user’s real-time facial emotions through a webcam. The system employs <strong>face-api.js</strong> with pre-trained deep learning models to analyze facial expressions. The frontend is developed using <strong>React.js</strong>, while the backend is implemented using <strong>FastAPI</strong>. This project demonstrates an effective integration of computer vision, machine learning, and full-stack web technologies.
            </p>
          </motion.div>
        </motion.section>

        {/* TEAM MEMBERS SECTION */}
        <motion.section 
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          style={{ marginBottom: '40px' }}
        >
          <p className="section-kicker" style={{ marginBottom: '16px' }}>Project Team Members</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            
            {/* Team Member 1 */}
            <motion.div className="panel profile-panel" variants={itemVariants} whileHover={{ y: -5 }}>
              <Code size={28} color="var(--accent)" style={{ marginBottom: '12px' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem' }}>P. Uday Kumar</h4>
              <p className="meta-label">223J1A44D9</p>
              <strong style={{ display: 'block', margin: '12px 0 8px 0', color: 'var(--accent)' }}>Full-Stack & UI/UX Lead</strong>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)', margin: 0, lineHeight: 1.5 }}>Architected the React frontend, implemented Framer Motion animations, and integrated face-api.js.</p>
            </motion.div>

            {/* Team Member 2 */}
            <motion.div className="panel profile-panel" variants={itemVariants} whileHover={{ y: -5 }}>
              <Brain size={28} color="var(--accent)" style={{ marginBottom: '12px' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem' }}>P. Chaitanya</h4>
              <p className="meta-label">223J1A44E0</p>
              <strong style={{ display: 'block', margin: '12px 0 8px 0', color: 'var(--accent)' }}>Deep Learning Engineer</strong>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)', margin: 0, lineHeight: 1.5 }}>Fine-tuned deep learning models for real-time emotion recognition across 7 emotional states.</p>
            </motion.div>

            {/* Team Member 3 */}
            <motion.div className="panel profile-panel" variants={itemVariants} whileHover={{ y: -5 }}>
              <Database size={28} color="var(--accent)" style={{ marginBottom: '12px' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem' }}>P. Rohith</h4>
              <p className="meta-label">223J1A44F5</p>
              <strong style={{ display: 'block', margin: '12px 0 8px 0', color: 'var(--accent)' }}>Backend & API Architect</strong>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)', margin: 0, lineHeight: 1.5 }}>Developed the FastAPI backend and engineered the real-time music recommendation endpoints.</p>
            </motion.div>

            {/* Team Member 4 */}
            <motion.div className="panel profile-panel" variants={itemVariants} whileHover={{ y: -5 }}>
              <Users size={28} color="var(--accent)" style={{ marginBottom: '12px' }} />
              <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem' }}>R. Prem Sagar</h4>
              <p className="meta-label">233J5A4416</p>
              <strong style={{ display: 'block', margin: '12px 0 8px 0', color: 'var(--accent)' }}>Data Engineer</strong>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-soft)', margin: 0, lineHeight: 1.5 }}>Curated the JSON music dataset, managed system deployment, and handled data integration.</p>
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
              <p className="section-kicker">Live Demo Stats</p>
              <h3>Session pulse for {profile.name}</h3>
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
                  <p className="state-copy">No tracks played yet.</p>
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
