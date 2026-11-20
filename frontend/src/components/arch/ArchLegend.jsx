import React from 'react'

const COLOR_KEYS = [
  { color: '#8b5cf6', label: 'Client / Dashboard' },
  { color: '#2563eb', label: 'Application Services' },
  { color: '#10b981', label: 'Tail-Sampling / Active Pipelines' },
  { color: '#06b6d4', label: 'Database (Span Storage)' },
  { color: '#0d9488', label: 'Object Storage (Cold S3)' },
  { color: '#ef4444', label: 'Error Flow (100% Retained)' },
]

export default function ArchLegend() {
  return (
    <div
      className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-2.5 border-t border-white/5 flex-shrink-0 z-10"
      style={{ background: '#080b13' }}
    >
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
        Architecture Legend
      </span>

      <div className="w-px h-3.5 bg-white/10" />

      {COLOR_KEYS.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ background: item.color, boxShadow: `0 0 6px ${item.color}80` }}
          />
          <span className="text-xs text-slate-400">{item.label}</span>
        </div>
      ))}

      <div className="w-px h-3.5 bg-white/10" />

      {/* Streaming Particles Indicator */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" style={{ animationDelay: '0.2s' }} />
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
        </div>
        <span className="text-xs text-slate-400">Animated Data Packets</span>
      </div>

      <div className="w-px h-3.5 bg-white/10" />

      {/* Implementation Status Badges */}
      <div className="flex items-center gap-3 text-xs font-mono">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-emerald-400 font-semibold">Active Sampling</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-blue-400 font-semibold">Batch Processor</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-500" />
          <span className="text-slate-400 font-semibold">External Indexer (Planned)</span>
        </div>
      </div>
    </div>
  )
}
