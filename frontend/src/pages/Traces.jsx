import React, { useState, useEffect, useCallback } from 'react'
import { GitBranch, RefreshCw, ChevronDown, ChevronRight, Clock, AlertCircle } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import { fetchJaegerTraces, fetchJaegerServices } from '../hooks/useApi'

const JAEGER_URL = import.meta.env.VITE_JAEGER_URL || 'http://localhost:16686'

function SpanBar({ span, rootStart, totalDuration }) {
  const start = (span.startTime / 1000 - rootStart) / totalDuration * 100
  const duration = (span.duration / 1000) / totalDuration * 100
  const isError = span.tags?.some(t => t.key === 'error' && t.value)

  return (
    <div className="flex items-center gap-3 py-1.5 hover:bg-bg-secondary/50 rounded px-2">
      <div className="w-48 flex-shrink-0 text-xs text-text-secondary truncate pl-2" style={{ paddingLeft: `${(span.depth || 0) * 16 + 8}px` }}>
        {span.operationName}
      </div>
      <div className="flex-1 relative h-5 bg-bg-secondary rounded">
        <div
          className={`absolute h-full rounded text-xs flex items-center px-1 ${isError ? 'bg-status-error/60' : 'bg-accent-primary/60'}`}
          style={{ left: `${Math.min(Math.max(start, 0), 95)}%`, width: `${Math.max(duration, 1)}%` }}
        />
      </div>
      <div className="w-20 text-right text-xs font-mono text-text-muted">
        {(span.duration / 1000).toFixed(2)}ms
      </div>
      <div className="w-24 text-xs font-mono text-text-muted truncate">
        {span.processID}
      </div>
    </div>
  )
}

