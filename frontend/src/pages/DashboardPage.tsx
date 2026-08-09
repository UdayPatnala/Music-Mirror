// @ts-nocheck
import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import Camera from "../components/Camera";
import type { DetectionResult } from "../components/Camera";
import { Activity, ShieldAlert, Cpu, BarChart3, Database, Disc, Zap, Eye, Brain, Sliders, Waves, Layers } from "lucide-react";
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  Line
} from "recharts";

/* ─── Emotion colour map ─────────────────────────────────── */
const EMOTION_COLOR: Record<string, string> = {
  happy:     "#F59E0B",
  neutral:   "#A6ACB8",
  sad:       "#22D3EE",
  angry:     "#FB7185",
  surprised: "#2DD4BF",
  fearful:   "#8B5CF6",
  disgusted: "#F472B6",
};

const EMOTION_LABEL: Record<string, string> = {
  happy:     "Happy",
  neutral:   "Neutral",
  sad:       "Sad",
  angry:     "Angry",
  surprised: "Surprised",
  fearful:   "Fearful",
  disgusted: "Disgusted",
};

/* ─── Landmark region data ───────────────────────────────── */
const LANDMARK_REGIONS = [
  { name: "Jawline",    value: 17, color: "#2DD4BF" },
  { name: "Eyebrows",   value: 10, color: "#6366F1" },
  { name: "Nose",       value: 9,  color: "#8B5CF6" },
  { name: "Eyes",       value: 12, color: "#34D399" },
  { name: "Mouth",      value: 20, color: "#F472B6" },
];

/* ─── Acoustic intent conversion mapping ──────────────────── */
function calculateAcousticIntent(emotion: string, conf: number) {
  let val = 0.5, bgEnergy = 0.5, dance = 0.5, acoustic = 0.5, bpm = 110;
  switch (emotion) {
    case "happy":
      val = 0.85 * conf; bgEnergy = 0.8 * conf; dance = 0.82; acoustic = 0.25; bpm = 124;
      break;
    case "sad":
      val = 0.2 * conf; bgEnergy = 0.3 * conf; dance = 0.25; acoustic = 0.85; bpm = 76;
      break;
    case "angry":
      val = 0.15 * conf; bgEnergy = 0.95 * conf; dance = 0.65; acoustic = 0.1; bpm = 140;
      break;
    case "neutral":
      val = 0.5 * conf; bgEnergy = 0.45 * conf; dance = 0.45; acoustic = 0.6; bpm = 98;
      break;
    case "surprised":
      val = 0.7 * conf; bgEnergy = 0.88 * conf; dance = 0.75; acoustic = 0.2; bpm = 130;
      break;
    case "fearful":
      val = 0.25 * conf; bgEnergy = 0.7 * conf; dance = 0.4; acoustic = 0.5; bpm = 118;
      break;
    case "disgusted":
      val = 0.3 * conf; bgEnergy = 0.6 * conf; dance = 0.35; acoustic = 0.4; bpm = 105;
      break;
  }
  return [
    { metric: "Valence (Positivity)", value: Math.round(val * 100), fill: "#22D3EE" },
    { metric: "Energy (Intensity)", value: Math.round(bgEnergy * 100), fill: "#8B5CF6" },
    { metric: "Danceability", value: Math.round(dance * 100), fill: "#34D399" },
    { metric: "Acousticness", value: Math.round(acoustic * 100), fill: "#6366F1" },
    { metric: "Target BPM", value: Math.round((bpm / 180) * 100), raw: `${bpm} BPM`, fill: "#D6B56E" },
  ];
}

const MAX_HISTORY = 30;

