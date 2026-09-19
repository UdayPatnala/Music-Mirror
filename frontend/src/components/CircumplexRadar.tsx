import React from 'react';

interface CircumplexRadarProps {
  currentValence: number;   // 0.0 (sad) to 1.0 (happy)
  currentEnergy: number;    // 0.0 (calm) to 1.0 (intense)
  targetValence?: number;   // Optional destination for regulation
  targetEnergy?: number;
  songValence?: number;     // Optional active song acoustic point
  songEnergy?: number;
  isRegulating?: boolean;
  activeColor?: string;
  onCoordinateSelected?: (valence: number, energy: number) => void;
  size?: number;
}

export const CircumplexRadar: React.FC<CircumplexRadarProps> = ({
  currentValence,
  currentEnergy,
  targetValence,
  targetEnergy,
  songValence,
  songEnergy,
  isRegulating = false,
  activeColor = '#6366f1',
  onCoordinateSelected,
  size = 230,
}) => {
  const pad = 24;
  const innerSize = size - pad * 2;
  const center = size / 2;

  // Convert 0..1 to SVG coordinates
  const toSvgCoords = (v: number, e: number) => {
    const x = pad + Math.max(0, Math.min(1, v)) * innerSize;
    const y = pad + (1 - Math.max(0, Math.min(1, e))) * innerSize;
    return { x, y };
  };

  const currentPos = toSvgCoords(currentValence, currentEnergy);
  const targetPos =
    targetValence !== undefined && targetEnergy !== undefined
      ? toSvgCoords(targetValence, targetEnergy)
      : null;
  const songPos =
    songValence !== undefined && songEnergy !== undefined
      ? toSvgCoords(songValence, songEnergy)
      : null;

  const handleClick = (evt: React.MouseEvent<SVGSVGElement>) => {
    if (!onCoordinateSelected) return;
    const rect = evt.currentTarget.getBoundingClientRect();
    const clickX = evt.clientX - rect.left;
    const clickY = evt.clientY - rect.top;

    const normV = Math.max(0, Math.min(1, (clickX - pad) / innerSize));
    const normE = Math.max(0, Math.min(1, 1 - (clickY - pad) / innerSize));
    onCoordinateSelected(Math.round(normV * 100) / 100, Math.round(normE * 100) / 100);
  };

  return (
    <div className="circumplex-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <svg
        width={size}
        height={size}
        onClick={handleClick}
        style={{
          background: 'rgba(10, 13, 20, 0.75)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          cursor: onCoordinateSelected ? 'crosshair' : 'default',
        }}
      >
        <defs>
          <radialGradient id="radarGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={activeColor} stopOpacity="0.18" />
            <stop offset="100%" stopColor={activeColor} stopOpacity="0" />
          </radialGradient>
          <marker
            id="trajectoryArrow"
            viewBox="0 0 10 10"
            refX="6"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1 L 8 5 L 0 9 z" fill="#38bdf8" />
          </marker>
        </defs>

        {/* Ambient Center Glow */}
        <circle cx={center} cy={center} r={innerSize / 2} fill="url(#radarGlow)" />

        {/* Concentric Reference Rings */}
        <circle cx={center} cy={center} r={innerSize / 2} fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="3 3" />
        <circle cx={center} cy={center} r={innerSize / 4} fill="none" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="2 2" />

        {/* Axes */}
        <line x1={pad} y1={center} x2={size - pad} y2={center} stroke="rgba(255, 255, 255, 0.14)" strokeWidth="1" />
        <line x1={center} y1={pad} x2={center} y2={size - pad} stroke="rgba(255, 255, 255, 0.14)" strokeWidth="1" />

        {/* Quadrant Labels */}
        <text x={size - pad - 6} y={pad + 12} textAnchor="end" fill="#f59e0b" fontSize="9" fontFamily="var(--font-mono)">
          JOYFUL ⚡
        </text>
        <text x={pad + 6} y={pad + 12} textAnchor="start" fill="#f43f5e" fontSize="9" fontFamily="var(--font-mono)">
          🔥 CATHARTIC
        </text>
        <text x={pad + 6} y={size - pad - 6} textAnchor="start" fill="#a855f7" fontSize="9" fontFamily="var(--font-mono)">
          🌧 SOMBER
        </text>
        <text x={size - pad - 6} y={size - pad - 6} textAnchor="end" fill="#38bdf8" fontSize="9" fontFamily="var(--font-mono)">
          PEACEFUL 🕊️
        </text>

        {/* Axis Labels */}
        <text x={size - pad + 3} y={center + 3} fill="var(--text-muted)" fontSize="8" textAnchor="start">
          +V
        </text>
        <text x={pad - 3} y={center + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end">
          -V
        </text>
        <text x={center} y={pad - 6} fill="var(--text-muted)" fontSize="8" textAnchor="middle">
          +Energy
        </text>
        <text x={center} y={size - pad + 14} fill="var(--text-muted)" fontSize="8" textAnchor="middle">
          -Energy
        </text>

        {/* Regulation Trajectory Vector */}
        {isRegulating && targetPos && (
          <line
            x1={currentPos.x}
            y1={currentPos.y}
            x2={targetPos.x}
            y2={targetPos.y}
            stroke="#38bdf8"
            strokeWidth="1.8"
            strokeDasharray="4 4"
            markerEnd="url(#trajectoryArrow)"
          />
        )}

        {/* Target Destination Point */}
        {targetPos && isRegulating && (
          <g transform={`translate(${targetPos.x}, ${targetPos.y})`}>
            <circle r="6" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
            <circle r="10" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 2" opacity="0.8" />
          </g>
        )}

        {/* Active Song Acoustic Point */}
        {songPos && (
          <g transform={`translate(${songPos.x}, ${songPos.y})`}>
            <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill="#10b981" stroke="#fff" strokeWidth="1" />
          </g>
        )}

        {/* Current Affective Point */}
        <g transform={`translate(${currentPos.x}, ${currentPos.y})`}>
          <circle r="12" fill={activeColor} opacity="0.2" />
          <circle r="6" fill={activeColor} stroke="#ffffff" strokeWidth="2" />
        </g>
      </svg>

      <div style={{ display: 'flex', gap: '12px', fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeColor }} />
          Affect ({currentValence}, {currentEnergy})
        </span>
        {songPos && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '7px', height: '7px', background: '#10b981', transform: 'rotate(45deg)' }} />
            Song ({songValence}, {songEnergy})
          </span>
        )}
      </div>
    </div>
  );
};

export default CircumplexRadar;
