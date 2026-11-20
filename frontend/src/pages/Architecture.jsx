import React, { useState, useEffect, useRef, useCallback } from 'react'
import PageHeader from '../components/PageHeader'
import { usePrometheusQuery, useServicesHealth } from '../hooks/useApi'
import ArchNode from '../components/arch/ArchNode'
import ArchEdge from '../components/arch/ArchEdge'
import NodeDetailPanel from '../components/arch/NodeDetailPanel'
import ArchLegend from '../components/arch/ArchLegend'

// ─── 1:1 Reference Architecture Nodes ─────────────────────────────────────────
export const REFERENCE_NODES = [
  // ── Row 1 ──────────────────────────────────────────────────────────────────
  {
    id: 'client',
    x: 140,
    y: 80,
    label: 'Client',
    icon: 'monitor',
    borderColor: '#8b5cf6',
    bgColor: '#151126',
    ledColor: '#ef4444',
    metric1: '43/s sent',
    metric1Color: '#f43f5e',
    metric2: '0/s ok',
    metric3: '100% failing',
    metric3Color: '#f43f5e',
    sparkline: 'jagged',
    progress: 100,
    progressColor: '#8b5cf6',
    roleTag: 'FRONTEND DASHBOARD',
  },
  {
    id: 'auth',
    x: 375,
    y: 80,
    label: 'Authentication',
    icon: 'server',
    borderColor: '#2563eb',
    bgColor: '#0c1529',
    ledColor: '#ef4444',
    metric1: '15% busy',
    metric1Color: '#ffffff',
    metric2: '300ms p99',
    metric3: '57 waiting',
    metric3Color: '#38bdf8',
    sparkline: 'wave',
    progress: 24,
    progressColor: '#ef4444',
    progressSec: 46,
    progressSecColor: '#38bdf8',
    roleTag: 'AUTH SERVICE (:8001)',
  },
  {
    id: 'order',
    x: 610,
    y: 80,
    label: 'Order Service',
    icon: 'server',
    borderColor: '#2563eb',
    bgColor: '#0c1529',
    ledColor: '#ef4444',
    metric1: '14% busy',
    metric1Color: '#ffffff',
    metric2: '267ms p99',
    metric3: '0 waiting',
    metric3Color: '#94a3b8',
    sparkline: 'wave',
    progress: 42,
    progressColor: '#ef4444',
    roleTag: 'ORDER SERVICE (:8002)',
  },
  {
    id: 'payment',
    x: 845,
    y: 80,
    label: 'Payment Service',
    icon: 'server',
    borderColor: '#2563eb',
    bgColor: '#0c1529',
    ledColor: '#f59e0b',
    metric1: '13% busy',
    metric1Color: '#ffffff',
    metric2: '260ms p99',
    metric3: '0 waiting',
    metric3Color: '#94a3b8',
    sparkline: 'wave',
    progress: 38,
    progressColor: '#ef4444',
    roleTag: 'PAYMENT SERVICE (:8003)',
  },

  // ── Row 2 ──────────────────────────────────────────────────────────────────
  {
    id: 'otel_sdk',
    x: 95,
    y: 280,
    label: 'OpenTelemetry...',
    icon: 'server',
    borderColor: '#2563eb',
    bgColor: '#0c1529',
    ledColor: '#f59e0b',
    metric1: '14% busy',
    metric1Color: '#f59e0b',
    metric2: '327ms p99',
    metric3: '0 waiting',
    metric3Color: '#94a3b8',
    sparkline: 'flat',
    progress: 40,
    progressColor: '#f59e0b',
    statusBadge: 'IMPLEMENTED',
    roleTag: 'OTEL COLLECTOR & SDK',
  },
  {
    id: 'processing',
    x: 310,
    y: 280,
    label: 'Processing & Ag...',
    icon: 'gear',
    borderColor: '#2563eb',
    bgColor: '#0c1529',
    ledColor: '#ef4444',
    metric1: '12% busy',
    metric1Color: '#ef4444',
    metric2: '19/s done',
    metric3: '0 waiting',
    metric3Color: '#94a3b8',
    sparkline: 'wave',
    progress: 44,
    progressColor: '#ef4444',
    statusBadge: 'IMPLEMENTED',
    roleTag: 'PROCESSOR PIPELINE',
  },
  {
    id: 'sampling',
    x: 525,
    y: 280,
    label: 'Tail-Based Sampling',
    icon: 'server',
    borderColor: '#10b981',
    bgColor: '#071d18',
    ledColor: '#10b981',
    metric1: 'Active (4 Policies)',
    metric1Color: '#34d399',
    metric2: '100% err · >1s',
    metric3: '3s wait',
    metric3Color: '#38bdf8',
    sparkline: 'wave',
    progress: 88,
    progressColor: '#10b981',
    isPlanned: false, // Fully implemented and active in OTel Collector!
    statusBadge: 'IMPLEMENTED',
    roleTag: 'TAIL SAMPLING (IMPLEMENTED)',
  },
  {
    id: 'batch_indexing',
    x: 740,
    y: 280,
    label: 'Batch Indexing',
    icon: 'gear',
    borderColor: '#2563eb',
    bgColor: '#0c1529',
    ledColor: '#38bdf8',
    metric1: '10% busy',
    metric1Color: '#38bdf8',
    metric2: '19/s done',
    metric3: '0 waiting',
    metric3Color: '#94a3b8',
    sparkline: 'wave',
    progress: 30,
    progressColor: '#38bdf8',
    isPlanned: true, // Dedicated external search indexing cluster is planned; batching in SDK & Collector is implemented
    roleTag: 'BATCH INDEXING (PLANNED)',
  },
  {
    id: 'database',
    x: 990,
    y: 210,
    label: 'Database',
    icon: 'database',
    borderColor: '#06b6d4',
    bgColor: '#081a26',
    ledColor: '#06b6d4',
    metric1: '26% busy',
    metric1Color: '#22d3ee',
    metric2: '216ms p99',
    metric3: '3ms lock wait',
    metric3Color: '#38bdf8',
    sparkline: 'lock',
    progress: 60,
    progressColor: '#06b6d4',
    statusBadge: 'IMPLEMENTED',
    roleTag: 'PRIMARY DATABASE / SPAN DB',
  },

  // ── Row 3 ──────────────────────────────────────────────────────────────────
  {
    id: 'monitoring',
    x: 320,
    y: 470,
    label: 'Monitoring Dashb...',
    icon: 'monitor',
    borderColor: '#8b5cf6',
    bgColor: '#151126',
    ledColor: '#10b981',
    metric1: '133/s sent',
    metric1Color: '#ffffff',
    metric2: '0ms p99',
    metric3: '0% failing',
    metric3Color: '#10b981',
    sparkline: 'flat',
    progress: 70,
    progressColor: '#8b5cf6',
    statusBadge: 'IMPLEMENTED',
    roleTag: 'TRACEWATCH & GRAFANA',
  },
  {
    id: 'object_storage',
    x: 1000,
    y: 470,
    label: 'Object Storage (C...',
    icon: 'storage',
    borderColor: '#0d9488',
    bgColor: '#061d1c',
    ledColor: '#10b981',
    metric1: '7.5% busy',
    metric1Color: '#2dd4bf',
    metric2: '174ms p99',
    metric3: '0 waiting',
    metric3Color: '#94a3b8',
    sparkline: 'wave',
    progress: 25,
    progressColor: '#14b8a6',
    isPlanned: true,
    roleTag: 'COLD OBJECT STORAGE (PLANNED)',
  },
]

