import React from 'react'
import { Server, RefreshCw } from 'lucide-react'
import ServiceBadge from '../components/ServiceBadge'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import { useServicesHealth } from '../hooks/useApi'

const SERVICE_PORTS = {
  'api-gateway': 8000,
  'auth-service': 8001,
  'order-service': 8002,
  'payment-service': 8003,
  'notification-service': 8004,
}

const SERVICE_DESCRIPTIONS = {
  'api-gateway': 'Entry point for all client requests. Routes to downstream services.',
  'auth-service': 'Handles user registration, login, and JWT token validation.',
  'order-service': 'Creates and manages orders; orchestrates payment & notification flow.',
  'payment-service': 'Processes payments and simulates transactions.',
  'notification-service': 'Sends order and system notifications to users.',
}

export default function Services() {
  const { data: healthData, loading, refetch } = useServicesHealth()

  const services = healthData
    ? Object.entries(healthData).map(([name, info]) => ({ name, ...info }))
    : []

  return (
    <div className="p-6">
      <PageHeader
        title="Service Monitoring"
        subtitle="Health and status of all TraceWatch microservices"
        action={
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-3 py-2 bg-bg-card border border-bg-border rounded-lg text-sm text-text-secondary hover:text-text-primary hover:border-accent-primary transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        }
      />

      {loading ? (
        <LoadingSpinner />
      ) : services.length === 0 ? (
        <div className="bg-bg-card border border-bg-border rounded-xl p-12 text-center">
          <Server className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-30" />
          <p className="text-text-muted">No service data available. Start services with docker compose up --build</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.keys(SERVICE_PORTS).map(svcName => {
            const svc = services.find(s => s.name === svcName) || { name: svcName, status: 'unreachable' }
            return (
              <div key={svcName} className="bg-bg-card border border-bg-border rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-accent-primary/10 border border-accent-primary/20 rounded-lg flex items-center justify-center">
                      <Server className="w-4 h-4 text-accent-primary" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text-primary">{svcName}</div>
                      <div className="text-xs text-text-muted font-mono">:{SERVICE_PORTS[svcName]}</div>
                    </div>
                  </div>
                  <ServiceBadge status={svc.status} />
                </div>
                <p className="text-xs text-text-secondary mb-4 leading-relaxed">
                  {SERVICE_DESCRIPTIONS[svcName]}
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Endpoint</span>
                    <span className="font-mono text-text-secondary">localhost:{SERVICE_PORTS[svcName]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Health</span>
                    <a
                      href={`http://localhost:${SERVICE_PORTS[svcName]}/health`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-accent-primary hover:underline"
                    >
                      /health ↗
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Metrics</span>
                    <a
                      href={`http://localhost:${SERVICE_PORTS[svcName]}/metrics`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-accent-primary hover:underline"
                    >
                      /metrics ↗
                    </a>
                  </div>
                  {svc.error && (
                    <div className="mt-2 p-2 bg-status-error/5 border border-status-error/20 rounded text-status-error">
                      {svc.error}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* External Tools */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { name: 'Jaeger UI', url: 'http://localhost:16686', desc: 'Distributed traces explorer', color: 'text-status-warning' },
          { name: 'Prometheus', url: 'http://localhost:9090', desc: 'Metrics query interface', color: 'text-status-error' },
          { name: 'Grafana', url: 'http://localhost:3001', desc: 'Monitoring dashboards (admin/tracewatch123)', color: 'text-status-success' },
        ].map(tool => (
          <a
            key={tool.name}
            href={tool.url}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-bg-card border border-bg-border rounded-xl p-4 hover:border-accent-primary/50 transition-all group"
          >
            <div className={`text-sm font-semibold mb-1 group-hover:underline ${tool.color}`}>{tool.name} ↗</div>
            <div className="text-xs text-text-muted">{tool.desc}</div>
          </a>
        ))}
      </div>
    </div>
  )
}