function TraceDetail({ trace }) {
  if (!trace) return null

  const spans = trace.spans || []
  const rootSpan = spans.find(s => !s.references?.length) || spans[0]
  const rootStart = rootSpan ? rootSpan.startTime / 1000 : 0
  const totalDurationMs = trace.duration ? trace.duration / 1000 : 1

  const spanMap = {}
  spans.forEach(s => { spanMap[s.spanID] = { ...s, depth: 0, children: [] } })
  spans.forEach(s => {
    const parentRef = s.references?.find(r => r.refType === 'CHILD_OF')
    if (parentRef && spanMap[parentRef.spanID]) {
      spanMap[parentRef.spanID].children.push(s.spanID)
    }
  })

  function assignDepths(spanId, depth) {
    if (spanMap[spanId]) {
      spanMap[spanId].depth = depth
      spanMap[spanId].children.forEach(cid => assignDepths(cid, depth + 1))
    }
  }
  if (rootSpan) assignDepths(rootSpan.spanID, 0)

  const sortedSpans = Object.values(spanMap).sort((a, b) => a.startTime - b.startTime)
  const services = [...new Set(spans.map(s => trace.processes?.[s.processID]?.serviceName).filter(Boolean))]
  const errorSpans = spans.filter(s => s.tags?.some(t => t.key === 'error' && t.value))

  return (
    <div className="bg-bg-card border border-bg-border rounded-xl p-5 mt-4">
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div>
          <span className="text-xs text-text-muted">Trace ID</span>
          <div className="text-xs font-mono text-accent-primary">{trace.traceID?.slice(0, 24)}...</div>
        </div>
        <div>
          <span className="text-xs text-text-muted">Duration</span>
          <div className="text-xs font-mono text-text-primary">{(totalDurationMs).toFixed(2)}ms</div>
        </div>
        <div>
          <span className="text-xs text-text-muted">Spans</span>
          <div className="text-xs font-mono text-text-primary">{spans.length}</div>
        </div>
        <div>
          <span className="text-xs text-text-muted">Services</span>
          <div className="flex gap-1 flex-wrap mt-0.5">
            {services.map(s => (
              <span key={s} className="px-2 py-0.5 bg-accent-primary/10 border border-accent-primary/20 text-accent-primary text-xs rounded-full">{s}</span>
            ))}
          </div>
        </div>
        {errorSpans.length > 0 && (
          <div className="flex items-center gap-1 text-status-error text-xs">
            <AlertCircle className="w-3.5 h-3.5" />
            {errorSpans.length} error span(s)
          </div>
        )}
      </div>
      <div className="border border-bg-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 py-2 px-2 bg-bg-secondary text-xs text-text-muted border-b border-bg-border">
          <div className="w-48 pl-2">Operation</div>
          <div className="flex-1">Timeline</div>
          <div className="w-20 text-right">Duration</div>
          <div className="w-24">Service</div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {sortedSpans.map(span => (
            <SpanBar
              key={span.spanID}
              span={span}
              rootStart={rootStart}
              totalDuration={totalDurationMs}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Traces() {
  const [traces, setTraces] = useState([])
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState('api-gateway')
  const [selectedTrace, setSelectedTrace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [svcList, traceList] = await Promise.all([
        fetchJaegerServices(),
        fetchJaegerTraces(selectedService, 20)
      ])
      setServices(svcList)
      setTraces(traceList)
    } catch (e) {
      setError('Could not connect to Jaeger. Make sure it is running on port 16686.')
    } finally {
      setLoading(false)
    }
  }, [selectedService])

  useEffect(() => { loadData() }, [loadData])

  const formatDuration = (us) => {
    if (!us) return '—'
    const ms = us / 1000
    return ms < 1000 ? `${ms.toFixed(2)}ms` : `${(ms / 1000).toFixed(2)}s`
  }

  const hasError = (trace) => trace.spans?.some(s => s.tags?.some(t => t.key === 'error' && t.value))

  return (
    <div className="p-6">
      <PageHeader
        title="Distributed Traces"
        subtitle="Inspect trace spans across microservices via Jaeger"
        action={
          <div className="flex items-center gap-2">
            <select
              value={selectedService}
              onChange={e => { setSelectedService(e.target.value); setSelectedTrace(null) }}
              className="bg-bg-card border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
            >
              {['api-gateway', 'auth-service', 'order-service', 'payment-service', 'notification-service'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
              {services.filter(s => !['api-gateway','auth-service','order-service','payment-service','notification-service'].includes(s)).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-3 py-2 bg-bg-card border border-bg-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-accent-primary transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <a
              href={`${JAEGER_URL}/search?service=${selectedService}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-accent-primary/10 border border-accent-primary/30 rounded-lg text-sm text-accent-primary hover:bg-accent-primary/20 transition-all"
            >
              Open Jaeger ↗
            </a>
          </div>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : error ? (
        <div className="bg-bg-card border border-status-error/30 rounded-xl p-8 text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-status-error opacity-50" />
          <p className="text-text-muted text-sm">{error}</p>
        </div>
      ) : traces.length === 0 ? (
        <div className="bg-bg-card border border-bg-border rounded-xl p-12 text-center">
          <GitBranch className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-30" />
          <p className="text-text-muted text-sm">No traces found for <span className="text-accent-primary font-mono">{selectedService}</span></p>
          <p className="text-xs text-text-muted mt-2">Generate traffic using the Simulate page to create traces.</p>
        </div>
      ) : (
        <div className="bg-bg-card border border-bg-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-4 py-2.5 bg-bg-secondary border-b border-bg-border text-xs text-text-muted font-medium">
            <div className="col-span-4">Trace ID</div>
            <div className="col-span-2">Root Operation</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-2">Spans</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Started</div>
          </div>
          {traces.map(trace => (
            <div key={trace.traceID}>
              <div
                className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-bg-border hover:bg-bg-secondary/50 cursor-pointer transition-all"
                onClick={() => setSelectedTrace(selectedTrace?.traceID === trace.traceID ? null : trace)}
              >
                <div className="col-span-4 font-mono text-xs text-accent-primary truncate">{trace.traceID?.slice(0, 24)}...</div>
                <div className="col-span-2 text-xs text-text-primary truncate">{trace.spans?.[0]?.operationName || '—'}</div>
                <div className="col-span-2 text-xs font-mono text-text-secondary">{formatDuration(trace.duration)}</div>
                <div className="col-span-2 text-xs text-text-secondary">{trace.spans?.length || 0}</div>
                <div className="col-span-1">
                  {hasError(trace) ? (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-status-error/10 text-status-error border border-status-error/30">Error</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-status-success/10 text-status-success border border-status-success/30">OK</span>
                  )}
                </div>
                <div className="col-span-1 text-xs text-text-muted">
                  {trace.spans?.[0]?.startTime
                    ? new Date(trace.spans[0].startTime / 1000).toLocaleTimeString('en-US', { hour12: false })
                    : '—'}
                </div>
              </div>
              {selectedTrace?.traceID === trace.traceID && (
                <div className="px-4 pb-4">
                  <TraceDetail trace={trace} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
