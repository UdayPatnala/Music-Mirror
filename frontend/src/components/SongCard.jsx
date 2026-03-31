export default function SongCard({ song }) {
  return (
    <div className="card">
      <h3 className="song-title">{song.title}</h3>
      <p className="song-artist">{song.artist}</p>

      <div className="song-links">
        <a
          href={song.spotify}
          target="_blank"
          rel="noreferrer"
          className="song-btn spotify"
        >
          🎵 Spotify
        </a>

        <a
          href={song.youtube}
          target="_blank"
          rel="noreferrer"
          className="song-btn youtube"
        >
          ▶ YouTube
        </a>
      </div>
    </div>
  );
}
