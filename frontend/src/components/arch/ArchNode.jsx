import React from 'react'

export const NODE_W = 186
export const NODE_H = 88

const ICONS = {
  monitor: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  server: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  ),
  gear: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  database: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  storage: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  shield: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  bell: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
}

export default function ArchNode({
  node,
  status,
  metrics,
  selected,
  hovered,
  dimmed,
  onClick,
  onMouseEnter,
  onMouseLeave
}) {
  const W = NODE_W
  const H = NODE_H
  const {
    label,
    icon = 'server',
    borderColor = '#3b82f6',
    bgColor = '#0c1529',
    ledColor = '#10b981',
    metric1 = '14% busy',
    metric1Color = '#ffffff',
    metric2 = '267ms p99',
    metric3 = '0 waiting',
    metric3Color = '#94a3b8',
    sparkline = 'wave',
    progress = 35,
    progressColor = '#ef4444',
    progressSec = 0,
    progressSecColor = '#06b6d4',
    isPlanned = false,
    statusBadge = null,
  } = node

  // Live metric overrides when Prometheus data is available
  const hasLive = metrics && (metrics.rps != null || metrics.latency != null || metrics.errors != null)
  const displayM1 = hasLive
    ? (metrics.rps != null ? `${metrics.rps > 1 ? metrics.rps.toFixed(1) : (metrics.rps * 100).toFixed(0) + 'm'}/s sent` : metric1)
    : metric1
  const displayM2 = hasLive
    ? (metrics.latency != null ? `${(metrics.latency * 1000).toFixed(0)}ms p99` : metric2)
    : metric2
  const displayM3 = hasLive
    ? (metrics.errors != null && metrics.errors > 0 ? `${metrics.errors.toFixed(1)} err/s` : metric3)
    : metric3
  const displayM3Color = hasLive && metrics.errors > 0 ? '#ef4444' : metric3Color

  // Effective status LED
  let led = ledColor
  if (status === 'unhealthy' || status === 'unreachable') led = '#ef4444'
  else if (status === 'degraded') led = '#f59e0b'
  else if (status === 'healthy') led = '#10b981'

  const opacity = dimmed ? 0.2 : 1
  const scale = selected ? 1.05 : hovered ? 1.02 : 1

  // Sparkline paths
  const sparklinePaths = {
    jagged: 'M 0 10 L 8 11 L 14 3 L 20 12 L 26 2 L 32 9 L 38 4 L 46 11',
    wave:   'M 0 8 Q 8 2, 16 7 T 32 5 T 46 6',
    flat:   'M 0 8 L 46 8',
    lock:   'M 0 7 L 12 7 L 16 3 L 20 7 L 34 7 L 38 4 L 46 7',
  }
  const sparkD = sparklinePaths[sparkline] || sparklinePaths.wave

  return (
    <g
      className="arch-node select-none"
      transform={`translate(${node.x}, ${node.y}) scale(${scale})`}
      style={{
        transformOrigin: `${node.x}px ${node.y}px`,
        transition: 'opacity 0.2s, transform 0.15s',
        opacity,
        cursor: 'pointer'
      }}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Outer ambient glow */}
      {selected && (
        <rect
          x={-W / 2 - 8}
          y={-H / 2 - 8}
          width={W + 16}
          height={H + 16}
          rx={18}
          fill={borderColor}
          opacity={0.15}
        />
      )}
      {hovered && !selected && (
        <rect
          x={-W / 2 - 4}
          y={-H / 2 - 4}
          width={W + 8}
          height={H + 8}
          rx={14}
          fill={borderColor}
          opacity={0.08}
        />
      )}

      {/* Main card background */}
      <rect
        x={-W / 2}
        y={-H / 2}
        width={W}
        height={H}
        rx={10}
        fill={bgColor}
        stroke={selected ? '#ffffff' : borderColor}
        strokeWidth={selected ? 2 : 1.25}
        strokeDasharray={isPlanned ? '5,4' : undefined}
      />

      {/* Header: Icon + Label + LED */}
      <g transform={`translate(${-W / 2 + 12}, ${-H / 2 + 18})`}>
        <g fill={borderColor} stroke={borderColor} color={borderColor}>
          {ICONS[icon] || ICONS.server}
        </g>
        <text
          x={22}
          y={0}
          fill="#f1f5f9"
          fontSize={11.5}
          fontWeight={600}
          fontFamily="Inter, system-ui, sans-serif"
          letterSpacing="-0.2px"
        >
          {label}
        </text>
      </g>

      {/* Status LED with pulse */}
      <g transform={`translate(${W / 2 - 14}, ${-H / 2 + 14})`}>
        <circle r={3.5} fill={led} filter="drop-shadow(0 0 3px currentColor)" />
        <circle r={6.5} fill="none" stroke={led} strokeWidth={1} opacity={0.4}>
          <animate attributeName="r" values="3.5;7.5;3.5" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </g>

      {/* Mid Metric Row 1: Primary stat + Sparkline */}
      <text
        x={-W / 2 + 12}
        y={4}
        fontSize={11.5}
        fontWeight={700}
        fontFamily="Inter, system-ui, sans-serif"
        fill={metric1Color}
      >
        {displayM1}
      </text>

      {/* Sparkline curve */}
      <g transform={`translate(${W / 2 - 58}, ${-5})`}>
        <path
          d={sparkD}
          fill="none"
          stroke={metric1Color || '#38bdf8'}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
      </g>

      {/* Mid Metric Row 2: Secondary stat + Tertiary stat */}
      <text
        x={-W / 2 + 12}
        y={20}
        fontSize={9}
        fontWeight={500}
        fontFamily="'JetBrains Mono', monospace"
        fill="#94a3b8"
      >
        {displayM2}
      </text>

      <text
        x={W / 2 - 12}
        y={20}
        fontSize={9}
        fontWeight={500}
        fontFamily="'JetBrains Mono', monospace"
        textAnchor="end"
        fill={displayM3Color}
      >
        {displayM3}
      </text>

      {/* Bottom Meter / Progress Bar */}
      <g transform={`translate(${-W / 2 + 12}, ${H / 2 - 11})`}>
        {/* Track */}
        <rect
          x={0}
          y={0}
          width={W - 24}
          height={3}
          rx={1.5}
          fill="rgba(255, 255, 255, 0.08)"
        />

        {/* Primary indicator */}
        <rect
          x={0}
          y={0}
          width={Math.min(W - 24, Math.max(8, ((W - 24) * progress) / 100))}
          height={3}
          rx={1.5}
          fill={progressColor}
        />

        {/* Optional secondary indicator */}
        {progressSec > 0 && (
          <rect
            x={Math.min(W - 24, ((W - 24) * progress) / 100) + 3}
            y={0}
            width={Math.min((W - 24) * 0.4, ((W - 24) * progressSec) / 100)}
            height={3}
            rx={1.5}
            fill={progressSecColor}
          />
        )}
      </g>

      {/* Status Badges: IMPLEMENTED vs PLANNED */}
      {statusBadge === 'IMPLEMENTED' ? (
        <g transform={`translate(${W / 2 - 62}, ${H / 2 - 24})`}>
          <rect x={0} y={-8} width={56} height={12} rx={3} fill="rgba(16, 185, 129, 0.22)" stroke="#10b981" strokeWidth={0.7} />
          <text x={5} y={1} fill="#34d399" fontSize={6.5} fontFamily="Inter, sans-serif" fontWeight={700} letterSpacing="0.3px">
            ACTIVE
          </text>
        </g>
      ) : isPlanned ? (
        <g transform={`translate(${W / 2 - 46}, ${H / 2 - 24})`}>
          <rect x={0} y={-8} width={40} height={12} rx={3} fill="#1e293b" stroke="#334155" strokeWidth={0.5} />
          <text x={4} y={1} fill="#94a3b8" fontSize={6.5} fontFamily="Inter, sans-serif" fontWeight={700}>
            PLANNED
          </text>
        </g>
      ) : null}
    </g>
  )
}
