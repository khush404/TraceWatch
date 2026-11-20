import React from 'react'

const NODE_DESCRIPTIONS = {
  client:         'React 18 frontend dashboard. Initiates business operations and displays real-time telemetry, trace spans, and metric charts. Communicates with backend services over HTTP.',
  gateway:        'FastAPI API Gateway routing all client traffic. Validates JWT credentials, manages CORS, and load-balances downstream requests to Auth, Order, Payment, and Notification services.',
  auth:           'FastAPI Authentication Service issuing and verifying secure tokens. Integrates OpenTelemetry SDK to record span context across authentication boundaries.',
  order:          'FastAPI Order Service orchestrating order lifecycle. Dispatches synchronous payment verifications and triggers asynchronous user notifications.',
  payment:        'FastAPI Payment Service processing transactions with simulated delays and error configurations. Tracks payment latency distributions and failure codes.',
  notification:   'FastAPI Notification Service sending transactional alerts and receipt emails. Instrumented with Prometheus counters and OpenTelemetry tracers.',
  otel_sdk:       'OpenTelemetry Python SDK embedded across all microservices. Configured with BatchSpanProcessor and OTLP gRPC exporter. Automatically extracts and injects W3C traceparent headers.',
  processing:     'OpenTelemetry Collector Processing Pipeline. Operates Memory Limiter (512MiB ceiling, 128MiB spike buffer) and Batch Processor (1024 spans, 1s timeout) to optimize network egress and storage ingress.',
  sampling:       'Tail-Based Sampling Processor (IMPLEMENTED & OPERATIONAL). Inspects complete distributed traces after a 3.0s decision window. Retains 100% of error traces and slow requests (>1000ms), while sampling 10% of normal traffic and ~1% of routine health checks.',
  batch_indexing: 'Batch Indexing Architecture. Trace spans are batched in microservices via BatchSpanProcessor and in the Collector via the batch processor. Dedicated external search indexing (e.g. OpenSearch/Elasticsearch cluster) is planned for high-scale multi-node deployments.',
  monitoring:     'Monitoring Dashboard (TraceWatch & Grafana 11.3). Consumes Prometheus time-series metrics and Jaeger distributed traces to visualize latency percentiles, error rates, system topology, and trace waterfalls.',
  database:       'Primary Database & Trace Storage. Jaeger all-in-one maintains an in-memory span database with index lookups by service name, operation, tags, and duration.',
  object_storage: 'Cold Object Storage (S3 / Parquet / MinIO - Planned for archival). Retains compressed historical trace files and bulk telemetry snapshots for cost-effective multi-month retention.',
}

const NODE_TECH = {
  client:         ['React 18', 'Vite', 'Tailwind CSS', 'Axios', 'SVG Canvas'],
  gateway:        ['FastAPI', 'Python 3.11', 'OTel SDK', 'BatchSpanProcessor', 'prometheus_client'],
  auth:           ['FastAPI', 'PyJWT', 'OTel SDK', 'BatchSpanProcessor', 'prometheus_client'],
  order:          ['FastAPI', 'httpx', 'OTel SDK', 'BatchSpanProcessor', 'prometheus_client'],
  payment:        ['FastAPI', 'OTel SDK', 'BatchSpanProcessor', 'prometheus_client'],
  notification:   ['FastAPI', 'OTel SDK', 'BatchSpanProcessor', 'prometheus_client'],
  otel_sdk:       ['opentelemetry-sdk', 'BatchSpanProcessor', 'OTLPSpanExporter (:4317)', 'W3C TraceContext'],
  processing:     ['otel-collector-contrib v0.111.0', 'memory_limiter (512MiB)', 'batch processor (1s, 1024)'],
  sampling:       ['tail_sampling processor', 'error_status (100%)', 'http_5xx (100%)', 'latency >1000ms (100%)', 'probabilistic (10%)', 'health_check (1%)'],
  batch_indexing: ['BatchSpanProcessor (SDK)', 'Batch Processor (Collector)', 'Jaeger In-Memory Indexer', 'External Cluster (Planned)'],
  monitoring:     ['TraceWatch Custom Dashboard', 'Grafana 11.3', 'Prometheus 2.55', 'Jaeger UI 1.57'],
  database:       ['Jaeger In-Memory Storage', 'Index by Service/Tag', 'Fast Lookup Cache'],
  object_storage: ['Cold Telemetry S3', 'Parquet Format', 'Bulk Trace Retention (Planned)'],
}

const statusColors = {
  healthy:     '#10b981',
  unhealthy:   '#ef4444',
  unreachable: '#ef4444',
  unknown:     '#94a3b8',
}

function MetricRow({ label, value, unit = '', highlight = false }) {
  const isNoData = value === null || value === undefined
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-white/5">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`text-xs font-mono ${isNoData ? 'text-slate-600' : highlight ? 'text-red-400' : 'text-slate-200'}`}>
        {isNoData ? 'No data' : `${typeof value === 'number' ? (value % 1 === 0 ? value : value.toFixed(2)) : value}${unit}`}
      </span>
    </div>
  )
}

