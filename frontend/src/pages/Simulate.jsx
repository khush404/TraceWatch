import React, { useState } from 'react'
import { Zap, Play, AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { api } from '../hooks/useApi'

function ResultCard({ title, data, isError }) {
  if (!data) return null
  return (
    <div className={`rounded-lg border p-4 ${isError ? 'border-status-error/30 bg-status-error/5' : 'border-status-success/30 bg-status-success/5'}`}>
      <div className={`text-sm font-semibold mb-2 ${isError ? 'text-status-error' : 'text-status-success'}`}>{title}</div>
      <pre className="text-xs font-mono text-text-secondary overflow-auto max-h-40">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}

export default function Simulate() {
  const [loading, setLoading] = useState({})
  const [results, setResults] = useState({})
  const [paymentFailure, setPaymentFailure] = useState(false)
  const [notificationFailure, setNotificationFailure] = useState(false)
  const [artificialDelay, setArtificialDelay] = useState(0)

  const setLoad = (key, val) => setLoading(prev => ({ ...prev, [key]: val }))
  const setResult = (key, val) => setResults(prev => ({ ...prev, [key]: val }))

  async function simulateOrderFlow() {
    setLoad('order', true)
    try {
      const res = await api.post('/api/simulate/order-flow', {
        user_id: 'user-demo-' + Math.random().toString(36).slice(2, 6),
        items: [{ product: 'Demo Product', quantity: 1, price: 49.99 }],
        total: 49.99,
        simulate_payment_failure: paymentFailure,
        simulate_notification_failure: notificationFailure,
      })
      setResult('order', { success: true, data: res.data })
    } catch (e) {
      setResult('order', { success: false, error: e.response?.data || e.message })
    } finally {
      setLoad('order', false)
    }
  }

  async function simulateAuthFailure() {
    setLoad('auth', true)
    try {
      const res = await api.post('/api/auth/login', { username: 'invalid_user', password: 'wrong_password' })
      setResult('auth', { success: true, data: res.data })
    } catch (e) {
      setResult('auth', { success: false, error: e.response?.data || e.message, status: e.response?.status })
    } finally {
      setLoad('auth', false)
    }
  }

  async function togglePaymentFailure(enable) {
    setLoad('payFail', true)
    setPaymentFailure(enable)
    try {
      await api.post('http://localhost:8003/simulate/failure', { enabled: enable, delay_seconds: artificialDelay })
      setResult('payFail', { success: true, message: `Payment failure simulation ${enable ? 'enabled' : 'disabled'}` })
    } catch (e) {
      setResult('payFail', { success: false, error: e.message })
    } finally {
      setLoad('payFail', false)
    }
  }

  async function toggleNotificationFailure(enable) {
    setLoad('notifFail', true)
    setNotificationFailure(enable)
    try {
      await api.post('http://localhost:8004/simulate/failure', { enabled: enable })
      setResult('notifFail', { success: true, message: `Notification failure simulation ${enable ? 'enabled' : 'disabled'}` })
    } catch (e) {
      setResult('notifFail', { success: false, error: e.message })
    } finally {
      setLoad('notifFail', false)
    }
  }

  async function generateBulkTraffic() {
    setLoad('bulk', true)
    const promises = Array.from({ length: 5 }, (_, i) =>
      api.post('/api/simulate/order-flow', {
        user_id: `bulk-user-${i}`,
        items: [{ product: `Bulk Item ${i}`, quantity: 1, price: 10 + i * 5 }],
        total: 10 + i * 5,
        simulate_payment_failure: false,
      }).catch(e => ({ error: e.message }))
    )
    try {
      const bulkResults = await Promise.all(promises)
      setResult('bulk', { success: true, message: `${bulkResults.length} requests sent`, results: bulkResults })
    } finally {
      setLoad('bulk', false)
    }
  }

  async function simulateDelayedPayment() {
    setLoad('delay', true)
    try {
      const res = await api.post('/api/payments/process', {
        order_id: 'delay-test-' + Date.now(),
        amount: 99.99,
        delay_seconds: 2.0
      })
      setResult('delay', { success: true, data: res.data })
    } catch (e) {
      setResult('delay', { success: false, error: e.response?.data || e.message })
    } finally {
      setLoad('delay', false)
    }
  }

  const SimButton = ({ onClick, loading: isLoading, children, variant = 'primary' }) => {
    const styles = {
      primary: 'bg-accent-primary hover:bg-accent-hover text-white',
      danger: 'bg-status-error/10 hover:bg-status-error/20 text-status-error border border-status-error/30',
      warning: 'bg-status-warning/10 hover:bg-status-warning/20 text-status-warning border border-status-warning/30',
      success: 'bg-status-success/10 hover:bg-status-success/20 text-status-success border border-status-success/30',
    }
    return (
      <button
        onClick={onClick}
        disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]}`}
      >
        {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
        {children}
      </button>
    )
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Failure Simulation"
        subtitle="Trigger scenarios to observe distributed tracing in action"
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-status-warning/10 border border-status-warning/30 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-status-warning" />
            <span className="text-xs font-medium text-status-warning">Test Environment</span>
          </div>
        }
      />

      <div className="mb-6 p-4 bg-status-info/5 border border-status-info/20 rounded-xl text-sm text-text-secondary">
        <strong className="text-text-primary">How to observe:</strong> After running any simulation,
        open <a href="http://localhost:16686" target="_blank" rel="noreferrer" className="text-accent-primary hover:underline">Jaeger UI ↗</a> to
        see the distributed trace, check <a href="http://localhost:3001" target="_blank" rel="noreferrer" className="text-status-success hover:underline">Grafana ↗</a> for
        metrics changes, and view the <a href="/traces" className="text-accent-primary hover:underline">Traces page</a> for span hierarchies.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Full Order Flow */}
        <div className="bg-bg-card border border-bg-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-accent-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Full Order Flow</h3>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            Simulates a complete order journey: API Gateway → Order Service → Payment → Notification.
            Generates a full distributed trace with parent-child spans.
          </p>
          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={paymentFailure}
                onChange={e => setPaymentFailure(e.target.checked)}
                className="accent-status-error"
              />
              Fail Payment
            </label>
            <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={notificationFailure}
                onChange={e => setNotificationFailure(e.target.checked)}
                className="accent-status-error"
              />
              Fail Notification
            </label>
          </div>
          <SimButton onClick={simulateOrderFlow} loading={loading.order}>
            Run Order Flow
          </SimButton>
          {results.order && (
            <div className="mt-3">
              <ResultCard
                title={results.order.success ? '✓ Flow Completed' : '✗ Flow Failed'}
                data={results.order.data || results.order.error}
                isError={!results.order.success}
              />
            </div>
          )}
        </div>

        {/* Auth Failure */}
        <div className="bg-bg-card border border-bg-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-status-warning" />
            <h3 className="text-sm font-semibold text-text-primary">Auth Failure</h3>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            Sends invalid credentials to trigger authentication failure.
            Records auth_failures_total metric and creates an error span.
          </p>
          <SimButton onClick={simulateAuthFailure} loading={loading.auth} variant="warning">
            Trigger Auth Failure
          </SimButton>
          {results.auth && (
            <div className="mt-3">
              <ResultCard
                title={results.auth.success ? '✓ Unexpected Success' : `✗ Auth Failed (HTTP ${results.auth.status || 401})`}
                data={results.auth.error || results.auth.data}
                isError={true}
              />
            </div>
          )}
        </div>

        {/* Payment Failure Toggle */}
        <div className="bg-bg-card border border-bg-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-status-error" />
            <h3 className="text-sm font-semibold text-text-primary">Payment Service Failure</h3>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            Toggle the payment service into failure mode. All subsequent payments will fail until disabled.
          </p>
          <div className="flex gap-2">
            <SimButton onClick={() => togglePaymentFailure(true)} loading={loading.payFail} variant="danger">
              Enable Failure
            </SimButton>
            <SimButton onClick={() => togglePaymentFailure(false)} loading={loading.payFail} variant="success">
              Disable Failure
            </SimButton>
          </div>
          {results.payFail && (
            <div className="mt-3">
              <ResultCard title="" data={results.payFail.message || results.payFail.error} isError={!results.payFail.success} />
            </div>
          )}
        </div>

        {/* Notification Failure Toggle */}
        <div className="bg-bg-card border border-bg-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-status-error" />
            <h3 className="text-sm font-semibold text-text-primary">Notification Service Failure</h3>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            Toggle the notification service into failure mode. Notifications will fail and errors will appear in traces.
          </p>
          <div className="flex gap-2">
            <SimButton onClick={() => toggleNotificationFailure(true)} loading={loading.notifFail} variant="danger">
              Enable Failure
            </SimButton>
            <SimButton onClick={() => toggleNotificationFailure(false)} loading={loading.notifFail} variant="success">
              Disable Failure
            </SimButton>
          </div>
          {results.notifFail && (
            <div className="mt-3">
              <ResultCard title="" data={results.notifFail.message || results.notifFail.error} isError={!results.notifFail.success} />
            </div>
          )}
        </div>

        {/* Bulk Traffic */}
        <div className="bg-bg-card border border-bg-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-status-info" />
            <h3 className="text-sm font-semibold text-text-primary">Generate Bulk Traffic</h3>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            Sends 5 concurrent order-flow requests to populate metrics charts and generate multiple traces.
          </p>
          <SimButton onClick={generateBulkTraffic} loading={loading.bulk} variant="primary">
            Send 5 Requests
          </SimButton>
          {results.bulk && (
            <div className="mt-3">
              <ResultCard
                title={results.bulk.success ? `✓ ${results.bulk.message}` : '✗ Failed'}
                data={{ sent: results.bulk.results?.length }}
                isError={!results.bulk.success}
              />
            </div>
          )}
        </div>

        {/* Delayed Payment */}
        <div className="bg-bg-card border border-bg-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-status-warning" />
            <h3 className="text-sm font-semibold text-text-primary">Artificial Latency (2s delay)</h3>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            Sends a payment with an artificial 2-second delay to demonstrate latency detection in Jaeger traces and Grafana histograms.
          </p>
          <SimButton onClick={simulateDelayedPayment} loading={loading.delay} variant="warning">
            Send Slow Payment
          </SimButton>
          {results.delay && (
            <div className="mt-3">
              <ResultCard
                title={results.delay.success ? '✓ Payment Completed (slow)' : '✗ Payment Failed'}
                data={results.delay.data || results.delay.error}
                isError={!results.delay.success}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
