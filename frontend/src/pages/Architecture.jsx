import React from 'react'
import PageHeader from '../components/PageHeader'

const NODE_WIDTH = 120
const NODE_HEIGHT = 44

function Node({ x, y, label, sublabel, color = '#6366f1' }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={-NODE_WIDTH / 2} y={-NODE_HEIGHT / 2}
        width={NODE_WIDTH} height={NODE_HEIGHT}
        rx={8} ry={8}
        fill={color + '15'}
        stroke={color}
        strokeWidth={1.5}
      />
      <text x={0} y={sublabel ? -6 : 4} textAnchor="middle" fill="#e2e8f0" fontSize={11} fontWeight={600} fontFamily="Inter, sans-serif">
        {label}
      </text>
      {sublabel && (
        <text x={0} y={10} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="JetBrains Mono, monospace">
          {sublabel}
        </text>
      )}
    </g>
  )
}

function Arrow({ x1, y1, x2, y2, color = '#2d3250', label, dashed }) {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  return (
    <g>
      <defs>
        <marker id={`arrow-${color.replace('#','')}`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill={color} />
        </marker>
      </defs>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color}
        strokeWidth={1.5}
        strokeDasharray={dashed ? "5,4" : undefined}
        markerEnd={`url(#arrow-${color.replace('#','')})`}
        opacity={0.7}
      />
      {label && (
        <text x={mx} y={my - 6} textAnchor="middle" fill="#64748b" fontSize={9} fontFamily="Inter, sans-serif">
          {label}
        </text>
      )}
    </g>
  )
}