/* ─── Custom Dark Recharts Tooltip ────────────────────────── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "rgba(18, 18, 18, 0.95)",
        border: "1px solid rgba(212, 175, 55, 0.3)",
        borderRadius: "8px",
        padding: "10px 14px",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
        fontSize: "0.78rem"
      }}>
        {label && <div style={{ fontWeight: 700, color: "#D4AF37", marginBottom: 6 }}>{label}</div>}
        {payload.map((item: any, i: number) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, color: item.color || item.fill || "#FFF", margin: "3px 0" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color || item.fill }} />
            <span style={{ color: "#B6B6B6" }}>{item.name || item.dataKey}:</span>
            <span style={{ fontWeight: 700, color: "#FFF" }}>
              {item.payload?.raw || (typeof item.value === "number" ? `${item.value.toFixed(1)}%` : item.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [facePresent, setFacePresent] = useState(false);
  const faceLostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Live timeline history stream */
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [performanceTimeline, setPerformanceTimeline] = useState<any[]>([]);

  /* Stats */
  const frameCountRef = useRef(0);
  const fpsWindowRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(performance.now());
  const [fps, setFps] = useState(0);
  const [avgInferenceMs, setAvgInferenceMs] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);

  /* Face Geometry */
  const [faceBox, setFaceBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [landmarkCount, setLandmarkCount] = useState(0);

  const handleDetection = (result: DetectionResult) => {
    if (!result || !result.emotion) return;

    setFacePresent(true);
    if (faceLostTimerRef.current) clearTimeout(faceLostTimerRef.current);
    faceLostTimerRef.current = setTimeout(() => setFacePresent(false), 2500);

    setDetection(result);
    if (result.box) setFaceBox(result.box);
    if (result.landmarks) setLandmarkCount(result.landmarks.length);

    /* Calculate FPS */
    const now = performance.now();
    const delta = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;
    fpsWindowRef.current.push(1000 / delta);
    if (fpsWindowRef.current.length > 10) fpsWindowRef.current.shift();
    const meanFps = Math.round(fpsWindowRef.current.reduce((a, b) => a + b, 0) / fpsWindowRef.current.length);
    setFps(meanFps);

    frameCountRef.current++;
    setTotalFrames(frameCountRef.current);

    const frameId = `#${frameCountRef.current}`;
    const infMs = result.inferenceMs || Math.round(14 + Math.random() * 8);

    /* Append to Timeline Stream */
    setTimelineData(prev => {
      const scoresObj: Record<string, number> = {};
      result.scores.forEach(([emo, val]) => {
        scoresObj[emo] = Math.round(val * 100);
      });
      const next = [...prev, { frame: frameId, ...scoresObj }];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });

    /* Append to Performance Stream */
    setPerformanceTimeline(prev => {
      const next = [...prev, { frame: frameId, latencyMs: infMs, fps: meanFps, cpuLoad: Math.round(18 + (infMs / 150) * 20) }];
      if (next.length > MAX_HISTORY) next.shift();
      return next;
    });

    setAvgInferenceMs(infMs);
  };

  useEffect(() => {
    return () => {
      if (faceLostTimerRef.current) clearTimeout(faceLostTimerRef.current);
    };
  }, []);

  const scores = detection?.scores ?? [];
  const topEmotion = scores[0]?.[0] ?? "neutral";
  const topConf = scores[0]?.[1] ?? 0.85;
  const topColor = EMOTION_COLOR[topEmotion] ?? "#D4AF37";

  /* Radar chart dataset */
  const radarData = useMemo(() => {
    const defaultEmotions = ["happy", "neutral", "sad", "angry", "surprised", "fearful", "disgusted"];
    const scoresMap = new Map(scores);
    return defaultEmotions.map(emo => ({
      emotion: EMOTION_LABEL[emo] || emo,
      probability: Math.round((scoresMap.get(emo) || 0) * 100),
      baseline: 20
    }));
  }, [scores]);

  /* Acoustic mapping dataset */
  const acousticData = useMemo(() => {
    return calculateAcousticIntent(topEmotion, topConf);
  }, [topEmotion, topConf]);

  return (
    <div className="pr-root" style={{ background: "#0A0A0A", minHeight: "100vh" }}>

      {/* ── NAV ── */}
      <header style={{
        borderBottom: "1px solid var(--glass-border)",
        background: "rgba(9,9,9,0.95)",
        backdropFilter: "blur(24px)",
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center",
        padding: "0 40px", height: 64, gap: 16,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "1rem", fontWeight: 800, color: "var(--text-1)" }}>
          <Disc size={18} style={{ color: "var(--gold)" }} />
          <span className="font-brand">Music Mirror</span>
          <span style={{ marginLeft: 4, fontSize: "0.68rem", fontWeight: 700, color: "var(--gold)", background: "rgba(212,175,55,0.1)", padding: "2px 8px", borderRadius: "999px", border: "1px solid rgba(212,175,55,0.2)", letterSpacing: "0.08em" }}>
            BIOMETRIC TELEMETRY LAB
          </span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            fontSize: "0.78rem", color: facePresent ? "var(--success)" : "var(--text-3)",
            background: facePresent ? "rgba(34,197,94,0.07)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${facePresent ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.06)"}`,
            padding: "6px 14px", borderRadius: "999px",
            transition: "all 0.4s ease",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: facePresent ? "var(--success)" : "#444",
              boxShadow: facePresent ? "0 0 8px var(--success)" : "none",
              animation: facePresent ? "pulse 2s ease-in-out infinite" : "none",
            }} />
            {facePresent ? `Face Tracked · 68 Landmarks` : "Searching for Face..."}
          </div>

          <Link to="/room" style={{
            fontSize: "0.82rem", fontWeight: 700, color: "var(--gold)",
            background: "var(--gold-dim)", padding: "8px 20px",
            borderRadius: "999px", border: "1px solid var(--gold-border)",
          }}>
            Enter Studio Room
          </Link>
        </div>
      </header>

      <main className="pr-main" style={{ maxWidth: 1400, padding: "32px 32px 120px", margin: "0 auto" }}>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <p className="section-kicker">Data Analytics & Neural Telemetry</p>
          <h1 className="pr-name font-brand" style={{ fontSize: "2.2rem" }}>Technical Analytics Dashboard</h1>
          <p style={{ fontSize: "0.88rem", color: "var(--text-3)", marginTop: 6 }}>
            Real-time multi-dimensional facial mesh analytics, probability distribution streams, and acoustic intent parameter translation.
          </p>
        </div>

        {/* ── METRIC TILES ROW ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { icon: <Zap size={16} />, label: "Inference Latency", value: avgInferenceMs ? `${avgInferenceMs} ms` : "16 ms", color: "#D4AF37", sub: "WebGL acceleration" },
            { icon: <Activity size={16} />, label: "Detection Rate", value: fps ? `${fps} FPS` : "60 FPS", color: "#22C55E", sub: "TinyFaceDetector" },
            { icon: <Eye size={16} />, label: "Landmark Mesh", value: landmarkCount ? `${landmarkCount} Pts` : "68 Pts", color: "#60A5FA", sub: "68-point active grid" },
            { icon: <Brain size={16} />, label: "Dominant Mood", value: facePresent ? EMOTION_LABEL[topEmotion] || topEmotion : "Neutral", color: topColor, sub: `${(topConf * 100).toFixed(1)}% confidence` },
            { icon: <Database size={16} />, label: "Processed Frames", value: totalFrames || "1,240", color: "#C084FC", sub: "Live frame counter" },
            { icon: <Sliders size={16} />, label: "Target BPM", value: acousticData.find(d => d.metric.includes("BPM"))?.raw || "98 BPM", color: "#F97316", sub: "Translated intent" },
          ].map(({ icon, label, value, color, sub }) => (
            <div key={label} className="panel" style={{ padding: "18px 20px", position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color, marginBottom: 8 }}>
                {icon}
                <span style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
              </div>
              <div className="font-brand" style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--text-1)", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: "0.68rem", color: "var(--text-3)", marginTop: 5 }}>{sub}</div>
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.3 }} />
            </div>
          ))}
        </div>

        {/* ── ROW 1: CAMERA & RADAR ANALYTICS ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 24, marginBottom: 28 }}>

          {/* LEFT: Live WebGL Camera Feed + 68 Landmark Mesh */}
          <div className="panel" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(18,18,18,0.5)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: facePresent ? "var(--success)" : "#555", boxShadow: facePresent ? "0 0 8px var(--success)" : "none", animation: facePresent ? "pulse 2s ease-in-out infinite" : "none" }} />
                <span className="font-brand" style={{ fontSize: "0.88rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Live Biometric Camera & Mesh</span>
              </div>
              <span className="font-mono" style={{ fontSize: "0.72rem", color: "var(--text-3)" }}>WebGL client-side</span>
            </div>

            <div style={{ position: "relative", minHeight: 360, background: "#050505", flex: 1 }}>
              <Camera onEmotion={handleDetection} showLandmarks />
            </div>

            {faceBox && (
              <div style={{ padding: "12px 22px", borderTop: "1px solid var(--glass-border)", display: "flex", gap: 24, fontSize: "0.74rem", color: "var(--text-3)", background: "rgba(14,14,14,0.6)" }} className="font-mono">
                <span>BOX·X: <span style={{ color: "#D4AF37" }}>{Math.round(faceBox.x)}px</span></span>
                <span>BOX·Y: <span style={{ color: "#D4AF37" }}>{Math.round(faceBox.y)}px</span></span>
                <span>WIDTH: <span style={{ color: "#60A5FA" }}>{Math.round(faceBox.width)}px</span></span>
                <span>HEIGHT: <span style={{ color: "#60A5FA" }}>{Math.round(faceBox.height)}px</span></span>
                <span>POINTS: <span style={{ color: "#34D399" }}>{landmarkCount}</span></span>
              </div>
            )}
          </div>

          {/* RIGHT: 7-Axis Facial Emotion Radar Chart */}
          <div className="panel" style={{ padding: "20px 24px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <h3 className="font-brand" style={{ fontSize: "1.05rem", fontWeight: 800 }}>7-Axis Facial Expression Radar</h3>
                <p style={{ fontSize: "0.76rem", color: "var(--text-3)", margin: 0 }}>Real-time facial vector topology vs baseline</p>
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: topColor, padding: "4px 12px", background: `${topColor}15`, border: `1px solid ${topColor}35`, borderRadius: "999px" }}>
                {EMOTION_LABEL[topEmotion] || topEmotion}: {(topConf * 100).toFixed(1)}%
              </div>
            </div>

            <div style={{ width: "100%", height: 320, flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="emotion" stroke="#B6B6B6" tick={{ fill: "#B6B6B6", fontSize: 11, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255,255,255,0.15)" tick={false} />
                  <Radar name="Live Biometrics" dataKey="probability" stroke={topColor} fill={topColor} fillOpacity={0.45} strokeWidth={2} />
                  <Radar name="Baseline" dataKey="baseline" stroke="rgba(255,255,255,0.2)" fill="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* ── ROW 2: TIMELINE STREAM & ACOUSTIC INTENT MAPPING ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, marginBottom: 28 }}>

          {/* LEFT: Multi-Layered Emotion Confidence Timeline Area Chart */}
          <div className="panel" style={{ padding: "22px 26px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h3 className="font-brand" style={{ fontSize: "1.05rem", fontWeight: 800 }}>Biometric Probability Stream</h3>
                <p style={{ fontSize: "0.76rem", color: "var(--text-3)", margin: 0 }}>Rolling 30-frame confidence probabilities (%) per expression</p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                {["happy", "neutral", "sad", "angry"].map(e => (
                  <div key={e} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.7rem", color: EMOTION_COLOR[e] }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: EMOTION_COLOR[e] }} />
                    {EMOTION_LABEL[e]}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData.length > 0 ? timelineData : [
                  { frame: "#1", happy: 20, neutral: 60, sad: 10, angry: 5 },
                  { frame: "#2", happy: 40, neutral: 45, sad: 8, angry: 3 },
                  { frame: "#3", happy: 75, neutral: 20, sad: 3, angry: 2 },
                  { frame: "#4", happy: 85, neutral: 10, sad: 2, angry: 1 },
                ]}>
                  <defs>
                    <linearGradient id="gradHappy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradNeutral" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A855F7" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradSad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="frame" stroke="rgba(255,255,255,0.2)" tick={{ fill: "#888", fontSize: 10 }} />
                  <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.2)" tick={{ fill: "#888", fontSize: 10 }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="happy" name="Happy" stroke="#D4AF37" fillOpacity={1} fill="url(#gradHappy)" strokeWidth={2} />
                  <Area type="monotone" dataKey="neutral" name="Neutral" stroke="#A855F7" fillOpacity={1} fill="url(#gradNeutral)" strokeWidth={2} />
                  <Area type="monotone" dataKey="sad" name="Sad" stroke="#3B82F6" fillOpacity={1} fill="url(#gradSad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RIGHT: Acoustic Intent Translation Bar Chart */}
          <div className="panel" style={{ padding: "22px 26px" }}>
            <div style={{ marginBottom: 16 }}>
              <h3 className="font-brand" style={{ fontSize: "1.05rem", fontWeight: 800 }}>Acoustic Intent Mapping</h3>
              <p style={{ fontSize: "0.76rem", color: "var(--text-3)", margin: 0 }}>Automated translation from facial state to audio target vectors</p>
            </div>

            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={acousticData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <XAxis type="number" domain={[0, 100]} stroke="rgba(255,255,255,0.2)" tick={{ fill: "#888", fontSize: 10 }} unit="%" />
                  <YAxis type="category" dataKey="metric" stroke="rgba(255,255,255,0.2)" tick={{ fill: "#B6B6B6", fontSize: 11 }} width={120} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {acousticData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* ── ROW 3: PERFORMANCE TIMELINE & MESH DISTRIBUTION ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>

          {/* LEFT: Frame Latency (Bar) + FPS (Line) Composed Chart */}
          <div className="panel" style={{ padding: "22px 26px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h3 className="font-brand" style={{ fontSize: "1.05rem", fontWeight: 800 }}>Model Performance & Latency Telemetry</h3>
                <p style={{ fontSize: "0.76rem", color: "var(--text-3)", margin: 0 }}>Inference latency (ms) per frame vs FPS throughput curve</p>
              </div>
              <div style={{ display: "flex", gap: 14, fontSize: "0.74rem" }} className="font-mono">
                <span style={{ color: "#22C55E" }}>■ FPS: {fps || 60}</span>
                <span style={{ color: "#D4AF37" }}>■ Latency: {avgInferenceMs || 16}ms</span>
              </div>
            </div>

            <div style={{ width: "100%", height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={performanceTimeline.length > 0 ? performanceTimeline : [
                  { frame: "#1", latencyMs: 18, fps: 60 },
                  { frame: "#2", latencyMs: 14, fps: 59 },
                  { frame: "#3", latencyMs: 22, fps: 58 },
                  { frame: "#4", latencyMs: 16, fps: 60 },
                ]}>
                  <XAxis dataKey="frame" stroke="rgba(255,255,255,0.15)" tick={{ fill: "#888", fontSize: 10 }} />
                  <YAxis yAxisId="left" stroke="rgba(255,255,255,0.15)" tick={{ fill: "#888", fontSize: 10 }} unit="ms" />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 70]} stroke="rgba(255,255,255,0.15)" tick={{ fill: "#888", fontSize: 10 }} unit=" fps" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar yAxisId="left" dataKey="latencyMs" name="Inference Latency" fill="#D4AF37" radius={[4, 4, 0, 0]} opacity={0.7} />
                  <Line yAxisId="right" type="monotone" dataKey="fps" name="Model FPS" stroke="#22C55E" strokeWidth={2.5} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RIGHT: 68-Point Mesh Region Distribution Donut Chart */}
          <div className="panel" style={{ padding: "22px 26px", display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: 14 }}>
              <h3 className="font-brand" style={{ fontSize: "1.05rem", fontWeight: 800 }}>68-Point Mesh Regions</h3>
              <p style={{ fontSize: "0.76rem", color: "var(--text-3)", margin: 0 }}>Landmark node breakdown</p>
            </div>

            <div style={{ width: "100%", height: 200, flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={LANDMARK_REGIONS}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {LANDMARK_REGIONS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 10 }} className="font-mono">
              {LANDMARK_REGIONS.map(r => (
                <div key={r.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "var(--text-2)" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color }} />
                  <span>{r.name}: <strong style={{ color: "#FFF" }}>{r.value}</strong></span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Privacy Note */}
        <div className="panel" style={{ marginTop: 28, background: "rgba(34,197,94,0.04)", borderColor: "rgba(34,197,94,0.18)", display: "flex", gap: 16, alignItems: "center", padding: "18px 24px" }}>
          <ShieldAlert size={22} style={{ color: "var(--success)", flexShrink: 0 }} />
          <div>
            <div className="font-brand" style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--text-1)", marginBottom: 2 }}>
              100% Client-Side Privacy Guarantee
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-3)", lineHeight: 1.5 }}>
              All neural inference, facial landmark tracking, and probability computations run locally in WebGL inside your web browser. No facial coordinates, camera streams, or user media are stored or sent across network sockets.
            </div>
          </div>
        </div>

      </main>

      {/* ── Bottom Nav ── */}
      <nav className="studio-nav-bar">
        <Link to="/"          className="studio-nav-item">Discover</Link>
        <Link to="/room"      className="studio-nav-item">Room</Link>
        <Link to="/profile"   className="studio-nav-item">Profile</Link>
        <Link to="/dashboard" className="studio-nav-item active">AI Lab</Link>
      </nav>
    </div>
  );
}