export default function NodeDetailPanel({ node, status, metrics, samplingStats, onClose }) {
  if (!node) return null

  const statusColor = statusColors[status] || node.ledColor || '#94a3b8'
  const desc = NODE_DESCRIPTIONS[node.id] || 'Distributed system architecture component.'
  const tech = NODE_TECH[node.id] || []

  const rpsVal = metrics?.rps != null ? metrics.rps : null
  const latMs  = metrics?.latency != null ? metrics.latency * 1000 : null
  const errVal = metrics?.errors != null ? metrics.errors : null

  const isSamplingNode = node.id === 'sampling'
  const isBatchNode    = node.id === 'batch_indexing' || node.id === 'processing'

  return (
    <aside
      className="w-88 shrink-0 overflow-y-auto border-l border-white/10 flex flex-col z-20 shadow-2xl"
      style={{ background: '#0a0e1a', color: '#e2e8f0', width: '22rem' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
        <h3 className="text-sm font-semibold text-slate-200">Component Details</h3>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/10 transition-all text-lg leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="p-5 flex-1 space-y-5">
        {/* Node Identity Card */}
        <div
          className="rounded-xl p-4 border"
          style={{ borderColor: `${node.borderColor}60`, background: `${node.borderColor}15` }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: node.borderColor }}>
              {node.roleTag || node.type || 'SYSTEM COMPONENT'}
            </span>
            {node.statusBadge && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                {node.statusBadge}
              </span>
            )}
            {node.isPlanned && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                PLANNED
              </span>
            )}
          </div>
          <h2 className="font-bold text-base text-white">{node.label}</h2>
          <p className="text-xs font-mono mt-1 text-slate-400">{node.metric1} · {node.metric2}</p>
        </div>

        {/* Operational Status */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Operational Status</p>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }}
            />
            <span className="text-sm capitalize font-medium text-slate-200">
              {node.id === 'sampling'
                ? 'Operational — Tail Sampling Active'
                : node.isPlanned
                ? 'Planned Architecture Component'
                : status || 'Operational & Healthy'}
            </span>
          </div>
        </div>

        {/* Tail-Based Sampling Dedicated Live Telemetry */}
        {isSamplingNode && (
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                Live Sampling Policies
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between items-center text-slate-300">
                <span>1. Error & 5xx Policy:</span>
                <span className="text-emerald-400 font-bold">100% Retained</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>2. Latency Policy (&gt;1s):</span>
                <span className="text-emerald-400 font-bold">100% Retained</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>3. Normal Traffic Policy:</span>
                <span className="text-blue-400 font-bold">10% Sampled</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>4. Health-Check Policy:</span>
                <span className="text-slate-400 font-bold">~1% Sampled</span>
              </div>
            </div>

            {samplingStats && (
              <div className="mt-3 pt-2.5 border-t border-emerald-500/20 space-y-1 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Traces Evaluated:</span>
                  <span className="font-mono text-white font-bold">{samplingStats.evaluated ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Traces Retained (Sampled):</span>
                  <span className="font-mono text-emerald-400 font-bold">{samplingStats.sampled ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Traces Discarded (Routine):</span>
                  <span className="font-mono text-slate-400 font-bold">{samplingStats.discarded ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Sampling Ratio:</span>
                  <span className="font-mono text-cyan-300 font-bold">{samplingStats.rate != null ? `${samplingStats.rate.toFixed(1)}%` : 'N/A'}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Traces In Decision Memory:</span>
                  <span className="font-mono text-amber-300 font-bold">{samplingStats.inMemory ?? 'N/A'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Batch Processing Verification Details */}
        {isBatchNode && (
          <div className="bg-blue-950/20 border border-blue-500/30 rounded-xl p-3.5 space-y-2">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wide block border-b border-blue-500/20 pb-2">
              Batch Pipeline Architecture
            </span>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <div>
                  <strong className="text-white">SDK BatchSpanProcessor:</strong>
                  <p className="text-[11px] text-slate-400">Groups service spans before OTLP gRPC export (:4317).</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <div>
                  <strong className="text-white">Collector Batch Processor:</strong>
                  <p className="text-[11px] text-slate-400">Groups 1024 spans / 1s flush timeout post tail-sampling.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">⏱</span>
                <div>
                  <strong className="text-white">Dedicated Batch Indexing (Planned):</strong>
                  <p className="text-[11px] text-slate-400">Separate search indexer for petabyte-scale trace stores.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Description</p>
          <p className="text-xs text-slate-300 leading-relaxed">{desc}</p>
        </div>

        {/* Live Metrics */}
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Live Telemetry</p>
          <MetricRow label="Throughput" value={rpsVal} unit=" req/s" />
          <MetricRow label="p99 Response Latency" value={latMs} unit=" ms" />
          <MetricRow label="Error Frequency" value={errVal} unit=" err/s" highlight={errVal > 0} />
          {node.metric3 && (
            <div className="flex justify-between items-center py-2.5 border-b border-white/5">
              <span className="text-xs text-slate-400">Status Indicator</span>
              <span className="text-xs font-mono text-slate-300">{node.metric3}</span>
            </div>
          )}
        </div>

        {/* Technology Stack */}
        {tech.length > 0 && (
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Technologies & Protocols</p>
            <div className="flex flex-wrap gap-1.5">
              {tech.map((t) => (
                <span
                  key={t}
                  className="px-2 py-0.5 rounded text-xs font-mono bg-white/5 text-slate-300 border border-white/10"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-white/10 text-xs text-slate-500">
        Click any node to inspect · Real-time telemetry pipeline
      </div>
    </aside>
  )
}