export default function Architecture() {
  return (
    <div className="p-6">
      <PageHeader
        title="System Architecture"
        subtitle="Component topology and telemetry data flow"
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {[
          { color: '#6366f1', label: 'Microservices' },
          { color: '#10b981', label: 'Observability' },
          { color: '#f59e0b', label: 'Infrastructure' },
          { color: '#3b82f6', label: 'Frontend' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ background: item.color }} />
            <span className="text-xs text-text-muted">{item.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 ml-4">
          <svg width={30} height={10}><line x1={0} y1={5} x2={30} y2={5} stroke="#6366f1" strokeWidth={1.5} /></svg>
          <span className="text-xs text-text-muted">HTTP Request</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width={30} height={10}><line x1={0} y1={5} x2={30} y2={5} stroke="#10b981" strokeWidth={1.5} strokeDasharray="5,4" /></svg>
          <span className="text-xs text-text-muted">Telemetry</span>
        </div>
      </div>

      <div className="bg-bg-card border border-bg-border rounded-xl p-4 overflow-x-auto">
        <svg width="900" height="520" viewBox="0 0 900 520" className="mx-auto">
          {/* Client */}
          <Node x={450} y={45} label="Client / Browser" sublabel=":3000" color="#3b82f6" />

          {/* API Gateway */}
          <Node x={450} y={130} label="API Gateway" sublabel=":8000" color="#6366f1" />

          {/* Auth Service */}
          <Node x={150} y={230} label="Auth Service" sublabel=":8001" color="#6366f1" />

          {/* Order Service */}
          <Node x={350} y={230} label="Order Service" sublabel=":8002" color="#6366f1" />

          {/* Payment Service */}
          <Node x={550} y={230} label="Payment Service" sublabel=":8003" color="#6366f1" />

          {/* Notification Service */}
          <Node x={750} y={230} label="Notification Svc" sublabel=":8004" color="#6366f1" />

          {/* OTel Collector */}
          <Node x={450} y={340} label="OTel Collector" sublabel="grpc:4317" color="#f59e0b" />

          {/* Jaeger */}
          <Node x={250} y={440} label="Jaeger" sublabel=":16686" color="#10b981" />

          {/* Prometheus */}
          <Node x={450} y={440} label="Prometheus" sublabel=":9090" color="#10b981" />

          {/* Grafana */}
          <Node x={650} y={440} label="Grafana" sublabel=":3001" color="#10b981" />

          {/* Arrows */}
          <Arrow x1={450} y1={67} x2={450} y2={108} color="#3b82f6" label="HTTP" />

          <Arrow x1={390} y1={150} x2={190} y2={208} color="#6366f1" />
          <Arrow x1={420} y1={152} x2={360} y2={208} color="#6366f1" />
          <Arrow x1={480} y1={152} x2={540} y2={208} color="#6366f1" />
          <Arrow x1={510} y1={150} x2={710} y2={208} color="#6366f1" />

          <Arrow x1={413} y1={230} x2={487} y2={230} color="#6366f1" label="sync call" />
          <Arrow x1={413} y1={240} x2={687} y2={240} color="#6366f1" dashed />

          <Arrow x1={175} y1={252} x2={380} y2={322} color="#10b981" dashed label="traces+metrics" />
          <Arrow x1={360} y1={252} x2={420} y2={318} color="#10b981" dashed />
          <Arrow x1={550} y1={252} x2={480} y2={318} color="#10b981" dashed />
          <Arrow x1={725} y1={252} x2={520} y2={322} color="#10b981" dashed />

          <Arrow x1={390} y1={360} x2={295} y2={418} color="#f59e0b" dashed label="traces" />
          <Arrow x1={450} y1={362} x2={450} y2={418} color="#f59e0b" dashed label="metrics" />
          <Arrow x1={510} y1={440} x2={590} y2={440} color="#10b981" label="query" />

          <text x={450} y={500} textAnchor="middle" fill="#64748b" fontSize={10} fontFamily="Inter, sans-serif">
            TraceWatch – System Architecture (OpenTelemetry Instrumented)
          </text>
        </svg>
      </div>

      {/* Component Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          {
            name: 'API Gateway', port: 8000,
            desc: 'Single entry point. Proxies all client requests to downstream services with trace context propagation.',
            tech: 'FastAPI + OpenTelemetry'
          },
          {
            name: 'Auth Service', port: 8001,
            desc: 'Handles user registration, login, and JWT token validation. Tracks auth failures.',
            tech: 'FastAPI + python-jose'
          },
          {
            name: 'Order Service', port: 8002,
            desc: 'Creates orders, orchestrates payment and notification calls. Full distributed trace.',
            tech: 'FastAPI + httpx'
          },
          {
            name: 'Payment Service', port: 8003,
            desc: 'Processes payments. Supports failure simulation and artificial delays.',
            tech: 'FastAPI + Prometheus'
          },
          {
            name: 'Notification Service', port: 8004,
            desc: 'Sends user notifications. Supports failure simulation.',
            tech: 'FastAPI + Prometheus'
          },
          {
            name: 'OTel Collector', port: 4317,
            desc: 'Receives traces/metrics via OTLP, processes batches, forwards to Jaeger and Prometheus.',
            tech: 'otel/opentelemetry-collector-contrib'
          },
          {
            name: 'Jaeger', port: 16686,
            desc: 'Stores and visualizes distributed traces. Shows full service call graphs.',
            tech: 'jaegertracing/all-in-one'
          },
          {
            name: 'Prometheus', port: 9090,
            desc: 'Scrapes and stores time-series metrics from all services.',
            tech: 'prom/prometheus'
          },
          {
            name: 'Grafana', port: 3001,
            desc: 'Professional monitoring dashboards with auto-provisioned datasources.',
            tech: 'grafana/grafana'
          },
        ].map(c => (
          <div key={c.name} className="bg-bg-card border border-bg-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-text-primary">{c.name}</span>
              <span className="font-mono text-xs text-text-muted">:{c.port}</span>
            </div>
            <p className="text-xs text-text-secondary mb-2 leading-relaxed">{c.desc}</p>
            <div className="text-xs font-mono text-accent-primary">{c.tech}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
