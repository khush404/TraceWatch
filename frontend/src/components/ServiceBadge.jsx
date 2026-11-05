import React from 'react'
import clsx from 'clsx'

const statusColors = {
  healthy: 'bg-status-success/10 text-status-success border-status-success/30',
  unhealthy: 'bg-status-error/10 text-status-error border-status-error/30',
  degraded: 'bg-status-warning/10 text-status-warning border-status-warning/30',
  unreachable: 'bg-bg-border text-text-muted border-bg-border',
  unknown: 'bg-bg-border text-text-muted border-bg-border',
}

const statusDot = {
  healthy: 'bg-status-success',
  unhealthy: 'bg-status-error',
  degraded: 'bg-status-warning',
  unreachable: 'bg-text-muted',
  unknown: 'bg-text-muted',
}

export default function ServiceBadge({ status }) {
  const s = (status || 'unknown').toLowerCase()
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium', statusColors[s] || statusColors.unknown)}>
      <span className={clsx('w-1.5 h-1.5 rounded-full', statusDot[s] || statusDot.unknown)} />
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  )
}
