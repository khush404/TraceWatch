import React from 'react'

export default function ArchEdge({
  edge,
  from,
  to,
  highlighted = false,
  dimmed = false,
}) {
  if (!edge || !from || !to) return null

  const W = 186
  const H = 88

  // Compute edge endpoints based on custom anchor hints or default card boundary
  const startX = from.x
  const startY = from.y
  const endX   = to.x
  const endY   = to.y

  const fromAnchor = edge.fromAnchor || (endX > startX + 50 ? 'right' : 'bottom')
  const toAnchor   = edge.toAnchor   || (endX > startX + 50 ? 'left'  : 'top')

  let x1 = startX
  let y1 = startY
  if (fromAnchor === 'right')  { x1 += W / 2; }
  else if (fromAnchor === 'left')   { x1 -= W / 2; }
  else if (fromAnchor === 'bottom') { y1 += H / 2; }
  else if (fromAnchor === 'top')    { y1 -= H / 2; }

  let x2 = endX
  let y2 = endY
  if (toAnchor === 'left')   { x2 -= W / 2; }
  else if (toAnchor === 'right')  { x2 += W / 2; }
  else if (toAnchor === 'top')    { y2 -= H / 2; }
  else if (toAnchor === 'bottom') { y2 += H / 2; }

  // Generate path: If edge provides explicit points/path, use it. Otherwise, compute orthogonal or curved path
  let path = ''
  if (edge.customPath) {
    path = edge.customPath
  } else if (edge.routing === 'orthogonal' || edge.routing === 'step') {
    // Manhattan step with rounded corners
    const midX = edge.midX ?? (x1 + x2) / 2
    const midY = edge.midY ?? (y1 + y2) / 2
    const r = 8 // corner radius

    if (fromAnchor === 'right' && toAnchor === 'left') {
      if (Math.abs(y1 - y2) < 4) {
        path = `M ${x1} ${y1} L ${x2} ${y2}`
      } else {
        const signY = y2 > y1 ? 1 : -1
        path = `M ${x1} ${y1} L ${midX - r} ${y1} Q ${midX} ${y1} ${midX} ${y1 + r * signY} L ${midX} ${y2 - r * signY} Q ${midX} ${y2} ${midX + r} ${y2} L ${x2} ${y2}`
      }
    } else if (fromAnchor === 'bottom' && toAnchor === 'left') {
      path = `M ${x1} ${y1} L ${x1} ${y2 - r} Q ${x1} ${y2} ${x1 - r} ${y2} L ${x2} ${y2}`
    } else if (fromAnchor === 'bottom' && toAnchor === 'top') {
      const signX = x2 > x1 ? 1 : -1
      path = `M ${x1} ${y1} L ${x1} ${midY - r} Q ${x1} ${midY} ${x1 + r * signX} ${midY} L ${x2 - r * signX} ${midY} Q ${x2} ${midY} ${x2} ${midY + r} L ${x2} ${y2}`
    } else {
      path = `M ${x1} ${y1} C ${x1 + (x2 - x1) * 0.4} ${y1}, ${x2 - (x2 - x1) * 0.4} ${y2}, ${x2} ${y2}`
    }
  } else {
    // Default smooth curve
    const dx = x2 - x1
    const dy = y2 - y1
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const curve = Math.max(25, Math.abs(dx) * 0.25 + Math.abs(dy) * 0.15)
    path = `M ${x1} ${y1} C ${x1 + (dx / dist) * curve} ${y1 + (dy / dist) * curve}, ${x2 - (dx / dist) * curve} ${y2 - (dy / dist) * curve}, ${x2} ${y2}`
  }

  const color   = edge.color || '#475569'
  const dotColor = edge.dotColor || color
  const opacity = dimmed ? 0.08 : highlighted ? 1 : 0.65
  const strokeW = highlighted ? 2.5 : 1.5

  // Generate 4 streaming particles with staggered timing
  const dotCount = edge.animated ? (edge.dotCount || 4) : 0
  const duration = edge.duration || 3.0 // seconds

  return (
    <g opacity={opacity} style={{ transition: 'opacity 0.25s' }}>
      {/* Background glow stroke if highlighted */}
      {highlighted && (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={6}
          opacity={0.15}
        />
      )}

      {/* Main wire line */}
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeDasharray={edge.dashed ? '6 4' : undefined}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Streaming glowing particle dots along the connection */}
      {Array.from({ length: dotCount }).map((_, i) => {
        const beginDelay = -((i * duration) / dotCount)
        return (
          <circle key={i} r={highlighted ? 3.5 : 2.5} fill={dotColor} filter="drop-shadow(0 0 3px currentColor)">
            <animateMotion
              dur={`${duration}s`}
              begin={`${beginDelay}s`}
              repeatCount="indefinite"
              path={path}
              rotate="auto"
            />
          </circle>
        )
      })}

      {/* Optional edge label */}
      {edge.label && (
        <g>
          <rect
            x={(x1 + x2) / 2 - (edge.label.length * 3.5)}
            y={(y1 + y2) / 2 - 12}
            width={edge.label.length * 7 + 8}
            height={14}
            rx={3}
            fill="#080c18"
            opacity={0.85}
          />
          <text
            x={(x1 + x2) / 2}
            y={(y1 + y2) / 2 - 2}
            textAnchor="middle"
            fill={color}
            fontSize="8.5"
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="500"
          >
            {edge.label}
          </text>
        </g>
      )}
    </g>
  )
}
