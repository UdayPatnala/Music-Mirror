import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import BrandLockup from "../components/BrandLockup";
import { emotionLabels } from "../components/EmotionCard";

export default function SummaryPage({ profile, history, favorites, insightSummary }) {
  if (!profile) {
    return (
      <div className="app-shell flex-center">
        <h2>No session active.</h2>
        <Link to="/" className="primary-btn">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="app-noise" />
      <header className="topbar">
        <BrandLockup label="Session Summary" labelClassName="topbar-label" />
        <div className="topbar-actions">
          <Link to="/room" className="ghost-btn">Back to Room</Link>
        </div>
      </header>

      <main className="workspace" style={{ display: 'block', maxWidth: '800px', margin: '0 auto' }}>
        <motion.section 
          className="panel profile-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="section-kicker">Session Wrap-up</p>
          <h3>Great listening session, {profile.name}!</h3>

          <div className="stats-grid" style={{ marginTop: '30px' }}>
            <div>
              <span className="meta-label">Total Scans</span>
              <strong style={{ fontSize: '2rem' }}>{insightSummary.totalScans}</strong>
            </div>
            <div>
              <span className="meta-label">Dominant Mood</span>
              <strong style={{ fontSize: '2rem' }}>{emotionLabels[insightSummary.topMood] || insightSummary.topMood}</strong>
            </div>
            <div>
              <span className="meta-label">Favorites Added</span>
              <strong style={{ fontSize: '2rem' }}>{insightSummary.favorites}</strong>
            </div>
          </div>
        </motion.section>

        <motion.section 
          className="panel recommendations-panel" 
          style={{ marginTop: '24px' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3>Recent History</h3>
          <div className="history-list">
            {history.length === 0 ? (
              <p className="state-copy">No tracks played yet.</p>
            ) : (
              history.map((entry) => (
                <div key={entry.id} style={{ padding: '12px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{entry.title}</strong>
                    <span className="meta-label">{emotionLabels[entry.emotion]}</span>
                  </div>
                  <div className="song-note">{entry.artist}</div>
                </div>
              ))
            )}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
