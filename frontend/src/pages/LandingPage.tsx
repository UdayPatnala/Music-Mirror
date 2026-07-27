// @ts-nocheck
import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import CustomDropdown from "../components/CustomDropdown";
import { Sparkles, BrainCircuit, AudioWaveform } from "lucide-react";

const genreOptions = ["Pop", "Acoustic", "Rock", "Lo-fi", "Indie"];
const goalOptions = [
  "Match my mood",
  "Lift my energy",
  "Help me focus",
  "Calm things down",
];

export default function LandingPage({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    genre: "Pop",
    goal: "Match my mood",
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedName = form.name.trim();
    const trimmedEmail = form.email.trim();
    if (!trimmedName || !trimmedEmail) return;
    onLogin({ ...form, name: trimmedName, email: trimmedEmail });
    navigate("/room");
  };

  return (
    <main className="ai-landing-shell">
      {/* Animated AI Background */}
      <div className="ai-mesh-bg">
        <motion.div 
          className="mesh-blob blob-1"
          animate={{
            x: [0, 100, -50, 0],
            y: [0, -100, 50, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="mesh-blob blob-2"
          animate={{
            x: [0, -120, 80, 0],
            y: [0, 80, -100, 0],
            scale: [1, 1.1, 1.3, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
        />
        <div className="mesh-glass-overlay" />
      </div>

      <section className="ai-landing-content">
        <motion.div 
          className="ai-hero-copy"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="ai-badge">
            <Sparkles size={16} />
            <span>AI Emotion Engine Powered</span>
          </div>
          <h1 className="ai-hero-title">
            Music that <br/>
            <span className="text-gradient">reads your mind.</span>
          </h1>
          <p className="ai-hero-lead">
            Experience the next generation of musical curation. Our neural models analyze your micro-expressions in real-time to generate the perfect soundtrack for your exact cognitive state.
          </p>

          <div className="ai-features-grid">
            <div className="ai-feature">
              <div className="feature-icon"><BrainCircuit size={24} /></div>
              <div>
                <strong>Deep Learning</strong>
                <p>Real-time facial analysis</p>
              </div>
            </div>
            <div className="ai-feature">
              <div className="feature-icon"><AudioWaveform size={24} /></div>
              <div>
                <strong>Dynamic Audio</strong>
                <p>Goal-oriented synthesis</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.form 
          className="ai-glass-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 100 }}
        >
          <div className="form-header">
            <h3>Initialize Profile</h3>
            <p>Create your unique neural listening signature.</p>
          </div>

          <div className="form-group">
            <label>Subject Name</label>
            <input name="name" onChange={handleChange} placeholder="e.g. Alex" type="text" value={form.name} />
          </div>

          <div className="form-group">
            <label>Authentication Email</label>
            <input name="email" onChange={handleChange} placeholder="alex@domain.com" type="email" value={form.email} />
          </div>

          <div className="form-row">
            <CustomDropdown label="Base Genre" options={genreOptions} value={form.genre} onChange={(val) => setForm((prev) => ({ ...prev, genre: val }))} />
            <CustomDropdown label="Cognitive Goal" options={goalOptions} value={form.goal} onChange={(val) => setForm((prev) => ({ ...prev, goal: val }))} />
          </div>

          <motion.button 
            className="ai-primary-btn" 
            type="submit"
            whileHover={{ scale: 1.03, boxShadow: "0 0 25px rgba(0, 229, 255, 0.5)" }}
            whileTap={{ scale: 0.97 }}
          >
            <span>Activate Session</span>
            <Sparkles size={18} />
          </motion.button>
        </motion.form>
      </section>
    </main>
  );
}