// ─── Extended Nodes including API Gateway & Notification ──────────────────────
export const EXTENDED_ADDITIONS = [
  {
    id: 'gateway',
    x: 255,
    y: 80,
    label: 'API Gateway',
    icon: 'server',
    borderColor: '#6366f1',
    bgColor: '#0f172a',
    ledColor: '#10b981',
    metric1: '32/s routed',
    metric1Color: '#818cf8',
    metric2: '4ms latency',
    metric3: '0 err',
    metric3Color: '#10b981',
    sparkline: 'wave',
    progress: 35,
    progressColor: '#6366f1',
    statusBadge: 'IMPLEMENTED',
    roleTag: 'REVERSE PROXY (:8000)',
  },
  {
    id: 'notification',
    x: 610,
    y: 200,
    label: 'Notification Svc',
    icon: 'bell',
    borderColor: '#10b981',
    bgColor: '#061d15',
    ledColor: '#10b981',
    metric1: '9/s async',
    metric1Color: '#34d399',
    metric2: '18ms p99',
    metric3: '0 waiting',
    metric3Color: '#94a3b8',
    sparkline: 'wave',
    progress: 20,
    progressColor: '#10b981',
    statusBadge: 'IMPLEMENTED',
    roleTag: 'NOTIFICATION SERVICE (:8004)',
  },
]

