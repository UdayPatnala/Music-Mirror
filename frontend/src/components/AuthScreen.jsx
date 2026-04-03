import { useState } from "react";

const genreOptions = ["Pop", "Acoustic", "Rock", "Lo-fi", "Indie"];
const goalOptions = [
  "Match my mood",
  "Lift my energy",
  "Help me focus",
  "Calm things down",
];

export default function AuthScreen({ onStart }) {
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

    if (!trimmedName || !trimmedEmail) {
      return;
    }

    onStart({
      ...form,
      name: trimmedName,
      email: trimmedEmail,
    });
  };

  return (
    <main className="auth-shell">
      <section className="auth-hero">
        <div className="auth-copy">
          <p className="eyebrow">Emotion-responsive player</p>
          <h1>Muse Mirror</h1>
          <p className="auth-lead">
            A polished listening room that reads facial mood, starts music
            inside the interface, and remembers what felt right.
          </p>

          <div className="auth-points">
            <div>
              <span className="meta-label">Live playback</span>
              <strong>Embedded player inside the app</strong>
            </div>
            <div>
              <span className="meta-label">Mood memory</span>
              <strong>Favorites and recent emotional reads</strong>
            </div>
            <div>
              <span className="meta-label">Manual override</span>
              <strong>Choose a mood when the camera is uncertain</strong>
            </div>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <p className="section-kicker">Sign in</p>
          <h2>Create your listening profile</h2>
          <p className="auth-form-copy">
            This lightweight profile stays in your browser so you can return to
            the same mood studio on your machine.
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

          <label>
            Preferred genre
            <select name="genre" onChange={handleChange} value={form.genre}>
              {genreOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Mood goal
            <select name="goal" onChange={handleChange} value={form.goal}>
              {goalOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <button className="primary-btn auth-submit" type="submit">
            Enter the music room
          </button>
        </form>
      </section>
    </main>
  );
}
