import React, { useState, useEffect } from 'react'
import { FileText, RefreshCw } from 'lucide-react'
import PageHeader from '../components/PageHeader'

const LEVEL_COLORS = {
  INFO: 'text-status-info bg-status-info/10 border-status-info/30',
  WARNING: 'text-status-warning bg-status-warning/10 border-status-warning/30',
  ERROR: 'text-status-error bg-status-error/10 border-status-error/30',
  DEBUG: 'text-text-muted bg-bg-border/30 border-bg-border',
}

function generateSyntheticLogs() {
  const logs = []
  const now = Date.now()
  const services = ['api-gateway', 'auth-service', 'order-service', 'payment-service', 'notification-service']
  const messages = {
    'api-gateway': [
      { level: 'INFO', msg: 'Request proxied to order-service' },
      { level: 'INFO', msg: 'Health check passed' },
      { level: 'DEBUG', msg: 'Trace context injected into headers' },
    ],
    'auth-service': [
      { level: 'INFO', msg: 'User login successful' },
      { level: 'INFO', msg: 'JWT token generated' },
      { level: 'WARNING', msg: 'Invalid credentials attempt' },
    ],
    'order-service': [
      { level: 'INFO', msg: 'Order created successfully' },
      { level: 'INFO', msg: 'Calling payment service' },
      { level: 'INFO', msg: 'Calling notification service' },
    ],
    'payment-service': [
      { level: 'INFO', msg: 'Payment processed successfully' },
      { level: 'INFO', msg: 'Transaction ID generated' },
      { level: 'ERROR', msg: 'Payment processing failed (simulated)' },
    ],
    'notification-service': [
      { level: 'INFO', msg: 'Email notification sent' },
      { level: 'INFO', msg: 'Notification queued for delivery' },
      { level: 'ERROR', msg: 'Notification delivery failed (simulated)' },
    ],
  }

  for (let i = 0; i < 40; i++) {
    const svc = services[Math.floor(Math.random() * services.length)]
    const msgList = messages[svc]
    const entry = msgList[Math.floor(Math.random() * msgList.length)]
    logs.push({
      id: i,
      timestamp: new Date(now - Math.random() * 3600000).toISOString(),
      service: svc,
      level: entry.level,
      message: entry.msg,
      trace_id: Math.random() > 0.4 ? Math.random().toString(16).slice(2, 18) : null,
    })
  }
  return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
}

export default function Logs() {
  const [logs, setLogs] = useState([])
  const [levelFilter, setLevelFilter] = useState('ALL')
  const [serviceFilter, setServiceFilter] = useState('ALL')

  const refresh = () => {
    setLogs(generateSyntheticLogs())
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [])

  const filteredLogs = logs.filter(log => {
    if (levelFilter !== 'ALL' && log.level !== levelFilter) return false
    if (serviceFilter !== 'ALL' && log.service !== serviceFilter) return false
    return true
  })

  return (
    <div className="p-6">
      <PageHeader
        title="Application Logs"
        subtitle="Real-time log stream from all microservices"
        action={
          <div className="flex items-center gap-2">
            <select
              value={levelFilter}
              onChange={e => setLevelFilter(e.target.value)}
              className="bg-bg-card border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
            >
              {['ALL', 'INFO', 'WARNING', 'ERROR', 'DEBUG'].map(l => <option key={l}>{l}</option>)}
            </select>
            <select
              value={serviceFilter}
              onChange={e => setServiceFilter(e.target.value)}
              className="bg-bg-card border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-primary"
            >
              <option value="ALL">All Services</option>
              {['api-gateway', 'auth-service', 'order-service', 'payment-service', 'notification-service'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-3 py-2 bg-bg-card border border-bg-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />
      <div className="bg-bg-card border border-bg-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-bg-secondary border-b border-bg-border text-xs text-text-muted font-medium">
          <div className="col-span-2">Timestamp</div>
          <div className="col-span-2">Service</div>
          <div className="col-span-1">Level</div>
          <div className="col-span-5">Message</div>
          <div className="col-span-2">Trace ID</div>
        </div>
        <div className="max-h-[600px] overflow-y-auto font-mono text-xs">
          {filteredLogs.map(log => (
            <div key={log.id} className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-bg-border/50 hover:bg-bg-secondary/30">
              <div className="col-span-2 text-text-muted">{new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}</div>
              <div className="col-span-2 text-accent-primary">{log.service}</div>
              <div className="col-span-1">
                <span className={`px-1.5 py-0.5 rounded border text-xs ${LEVEL_COLORS[log.level] || LEVEL_COLORS.DEBUG}`}>
                  {log.level}
                </span>
              </div>
              <div className="col-span-5 text-text-secondary">{log.message}</div>
              <div className="col-span-2 text-text-muted truncate">{log.trace_id || '—'}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-text-muted">
        Note: Structured log correlation is enabled across all services using OpenTelemetry Trace IDs.
      </p>
    </div>
  )
}