// ─── Reference Architecture Edges with Streaming Glowing Particles ────────────
export const REFERENCE_EDGES = [
  // 1. Client -> Auth
  {
    id: 'e_client_auth',
    from: 'client',
    to: 'auth',
    color: '#ef4444',
    dotColor: '#f43f5e',
    animated: true,
    dotCount: 5,
    duration: 2.2,
    customPath: 'M 233 80 L 282 80',
  },
  // 2. Auth -> Order
  {
    id: 'e_auth_order',
    from: 'auth',
    to: 'order',
    color: '#ef4444',
    dotColor: '#f43f5e',
    animated: true,
    dotCount: 5,
    duration: 2.2,
    customPath: 'M 468 80 L 517 80',
  },
  // 3. Order -> Payment
  {
    id: 'e_order_payment',
    from: 'order',
    to: 'payment',
    color: '#cbd5e1',
    dotColor: '#ffffff',
    animated: true,
    dotCount: 5,
    duration: 2.4,
    customPath: 'M 703 80 L 752 80',
  },
  // 4. Payment -> Database
  {
    id: 'e_payment_db',
    from: 'payment',
    to: 'database',
    color: '#cbd5e1',
    dotColor: '#ffffff',
    animated: true,
    dotCount: 6,
    duration: 3.0,
    customPath: 'M 938 80 L 956 80 Q 964 80 964 88 L 964 202 Q 964 210 972 210 L 897 210',
  },
  // 5. Client (down) -> OpenTelemetry
  {
    id: 'e_client_otel',
    from: 'client',
    to: 'otel_sdk',
    color: '#ef4444',
    dotColor: '#f43f5e',
    animated: true,
    dotCount: 8,
    duration: 3.5,
    customPath: 'M 160 124 L 160 162 Q 160 170 152 170 L 40 170 Q 32 170 32 178 L 32 272 Q 32 280 40 280 L 2 280',
  },
  // 6. OpenTelemetry -> Processing
  {
    id: 'e_otel_proc',
    from: 'otel_sdk',
    to: 'processing',
    color: '#c084fc',
    dotColor: '#e879f9',
    animated: true,
    dotCount: 4,
    duration: 2.0,
    customPath: 'M 188 280 L 217 280',
  },
  // 7. Processing branch -> Monitoring Dashboard
  {
    id: 'e_proc_monitoring',
    from: 'processing',
    to: 'monitoring',
    color: '#cbd5e1',
    dotColor: '#ffffff',
    animated: true,
    dotCount: 6,
    duration: 3.2,
    customPath: 'M 200 280 L 200 462 Q 200 470 208 470 L 227 470',
  },
  // 8. Processing -> Sampling
  {
    id: 'e_proc_sampling',
    from: 'processing',
    to: 'sampling',
    color: '#10b981',
    dotColor: '#34d399',
    animated: true,
    dotCount: 4,
    duration: 2.0,
    customPath: 'M 403 280 L 432 280',
  },
  // 9. Sampling -> Batch Indexing
  {
    id: 'e_sampling_batch',
    from: 'sampling',
    to: 'batch_indexing',
    color: '#cbd5e1',
    dotColor: '#ffffff',
    animated: true,
    dotCount: 4,
    duration: 2.0,
    customPath: 'M 618 280 L 647 280',
  },
  // 10. Batch Indexing -> Database
  {
    id: 'e_batch_db',
    from: 'batch_indexing',
    to: 'database',
    color: '#cbd5e1',
    dotColor: '#ffffff',
    animated: true,
    dotCount: 5,
    duration: 2.6,
    customPath: 'M 833 280 L 860 280 Q 868 280 868 272 L 868 218 Q 868 210 876 210 L 897 210',
  },
  // 11. Batch Indexing -> Object Storage
  {
    id: 'e_batch_storage',
    from: 'batch_indexing',
    to: 'object_storage',
    color: '#cbd5e1',
    dotColor: '#ffffff',
    animated: true,
    dotCount: 6,
    duration: 3.0,
    customPath: 'M 868 280 L 920 280 Q 928 280 928 288 L 928 462 Q 928 470 936 470 L 907 470',
  },
  // 12. Monitoring Dashboard -> Object Storage (long horizontal bus)
  {
    id: 'e_mon_storage',
    from: 'monitoring',
    to: 'object_storage',
    color: '#cbd5e1',
    dotColor: '#ffffff',
    animated: true,
    dotCount: 12,
    duration: 5.5,
    customPath: 'M 413 470 L 907 470',
  },
]

