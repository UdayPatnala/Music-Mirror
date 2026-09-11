import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { ArrowLeft, Home, Music } from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="pr-root" style={{ background: "var(--bg-primary, #0D0D0D)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar modeLabel="404 — Route Not Found" />

      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "48px 24px",
          maxWidth: 640,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: "50%",
            background: "rgba(99, 91, 255, 0.12)",
            border: "1px solid rgba(99, 91, 255, 0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#635BFF",
            marginBottom: 24,
          }}
        >
          <Music size={40} />
        </div>

        <span
          style={{
            fontSize: "0.8rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "#635BFF",
            marginBottom: 8,
          }}
        >
          Error 404
        </span>

        <h1
          style={{
            fontSize: "clamp(2rem, 4vw, 2.75rem)",
            fontWeight: 800,
            color: "var(--text-1, #FFFFFF)",
            marginBottom: 16,
            letterSpacing: "-0.03em",
          }}
        >
          Track Lost in Transit
        </h1>

        <p
          style={{
            fontSize: "1rem",
            color: "var(--text-2, #A6ACB8)",
            lineHeight: 1.6,
            marginBottom: 36,
          }}
        >
          The page or stream URL you requested does not exist or has been moved. Let's get you back to the music.
        </p>

        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              color: "#FFFFFF",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} /> Go Back
          </button>

          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #4F46E5, #635BFF)",
              border: "none",
              color: "#FFFFFF",
              fontSize: "0.9rem",
              fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 16px rgba(79, 70, 229, 0.3)",
            }}
          >
            <Home size={16} /> Home
          </Link>

          <Link
            to="/room"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 24px",
              borderRadius: "999px",
              background: "rgba(47, 163, 107, 0.14)",
              border: "1px solid rgba(47, 163, 107, 0.3)",
              color: "#34D399",
              fontSize: "0.9rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            <Music size={16} /> Enter Room
          </Link>
        </div>
      </main>
    </div>
  );
}
