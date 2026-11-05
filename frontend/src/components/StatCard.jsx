import React from 'react'
import clsx from 'clsx'

export default function StatCard({ title, value, unit, icon: Icon, color = 'primary', trend, subtitle }) {
  const colorMap = {
    primary: 'text-accent-primary bg-accent-primary/10 border-accent-primary/20',
    success: 'text-status-success bg-status-success/10 border-status-success/20',
    warning: 'text-status-warning bg-status-warning/10 border-status-warning/20',
    error: 'text-status-error bg-status-error/10 border-status-error/20',
    info: 'text-status-info bg-status-info/10 border-status-info/20',
  }

  return (
    <div className="bg-bg-card border border-bg-border rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-text-secondary font-medium">{title}</span>
        {Icon && (
          <div className={clsx('p-2 rounded-lg border', colorMap[color] || colorMap.primary)}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold text-text-primary">{value ?? '—'}</span>
        {unit && <span className="text-sm text-text-muted mb-0.5">{unit}</span>}
      </div>
      {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      {trend !== undefined && (
        <div className={clsx('text-xs font-medium', trend >= 0 ? 'text-status-success' : 'text-status-error')}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs last hour
        </div>
      )}
    </div>
  )
}
