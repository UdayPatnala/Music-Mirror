import { emotionLabels } from "../config/emotionLabels";

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

interface EmotionDetection {
  emotion: string;
  confidence: number;
  scores?: [string, number][];
  source?: string;
}

interface EmotionCardProps {
  detection: EmotionDetection;
  playlistEmotion?: string;
}

export default function EmotionCard({ detection, playlistEmotion }: EmotionCardProps) {
  const detectedLabel = detection.emotion
    ? emotionLabels[detection.emotion] || detection.emotion
    : "Waiting";
  const playlistLabel = playlistEmotion
    ? emotionLabels[playlistEmotion] || playlistEmotion
    : "";
  const mapped = playlistEmotion && playlistEmotion !== detection.emotion;

  return (
    <section className="panel emotion-panel">
      <div className="section-header">
        <div>
          <p className="section-kicker">Mood read</p>
          <h3>{detectedLabel}</h3>
        </div>

        <p className="section-copy">
          {detection.emotion
            ? detection.source === "manual"
              ? "Manually selected mood override is active."
              : `Camera confidence is ${formatPercent(detection.confidence)}.`
            : "The system is waiting for a readable face or a manual mood choice."}
        </p>
      </div>

      <div className="emotion-hero">
        <div
          className={`emotion-orb ${
            playlistEmotion || detection.emotion || "neutral"
          }`}
        />
        <div>
          <p className="emotion-heading">Detected emotion</p>
          <h4>{detectedLabel}</h4>
          <p className="emotion-summary">
            {playlistLabel
              ? mapped
                ? `Using ${playlistLabel.toLowerCase()} music as the closest listening lane for this expression.`
                : `Queue tuned directly for a ${playlistLabel.toLowerCase()} reading.`
              : "Trigger the camera or select a mood to begin."}
          </p>
        </div>
      </div>

      {detection.scores && detection.scores.length > 0 && (
        <div className="score-stack">
          {detection.scores.map(([emotion, score]) => (
            <div className="score-row" key={emotion}>
              <span>{emotionLabels[emotion] || emotion}</span>
              <div className="score-meter">
                <div
                  className="score-fill"
                  style={{ width: formatPercent(score) }}
                />
              </div>
              <strong>{formatPercent(score)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