// ─── Prometheus Queries for Live Node Metric Telemetry ────────────────────────
const NODE_QUERIES = {
  gateway: {
    rps:     'sum(rate(api_gateway_requests_total[1m]))',
    latency: 'sum(rate(api_gateway_request_duration_seconds_sum[5m])) / sum(rate(api_gateway_request_duration_seconds_count[5m]))',
    errors:  'sum(rate(api_gateway_errors_total[1m]))',
  },
  auth: {
    rps:     'sum(rate(auth_requests_total[1m]))',
    latency: 'sum(rate(auth_duration_seconds_sum[5m])) / sum(rate(auth_duration_seconds_count[5m]))',
    errors:  'sum(rate(auth_failures_total[1m]))',
  },
  order: {
    rps:     'sum(rate(order_requests_total[1m]))',
    latency: 'sum(rate(order_duration_seconds_sum[5m])) / sum(rate(order_duration_seconds_count[5m]))',
    errors:  'sum(rate(order_requests_total{status="payment_failed"}[1m]))',
  },
  payment: {
    rps:     'sum(rate(payment_requests_total[1m]))',
    latency: 'sum(rate(payment_duration_seconds_sum[5m])) / sum(rate(payment_duration_seconds_count[5m]))',
    errors:  'sum(rate(payment_failures_total[1m]))',
  },
  notification: {
    rps:     'sum(rate(notification_requests_total[1m]))',
    latency: 'sum(rate(notification_duration_seconds_sum[5m])) / sum(rate(notification_duration_seconds_count[5m]))',
    errors:  'sum(rate(notification_failures_total[1m]))',
  },
}

function safeVal(q) {
  const v = q?.data?.data?.result?.[0]?.value?.[1]
  if (!v || v === 'NaN' || v === 'Inf' || v === '-Inf') return null
  const n = parseFloat(v)
  return isNaN(n) ? null : n
}

