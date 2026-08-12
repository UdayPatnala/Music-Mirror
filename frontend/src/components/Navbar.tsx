import { Link, useLocation } from "react-router-dom";
import { Music, Sparkles } from "lucide-react";

export interface NavbarProps {
  modeLabel?: string;
}

export default function Navbar({ modeLabel = "AI Music Experience" }: NavbarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const links = [
    { path: "/", label: "Home" },
    { path: "/room", label: "Studio Room" },
    { path: "/dashboard", label: "AI Lab" },
    { path: "/summary", label: "Blueprint" },
    { path: "/profile", label: "Profile" },
  ];

  return (
    <header
      style={{
        borderBottom: "1px solid #E2E8F0",
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        height: 64,
        boxShadow: "0 2px 10px rgba(15, 23, 42, 0.03)",
      }}
    >
      {/* Brand Identity */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "linear-gradient(135deg, #4F46E5, #635BFF)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF",
            boxShadow: "0 4px 12px rgba(79, 70, 229, 0.22)",
          }}>
            <Music size={18} />
          </div>
          <span style={{ color: "#0F172A", fontSize: "1.1rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Music Mirror
          </span>
        </Link>
        <span style={{
          fontSize: "0.68rem",
          fontWeight: 700,
          color: "#4F46E5",
          background: "#EEF2FF",
          padding: "2px 8px",
          borderRadius: "999px",
          border: "1px solid #C7D2FE"
        }}>
          v2.0
        </span>
      </div>

      {/* Navigation Pills */}
      <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {links.map((link) => {
          const isActive = currentPath === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              style={{
                padding: "8px 16px",
                borderRadius: "999px",
                fontSize: "0.84rem",
                fontWeight: isActive ? 700 : 600,
                color: isActive ? "#4F46E5" : "#475569",
                background: isActive ? "#EEF2FF" : "transparent",
                border: isActive ? "1px solid #C7D2FE" : "1px solid transparent",
                textDecoration: "none",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Right Status Badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#F8FAFC", padding: "6px 14px", borderRadius: "999px", border: "1px solid #E2E8F0" }}>
        <Sparkles size={14} style={{ color: "#4F46E5" }} />
        <span style={{ fontSize: "0.78rem", color: "#334155", fontWeight: 700 }}>
          {modeLabel}
        </span>
      </div>
    </header>
  );
}
