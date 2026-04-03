const displayEmotionMap = {
  happy: "Happy",
  sad: "Sad",
  angry: "Angry",
  neutral: "Neutral",
  surprised: "Surprised",
  surprise: "Surprise",
  fearful: "Fearful",
  disgusted: "Disgusted",
};

export default function EmotionCard({ detectedEmotion, playlistEmotion }) {
  const detectedLabel =
    displayEmotionMap[detectedEmotion] || detectedEmotion.toUpperCase();
  const playlistLabel = playlistEmotion
    ? displayEmotionMap[playlistEmotion] || playlistEmotion.toUpperCase()
    : "";
  const usesFallbackCategory =
    playlistEmotion && playlistEmotion !== detectedEmotion;

  return (
    <div className="card">
      <p className="emotion-title">Detected emotion</p>
      <p className={`emotion ${detectedEmotion}`}>{detectedLabel}</p>
      {playlistLabel && (
        <p className="emotion-subtitle">
          {usesFallbackCategory
            ? `Using ${playlistLabel.toLowerCase()} recommendations for this mood.`
            : `Showing ${playlistLabel.toLowerCase()} recommendations.`}
        </p>
      )}
    </div>
  );
}