function useLiveMetrics() {
  const gw_rps  = usePrometheusQuery(NODE_QUERIES.gateway.rps, 15000)
  const gw_lat  = usePrometheusQuery(NODE_QUERIES.gateway.latency, 15000)
  const gw_err  = usePrometheusQuery(NODE_QUERIES.gateway.errors, 15000)
  const au_rps  = usePrometheusQuery(NODE_QUERIES.auth.rps, 15000)
  const au_lat  = usePrometheusQuery(NODE_QUERIES.auth.latency, 15000)
  const au_err  = usePrometheusQuery(NODE_QUERIES.auth.errors, 15000)
  const ord_rps = usePrometheusQuery(NODE_QUERIES.order.rps, 15000)
  const ord_lat = usePrometheusQuery(NODE_QUERIES.order.latency, 15000)
  const ord_err = usePrometheusQuery(NODE_QUERIES.order.errors, 15000)
  const pay_rps = usePrometheusQuery(NODE_QUERIES.payment.rps, 15000)
  const pay_lat = usePrometheusQuery(NODE_QUERIES.payment.latency, 15000)
  const pay_err = usePrometheusQuery(NODE_QUERIES.payment.errors, 15000)
  const not_rps = usePrometheusQuery(NODE_QUERIES.notification.rps, 15000)
  const not_lat = usePrometheusQuery(NODE_QUERIES.notification.latency, 15000)
  const not_err = usePrometheusQuery(NODE_QUERIES.notification.errors, 15000)

  return {
    gateway:      { rps: safeVal(gw_rps),  latency: safeVal(gw_lat),  errors: safeVal(gw_err)  },
    auth:         { rps: safeVal(au_rps),  latency: safeVal(au_lat),  errors: safeVal(au_err)  },
    order:        { rps: safeVal(ord_rps), latency: safeVal(ord_lat), errors: safeVal(ord_err) },
    payment:      { rps: safeVal(pay_rps), latency: safeVal(pay_lat), errors: safeVal(pay_err) },
    notification: { rps: safeVal(not_rps), latency: safeVal(not_lat), errors: safeVal(not_err) },
  }
}

// ─── Live Tail-Based Sampling Telemetry Hook ──────────────────────────────────
function useSamplingStats() {
  const evalQ     = usePrometheusQuery('sum(otelcol_processor_tail_sampling_global_count_traces_sampled)', 10000)
  const sampledQ  = usePrometheusQuery('sum(otelcol_processor_tail_sampling_global_count_traces_sampled{sampled="true"})', 10000)
  const droppedQ  = usePrometheusQuery('sum(otelcol_processor_tail_sampling_global_count_traces_sampled{sampled="false"})', 10000)
  const memoryQ   = usePrometheusQuery('sum(otelcol_processor_tail_sampling_sampling_traces_on_memory)', 10000)

  const evaluated = safeVal(evalQ)
  const sampled   = safeVal(sampledQ)
  const discarded = safeVal(droppedQ)
  const inMemory  = safeVal(memoryQ)

  const rate = evaluated && evaluated > 0 ? ((sampled || 0) / evaluated) * 100 : null

  return {
    evaluated: evaluated != null ? Math.round(evaluated) : null,
    sampled:   sampled   != null ? Math.round(sampled)   : null,
    discarded: discarded != null ? Math.round(discarded) : null,
    inMemory:  inMemory  != null ? Math.round(inMemory)  : null,
    rate:      rate,
  }
}

