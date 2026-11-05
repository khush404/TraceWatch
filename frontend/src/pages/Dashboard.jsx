import React from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  Activity, AlertTriangle, CheckCircle, Clock, Server, TrendingUp, Zap, Shield
} from 'lucide-react'
import StatCard from '../components/StatCard'
import ServiceBadge from '../components/ServiceBadge'
import PageHeader from '../components/PageHeader'
import LoadingSpinner from '../components/LoadingSpinner'
import { useServicesHealth, usePrometheusQuery, usePrometheusRangeQuery } from '../hooks/useApi'

function formatTimestamp(ts) {
  return new Date(ts * 1000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
}

function transformRangeData(result, labelKey) {
  if (!result?.data?.result?.length) return []
  const series = result.data.result
  const allPoints = {}
  series.forEach((s, i) => {
    const label = s.metric[labelKey] || `series-${i}`
    s.values.forEach(([ts, val]) => {
      if (!allPoints[ts]) allPoints[ts] = { time: formatTimestamp(ts) }
      allPoints[ts][label] = parseFloat(val).toFixed(3)
    })
  })
  return Object.values(allPoints).slice(-30)
}

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6']

export default function Dashboard() {
  const { data: healthData, loading: healthLoading } = useServicesHealth()

  // Prometheus instant queries
  const { data: totalReq } = usePrometheusQuery('sum(increase(api_gateway_requests_total[1h])) or vector(0)')
  const { data: errorCount } = usePrometheusQuery('sum(increase(api_gateway_errors_total[1h])) or vector(0)')
  const { data: avgLatency } = usePrometheusQuery('avg(rate(api_gateway_request_duration_seconds_sum[5m]) / rate(api_gateway_request_duration_seconds_count[5m])) or vector(0)')

  // Range queries for charts
  const { data: reqRate } = usePrometheusRangeQuery('sum(rate(api_gateway_requests_total[2m])) by (service)', '1h', '60s')
  const { data: latencyRate } = usePrometheusRangeQuery('histogram_quantile(0.95, sum(rate(api_gateway_request_duration_seconds_bucket[2m])) by (le, service))', '1h', '60s')

  const reqChartData = transformRangeData(reqRate, 'service')
  const latencyChartData = transformRangeData(latencyRate, 'service')

  const getMetricValue = (data, decimals = 0) => {
    const val = data?.data?.result?.[0]?.value?.[1]
    if (val === undefined || val === null) return '—'
    const num = parseFloat(val)
    return isNaN(num) ? '—' : decimals > 0 ? num.toFixed(decimals) : Math.round(num).toString()
  }

  const services = healthData
    ? Object.entries(healthData).map(([name, info]) => ({ name, ...info }))
    : []
  const healthyCount = services.filter(s => s.status === 'healthy').length

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-bg-card border border-bg-border rounded-lg p-3 text-xs">
        <p className="text-text-muted mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-text-secondary">{p.name}:</span>
            <span className="text-text-primary font-mono">{p.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader
        title="System Overview"
        subtitle="Real-time monitoring across all TraceWatch microservices"
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-status-success/10 border border-status-success/30 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
            <span className="text-xs font-medium text-status-success">Live</span>
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Requests (1h)"
          value={getMetricValue(totalReq)}
          icon={Activity}
          color="primary"
          subtitle="API Gateway"
        />
        <StatCard
          title="Avg Latency"
          value={getMetricValue(avgLatency, 3)}
          unit="s"
          icon={Clock}
          color="info"
          subtitle="p95 response time"
        />
        <StatCard
          title="Error Count (1h)"
          value={getMetricValue(errorCount)}
          icon={AlertTriangle}
          color="error"
          subtitle="Gateway errors"
        />
        <StatCard
          title="Active Services"
          value={healthyCount}
          unit={`/ ${services.length || 4}`}
          icon={Server}
          color="success"
          subtitle="Healthy microservices"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Request Rate Chart */}
        <div className="bg-bg-card border border-bg-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Request Rate (req/s)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={reqChartData}>
              <defs>
                {CHART_COLORS.map((color, i) => (
                  <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3250" />
              <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              {reqChartData.length > 0 && Object.keys(reqChartData[0]).filter(k => k !== 'time').map((key, i) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={`url(#grad${i})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Latency Chart */}
        <div className="bg-bg-card border border-bg-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Response Latency p95 (seconds)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={latencyChartData}>
              <defs>
                {CHART_COLORS.map((color, i) => (
                  <linearGradient key={i} id={`latGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3250" />
              <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              {latencyChartData.length > 0 && Object.keys(latencyChartData[0]).filter(k => k !== 'time').map((key, i) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={`url(#latGrad${i})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Services Health */}
      <div className="bg-bg-card border border-bg-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Service Health Status</h3>
        {healthLoading ? (
          <LoadingSpinner />
        ) : services.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">
            <Server className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Unable to reach API Gateway. Make sure services are running.</p>
            <p className="mt-1 text-xs font-mono">docker compose up --build</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {services.map(svc => (
              <div key={svc.name} className="bg-bg-secondary rounded-lg p-4 border border-bg-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-text-primary">{svc.name}</span>
                  <ServiceBadge status={svc.status} />
                </div>
                {svc.error && (
                  <p className="text-xs text-status-error truncate" title={svc.error}>{svc.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
