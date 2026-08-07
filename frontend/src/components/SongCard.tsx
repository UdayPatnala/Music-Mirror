import { useState } from "react";
import { Heart } from "lucide-react";
import type { Song } from "../types";

interface Props {
  isActive:        boolean;
  isFavorite:      boolean;
  onPlay:          (song: Song) => void;
  onToggleFavorite:(song: Song) => void;
  song:            Song;
}

const ART_COLORS = [
  "#7c3aed","#0891b2","#be185d","#b45309","#065f46","#1d4ed8","#9d174d",
];

function artColor(title: string): string {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) & 0xffffffff;
  return ART_COLORS[Math.abs(h) % ART_COLORS.length];
}

export default function SongCard({ isActive, isFavorite, onPlay, onToggleFavorite, song }: Props) {
  const [imgErr, setImgErr] = useState(false);
  const title  = song.title || song.name || "Unknown";
  const artist = song.artist || "Unknown Artist";
  const art    = !imgErr && song.album_art ? song.album_art : null;
  const bg     = artColor(title);

  return (
    <article
      className={`qc ${isActive ? "qc--active" : ""}`}
      onClick={() => onPlay(song)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onPlay(song)}
      aria-label={`Play ${title} by ${artist}`}
    >
      {/* Album art */}
      <div className="qc-art" style={{ background: bg }}>
        {art ? (
          <img src={art} alt={title} onError={() => setImgErr(true)} />
        ) : (
          <span className="qc-art-initial">{title[0]?.toUpperCase()}</span>
        )}
        {isActive && <span className="qc-playing-dot" />}
      </div>

      {/* Info */}
      <div className="qc-info">
        <p className="qc-title">{title}</p>
        <p className="qc-artist">{artist}</p>
      </div>

      {/* Favorite */}
      <button
        className={`qc-fav ${isFavorite ? "qc-fav--active" : ""}`}
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(song); }}
        type="button"
        aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Heart size={15} fill={isFavorite ? "currentColor" : "none"} />
      </button>
    </article>
  );
}