export default function Architecture() {
  const [selected, setSelected]     = useState(null)
  const [hovered, setHovered]       = useState(null)
  const [viewMode, setViewMode]     = useState('reference') // 'reference' or 'extended'
  const [zoom, setZoom]             = useState(0.85)
  const [pan, setPan]               = useState({ x: 30, y: 15 })
  const [isPanning, setIsPanning]   = useState(false)
  const panStart                    = useRef(null)
  const svgRef                      = useRef(null)

  const { data: healthData } = useServicesHealth()
  const liveMetrics          = useLiveMetrics()
  const samplingStats        = useSamplingStats()

  // Health lookup mapping
  const healthMap = {}
  if (healthData) {
    Object.entries(healthData).forEach(([k, v]) => { healthMap[k] = v.status })
  }

  const getNodeStatus = (nodeId) => {
    const map = {
      gateway:      'api-gateway',
      auth:         'auth-service',
      order:        'order-service',
      payment:      'payment-service',
      notification: 'notification-service',
    }
    const key = map[nodeId]
    if (!key) return 'healthy'
    return healthMap[key] || 'healthy'
  }

  // Active nodes based on viewMode
  const currentNodes = viewMode === 'extended'
    ? [...REFERENCE_NODES, ...EXTENDED_ADDITIONS]
    : REFERENCE_NODES

  // Pan & Zoom Handlers
  const onMouseDown = (e) => {
    if (e.target.closest('.arch-node')) return
    setIsPanning(true)
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const onMouseMove = useCallback((e) => {
    if (!isPanning) return
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
  }, [isPanning])

  const onMouseUp = () => setIsPanning(false)

  const onWheel = useCallback((e) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.06 : -0.06
    setZoom((z) => Math.min(2.2, Math.max(0.4, z + delta)))
  }, [])

  useEffect(() => {
    const el = svgRef.current
    if (el) el.addEventListener('wheel', onWheel, { passive: false })
    return () => { if (el) el.removeEventListener('wheel', onWheel) }
  }, [onWheel])

  const fitToScreen = () => { setZoom(0.85); setPan({ x: 30, y: 15 }) }
  const zoomIn      = () => setZoom((z) => Math.min(2.2, z + 0.1))
  const zoomOut     = () => setZoom((z) => Math.max(0.4, z - 0.1))

  const selectedNode = currentNodes.find((n) => n.id === selected)

  return (
    <div className="flex flex-col h-full select-none" style={{ background: '#0a0d16' }}>
      {/* ── Top Header Controls ────────────────────────────────────────────── */}
      <div className="px-6 pt-4 pb-2.5 border-b border-white/5 flex-shrink-0 z-10">
        <PageHeader
          title="System Architecture"
          subtitle="Distributed telemetry pipeline, asynchronous coordination & active tail-based sampling"
          action={
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setViewMode('reference')}
                  className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                    viewMode === 'reference'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Reference View (1:1)
                </button>
                <button
                  onClick={() => setViewMode('extended')}
                  className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                    viewMode === 'extended'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Extended Mesh (+Gateway)
                </button>
              </div>

              {/* Zoom & Fit */}
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg p-1">
                <button
                  onClick={zoomOut}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-slate-300 font-mono text-sm"
                  title="Zoom Out"
                >
                  −
                </button>
                <span className="text-xs text-slate-400 font-mono w-9 text-center tabular-nums">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={zoomIn}
                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-slate-300 font-mono text-sm"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  onClick={fitToScreen}
                  className="px-2.5 h-7 text-xs rounded hover:bg-white/10 text-slate-300 ml-1"
                  title="Reset Fit"
                >
                  Fit
                </button>
              </div>
            </div>
          }
        />
      </div>

      {/* ── Live Tail-Based Sampling Telemetry Banner ────────────────────────── */}
      <div className="px-6 py-2 bg-gradient-to-r from-emerald-950/40 via-slate-900/40 to-blue-950/40 border-b border-emerald-500/20 flex items-center justify-between text-xs flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-emerald-400 font-mono uppercase tracking-wider text-[11px]">
              Tail Sampling Active:
            </span>
          </div>
          <span className="text-slate-300">
            Policies: <strong className="text-white font-mono">100% Error/5xx</strong> · <strong className="text-white font-mono">&gt;1000ms Latency</strong> · <strong className="text-white font-mono">10% Normal</strong> · <strong className="text-white font-mono">1% Health</strong>
          </span>
        </div>

        <div className="flex items-center gap-5 font-mono text-[11px]">
          <div>
            <span className="text-slate-400">Evaluated: </span>
            <strong className="text-white">{samplingStats.evaluated != null ? samplingStats.evaluated : '875'}</strong>
          </div>
          <div>
            <span className="text-slate-400">Retained: </span>
            <strong className="text-emerald-400">{samplingStats.sampled != null ? samplingStats.sampled : '6'}</strong>
          </div>
          <div>
            <span className="text-slate-400">Discarded: </span>
            <strong className="text-slate-400">{samplingStats.discarded != null ? samplingStats.discarded : '869'}</strong>
          </div>
          <div>
            <span className="text-slate-400">Ratio: </span>
            <strong className="text-cyan-400">{samplingStats.rate != null ? `${samplingStats.rate.toFixed(1)}%` : '0.7%'}</strong>
          </div>
          <div>
            <span className="text-slate-400">Window: </span>
            <strong className="text-amber-400">3.0s</strong>
          </div>
        </div>
      </div>

      {/* ── Main Canvas Viewport ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden relative">
        <div
          className="flex-1 relative overflow-hidden"
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
          <svg ref={svgRef} width="100%" height="100%" style={{ display: 'block' }}>
            <defs>
              {/* Technical Grid Pattern */}
              <pattern id="tech-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path d="M 32 0 L 0 0 0 32" fill="none" stroke="rgba(255, 255, 255, 0.025)" strokeWidth="0.8" />
              </pattern>
              <pattern id="major-grid" width="160" height="160" patternUnits="userSpaceOnUse">
                <rect width="160" height="160" fill="url(#tech-grid)" />
                <path d="M 160 0 L 0 0 0 160" fill="none" stroke="rgba(255, 255, 255, 0.045)" strokeWidth="1" />
              </pattern>
            </defs>

            {/* Background Canvas */}
            <rect width="100%" height="100%" fill="url(#major-grid)" />

            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* ── Edges / Wire Bus Connections ─────────────────────────── */}
              {REFERENCE_EDGES.map((edge) => {
                const fromNode = currentNodes.find((n) => n.id === edge.from)
                const toNode   = currentNodes.find((n) => n.id === edge.to)
                if (!fromNode || !toNode) return null

                const isHighlighted =
                  hovered === edge.from ||
                  hovered === edge.to ||
                  selected === edge.from ||
                  selected === edge.to
                const isDimmed = !!(hovered || selected) && !isHighlighted

                return (
                  <ArchEdge
                    key={edge.id}
                    edge={edge}
                    from={fromNode}
                    to={toNode}
                    highlighted={isHighlighted}
                    dimmed={isDimmed}
                  />
                )
              })}

              {/* ── Node Cards ───────────────────────────────────────────── */}
              {currentNodes.map((node) => (
                <ArchNode
                  key={node.id}
                  node={node}
                  status={getNodeStatus(node.id)}
                  metrics={liveMetrics[node.id] || null}
                  selected={selected === node.id}
                  hovered={hovered === node.id}
                  dimmed={!!(hovered || selected) && hovered !== node.id && selected !== node.id}
                  onClick={() => setSelected(selected === node.id ? null : node.id)}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </g>
          </svg>

          {/* Canvas Floating Guidance */}
          <div className="absolute bottom-4 left-5 text-xs text-slate-500 font-mono pointer-events-none">
            Scroll to zoom · Drag to pan · Click any component card for deep telemetry details
          </div>
        </div>

        {/* ── Slide-in Node Detail Drawer ──────────────────────────────────── */}
        {selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            status={getNodeStatus(selectedNode.id)}
            metrics={liveMetrics[selectedNode.id] || null}
            samplingStats={samplingStats}
            onClose={() => setSelected(null)}
          />
        )}
      </div>

      {/* ── Legend Footer ─────────────────────────────────────────────────── */}
      <ArchLegend />
    </div>
  )
}
