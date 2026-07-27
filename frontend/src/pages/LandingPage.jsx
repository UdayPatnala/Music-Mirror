import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import BrandLockup from "../components/BrandLockup";
import CustomDropdown from "../components/CustomDropdown";

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

    onLogin({
      ...form,
      name: trimmedName,
      email: trimmedEmail,
    });
    navigate("/room");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <motion.div 
          className="auth-copy"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <BrandLockup
              label="Emotion-responsive player"
              labelClassName="eyebrow"
            />
          </motion.div>
          
          <motion.p className="auth-lead" variants={itemVariants}>
            A polished listening room that reads facial mood, starts music
            inside the interface, and remembers what felt right.
          </motion.p>

          <motion.div className="auth-points" variants={containerVariants}>
            <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }}>
              <span className="meta-label">Live playback</span>
              <strong>Embedded player inside the app</strong>
            </motion.div>
            <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }}>
              <span className="meta-label">Mood memory</span>
              <strong>Favorites and recent emotional reads</strong>
            </motion.div>
            <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }}>
              <span className="meta-label">Manual override</span>
              <strong>Choose a mood when the camera is uncertain</strong>
            </motion.div>
          </motion.div>
        </motion.div>

        <motion.form 
          className="auth-form" 
          onSubmit={handleSubmit}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <p className="section-kicker">Sign in</p>
          <h2>Create your listening profile</h2>

          <p className="auth-form-copy">
            This lightweight profile stays in your browser so you can return to
            the same mood studio.
          </p>

          <label>
            Display name
            <input
              name="name"
              onChange={handleChange}
              placeholder="Your name"
              type="text"
              value={form.name}
            />
          </label>

          <label>
            Email
            <input
              name="email"
              onChange={handleChange}
              placeholder="you@example.com"
              type="email"
              value={form.email}
            />
          </label>

          <CustomDropdown
            label="Preferred genre"
            options={genreOptions}
            value={form.genre}
            onChange={(val) =>
              setForm((prev) => ({ ...prev, genre: val }))
            }
          />

          <CustomDropdown
            label="Mood goal"
            options={goalOptions}
            value={form.goal}
            onChange={(val) =>
              setForm((prev) => ({ ...prev, goal: val }))
            }
          />

          <motion.button 
            className="primary-btn auth-submit" 
            type="submit"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Enter the music room
          </motion.button>
        </motion.form>
      </section>
    </main>
  );
}
