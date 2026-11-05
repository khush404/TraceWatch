import React from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import PageHeader from '../components/PageHeader'
import { usePrometheusRangeQuery, PROMETHEUS_URL } from '../hooks/useApi'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6']

function transformRange(result, labelKey) {
  if (!result?.data?.result?.length) return []
  const series = result.data.result
  const allPoints = {}
  series.forEach((s, i) => {
    const label = s.metric[labelKey] || `series-${i}`
    s.values.forEach(([ts, val]) => {
      const time = new Date(ts * 1000).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      if (!allPoints[ts]) allPoints[ts] = { time }
      allPoints[ts][label] = parseFloat(val).toFixed(4)
    })
  })
  return Object.values(allPoints).slice(-30)
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-3 text-xs shadow-xl">
      <p className="text-text-muted mb-2">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-text-secondary">{p.name}:</span>
          <span className="text-text-primary font-mono">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-bg-card border border-bg-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-4">{title}</h3>
      {children}
    </div>
  )
}

export default function Metrics() {
  const { data: reqRate } = usePrometheusRangeQuery('sum(rate(api_gateway_requests_total[2m])) by (service)', '1h', '60s')
  const { data: errorRate } = usePrometheusRangeQuery('sum(rate(api_gateway_errors_total[2m])) by (service)', '1h', '60s')
  const { data: latency } = usePrometheusRangeQuery('histogram_quantile(0.95, sum(rate(api_gateway_request_duration_seconds_bucket[2m])) by (le, service))', '1h', '60s')
  const { data: payDur } = usePrometheusRangeQuery('histogram_quantile(0.95, sum(rate(payment_duration_seconds_bucket[2m])) by (le))', '1h', '60s')
  const { data: authByEndpoint } = usePrometheusRangeQuery('sum(rate(auth_requests_total[2m])) by (endpoint)', '1h', '60s')
  const { data: orderByStatus } = usePrometheusRangeQuery('sum(rate(order_requests_total[2m])) by (status)', '1h', '60s')

  const reqData = transformRange(reqRate, 'service')
  const errorData = transformRange(errorRate, 'service')
  const latencyData = transformRange(latency, 'service')
  const payData = transformRange(payDur, 'service')
  const authData = transformRange(authByEndpoint, 'endpoint')
  const orderData = transformRange(orderByStatus, 'status')

  const noData = (d) => !d || d.length === 0 || Object.keys(d[0]).filter(k => k !== 'time').length === 0

  return (
    <div className="p-6">
      <PageHeader
        title="Metrics Analytics"
        subtitle="Real-time metrics from Prometheus"
        action={
          <a
            href={PROMETHEUS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 bg-status-error/10 border border-status-error/30 rounded-lg text-sm text-status-error hover:bg-status-error/20 transition-all"
          >
            Open Prometheus ↗
          </a>
        }
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Request Rate by Service (req/s)">
          {noData(reqData) ? (
            <div className="h-40 flex items-center justify-center text-text-muted text-xs">No data yet. Generate traffic on the Simulate page.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={reqData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3250" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                {Object.keys(reqData[0]).filter(k => k !== 'time').map((key, i) => (
                  <Area key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length] + '20'} strokeWidth={2} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Error Rate by Service (errors/s)">
          {noData(errorData) ? (
            <div className="h-40 flex items-center justify-center text-text-muted text-xs">No errors recorded yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={errorData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3250" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                {Object.keys(errorData[0]).filter(k => k !== 'time').map((key, i) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="p95 Response Latency (seconds)">
          {noData(latencyData) ? (
            <div className="h-40 flex items-center justify-center text-text-muted text-xs">No latency data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={latencyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3250" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                {Object.keys(latencyData[0]).filter(k => k !== 'time').map((key, i) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Payment Processing Duration p95">
          {noData(payData) ? (
            <div className="h-40 flex items-center justify-center text-text-muted text-xs">No payment data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={payData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3250" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                {Object.keys(payData[0]).filter(k => k !== 'time').map((key, i) => (
                  <Area key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} fill={COLORS[i % COLORS.length] + '20'} strokeWidth={2} />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Auth Requests by Endpoint">
          {noData(authData) ? (
            <div className="h-40 flex items-center justify-center text-text-muted text-xs">No auth data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={authData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3250" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                {Object.keys(authData[0]).filter(k => k !== 'time').map((key, i) => (
                  <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Order Status Distribution">
          {noData(orderData) ? (
            <div className="h-40 flex items-center justify-center text-text-muted text-xs">No order data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={orderData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3250" />
                <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                {Object.keys(orderData[0]).filter(k => k !== 'time').map((key, i) => (
                  <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  )
}
