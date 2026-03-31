const displayEmotionMap = {
  happy: "HAPPY 😊",
  sad: "SAD 😔",
  angry: "ANGRY 😡",
  neutral: "NEUTRAL 😌",
  surprised: "SURPRISE 😲",
};

export default function EmotionCard({ emotion }) {
  return (
    <div className="card">
      <p className="emotion-title">Detected Emotion</p>
      <p className={`emotion ${emotion}`}>
        {displayEmotionMap[emotion] || emotion.toUpperCase()}
      </p>
    </div>
  );
}
