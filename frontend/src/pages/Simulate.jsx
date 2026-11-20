import React, { useState } from 'react'
import { CheckCircle, XCircle, Play, RefreshCw, ExternalLink, ArrowRight, Clock } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { api } from '../hooks/useApi'

function FlowStep({ label, status }) {
  const colors = {
    success: 'bg-green-500/20 border-green-500/40 text-green-400',
    error:   'bg-red-500/20 border-red-500/40 text-red-400',
    skipped: 'bg-gray-500/20 border-gray-500/40 text-gray-500',
    idle:    'bg-bg-border/50 border-bg-border text-text-muted',
  }
  return (
    <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium ${colors[status]}`}>
      {label}
    </div>
  )
}

function Arrow({ color = 'text-text-muted' }) {
  return <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${color}`} />
}

function ResultBox({ result }) {
  if (!result) return null
  const isSuccess = result.success
  return (
    <div className={`mt-4 rounded-lg border p-4 ${isSuccess ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
      {/* Status */}
      <div className={`flex items-center gap-2 text-sm font-semibold mb-3 ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>
        {isSuccess ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        {isSuccess
          ? '✓ Order Completed Successfully'
          : `✗ Payment Service Failed – HTTP ${result.status}`}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div className="bg-bg-border/40 rounded p-2">
          <div className="text-text-muted mb-0.5">HTTP Status</div>
          <div className={`font-mono font-bold ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>{result.status}</div>
        </div>
        <div className="bg-bg-border/40 rounded p-2">
          <div className="text-text-muted mb-0.5">Notification</div>
          <div className={`font-mono font-bold ${result.notification_sent ? 'text-green-400' : 'text-red-400'}`}>
            {result.notification_sent ? 'SENT ✓' : 'SKIPPED ✗'}
          </div>
        </div>
        {result.order_id && (
          <div className="bg-bg-border/40 rounded p-2">
            <div className="text-text-muted mb-0.5">Order ID</div>
            <div className="font-mono text-text-primary truncate">{result.order_id}</div>
          </div>
        )}
        {result.payment_id && (
          <div className="bg-bg-border/40 rounded p-2">
            <div className="text-text-muted mb-0.5">Payment ID</div>
            <div className="font-mono text-text-primary truncate">{result.payment_id}</div>
          </div>
        )}
      </div>

      {/* Trace ID */}
      {result.trace_id && (
        <div className="bg-bg-border/40 rounded p-2 mb-2 text-xs">
          <div className="text-text-muted mb-0.5">Trace ID</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-accent-primary break-all">{result.trace_id}</span>
            {result.jaeger_url && (
              <a href={result.jaeger_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-accent-primary hover:underline shrink-0 text-xs">
                <ExternalLink className="w-3 h-3" /> View in Jaeger
              </a>
            )}
          </div>
        </div>
      )}

      {/* Error detail */}
      {!isSuccess && result.error && (
        <div className="bg-red-500/10 rounded p-2 text-xs text-red-400 font-mono">
          {typeof result.error === 'string' ? result.error : JSON.stringify(result.error)}
        </div>
      )}
    </div>
  )
}

export default function Simulate() {
  const [successResult, setSuccessResult] = useState(null)
  const [failureResult, setFailureResult] = useState(null)
  const [slowResult, setSlowResult]       = useState(null)
  const [loading, setLoading]             = useState({})

  const setLoad = (k, v) => setLoading(p => ({ ...p, [k]: v }))

  // Scenario A — always succeeds
  async function runSuccess() {
    setLoad('success', true)
    setSuccessResult(null)
    // make sure failure mode is OFF first
    try { await api.post('/api/payments/simulate/failure', { enabled: false, delay_seconds: 0 }) } catch {}
    try {
      const res = await api.post('/api/simulate/order-flow', {
        user_id: 'success-user-' + Math.random().toString(36).slice(2, 6),
        items: [{ product: 'TraceWatch Widget', quantity: 1, price: 49.99 }],
        total: 49.99,
      })
      const order = res.data.results?.order || {}
      setSuccessResult({
        success: true, status: 200,
        trace_id: res.data.trace_id,
        jaeger_url: res.data.jaeger_url,
        order_id: order.order_id,
        payment_id: order.payment_id,
        notification_sent: order.notification_sent ?? true,
      })
    } catch (e) {
      const d = e.response?.data?.detail || {}
      setSuccessResult({ success: false, status: e.response?.status || 500, error: d, trace_id: d.trace_id, jaeger_url: d.jaeger_url, notification_sent: false })
    } finally {
      setLoad('success', false)
    }
  }

  // Scenario B — always fails
  async function runFailure() {
    setLoad('failure', true)
    setFailureResult(null)
    // enable failure mode and verify it was accepted
    try {
      await api.post('/api/payments/simulate/failure', { enabled: true, delay_seconds: 0 })
    } catch {
      setFailureResult({ success: false, status: 503, error: 'Could not reach payment service to enable failure mode. Is Docker running?', notification_sent: false })
      setLoad('failure', false)
      return
    }
    try {
      await api.post('/api/simulate/order-flow', {
        user_id: 'fail-user-' + Math.random().toString(36).slice(2, 6),
        items: [{ product: 'TraceWatch Widget', quantity: 1, price: 49.99 }],
        total: 49.99,
      })
      // order succeeded even though failure mode was enabled — unexpected
      setFailureResult({ success: false, status: 500, error: 'Failure mode was enabled but payment still succeeded. Try running again.', notification_sent: false })
    } catch (e) {
      const d = e.response?.data?.detail || {}
      setFailureResult({
        success: false,
        status: e.response?.status || 500,
        error: d.error || d.payment_error || 'Payment Service Failed – HTTP 500',
        trace_id: d.trace_id,
        jaeger_url: d.jaeger_url,
        order_id: d.order_id,
        notification_sent: false,
      })
    } finally {
      // restore normal mode after demo
      try { await api.post('/api/payments/simulate/failure', { enabled: false, delay_seconds: 0 }) } catch {}
      setLoad('failure', false)
    }
  }

  // Scenario C — slow payment
  async function runSlow() {
    setLoad('slow', true)
    setSlowResult(null)
    try { await api.post('/api/payments/simulate/failure', { enabled: false, delay_seconds: 0 }) } catch {}
    try {
      const res = await api.post('/api/payments/process', {
        order_id: 'slow-' + Date.now(),
        amount: 49.99,
        delay_seconds: 2.0,
      })
      setSlowResult({ success: true, status: 200, trace_id: null, notification_sent: false,
        order_id: res.data.payment_id, payment_id: res.data.payment_id,
        extra: `Completed in ~2s – check Jaeger for elongated payment.process span` })
    } catch (e) {
      setSlowResult({ success: false, status: e.response?.status || 500, error: e.message, notification_sent: false })
    } finally {
      setLoad('slow', false)
    }
  }

  const Btn = ({ onClick, isLoading, children, variant = 'primary' }) => {
    const s = {
      primary: 'bg-accent-primary hover:bg-accent-hover text-white',
      success: 'bg-green-600 hover:bg-green-700 text-white',
      danger:  'bg-red-600 hover:bg-red-700 text-white',
      warning: 'bg-yellow-500 hover:bg-yellow-600 text-black',
    }
    return (
      <button onClick={onClick} disabled={isLoading}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${s[variant]}`}>
        {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
        {children}
      </button>
    )
  }

  const flowSteps = (scenario, expectFailure = false) => {
    if (!scenario) return ['idle','idle','idle','idle']
    if (scenario.success && !expectFailure) return ['success','success','success','success']
    if (scenario.success && expectFailure) return ['success','success','success','success'] // failure mode didn't stick
    return ['success','success','error','skipped']
  }

  const [ss, os, ps, ns] = flowSteps(successResult)
  const [sf, of_, pf, nf] = flowSteps(failureResult, true)

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Scenario Simulation"
        subtitle="Run a successful request and a failed request side by side"
      />

      {/* Observe banner */}
      <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl text-xs text-text-secondary">
        <strong className="text-text-primary">After each run:</strong> open{' '}
        <a href="http://localhost:16686" target="_blank" rel="noreferrer" className="text-accent-primary hover:underline">Jaeger ↗</a> to see spans,{' '}
        <a href="http://localhost:3001" target="_blank" rel="noreferrer" className="text-green-400 hover:underline">Grafana ↗</a> for metrics,{' '}
        <a href="http://localhost:9090" target="_blank" rel="noreferrer" className="text-yellow-400 hover:underline">Prometheus ↗</a> for counters.
      </div>

      {/* Two scenario cards side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Scenario A: Success ── */}
        <div className="bg-bg-card border border-green-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h3 className="text-sm font-bold text-green-400">Scenario A — Successful Order</h3>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            Payment succeeds → Notification is sent → Full trace visible in Jaeger.
          </p>

          {/* Flow diagram */}
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            <FlowStep label="API Gateway" status={ss} />
            <Arrow color="text-green-500/50" />
            <FlowStep label="Order Service" status={os} />
            <Arrow color="text-green-500/50" />
            <FlowStep label="Payment ✓" status={ps} />
            <Arrow color="text-green-500/50" />
            <FlowStep label="Notification ✓" status={ns} />
          </div>

          <Btn onClick={runSuccess} isLoading={loading.success} variant="success">
            Run Successful Flow
          </Btn>
          <ResultBox result={successResult} />
        </div>

        {/* ── Scenario B: Failure ── */}
        <div className="bg-bg-card border border-red-500/30 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-5 h-5 text-red-400" />
            <h3 className="text-sm font-bold text-red-400">Scenario B — Payment Failure</h3>
          </div>
          <p className="text-xs text-text-secondary mb-4">
            Payment returns HTTP 500 → Notification is skipped → Error span visible in Jaeger.
          </p>

          {/* Flow diagram */}
          <div className="flex items-center gap-1.5 flex-wrap mb-4">
            <FlowStep label="API Gateway" status={sf} />
            <Arrow color="text-red-500/50" />
            <FlowStep label="Order Service" status={of_} />
            <Arrow color="text-red-500/50" />
            <FlowStep label="Payment ✗" status={pf} />
            <Arrow color="text-gray-500/50" />
            <FlowStep label="Notification" status={nf} />
          </div>

          <Btn onClick={runFailure} isLoading={loading.failure} variant="danger">
            Run Failure Flow
          </Btn>
          <ResultBox result={failureResult} />
        </div>
      </div>

      {/* Scenario C: Slow */}
      <div className="bg-bg-card border border-yellow-500/30 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-5 h-5 text-yellow-400" />
          <h3 className="text-sm font-bold text-yellow-400">Scenario C — Slow Payment (2s Artificial Delay)</h3>
        </div>
        <p className="text-xs text-text-secondary mb-4">
          Payment succeeds but takes 2 seconds. Observe the elongated <span className="font-mono">payment.process</span> span in Jaeger and latency spike in Grafana.
        </p>
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          <FlowStep label="API Gateway" status={slowResult ? 'success' : 'idle'} />
          <Arrow />
          <FlowStep label="Order Service" status={slowResult ? 'success' : 'idle'} />
          <Arrow />
          <FlowStep label="Payment (2s delay)" status={slowResult?.success ? 'success' : slowResult ? 'error' : 'idle'} />
        </div>
        <Btn onClick={runSlow} isLoading={loading.slow} variant="warning">
          Run Slow Payment
        </Btn>
        {slowResult && (
          <div className={`mt-4 rounded-lg border p-3 text-xs ${slowResult.success ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-400' : 'border-red-500/30 bg-red-500/5 text-red-400'}`}>
            {slowResult.success ? `✓ ${slowResult.extra}` : `✗ ${slowResult.error}`}
          </div>
        )}
      </div>

      {/* Viva guide */}
      <div className="bg-bg-card border border-bg-border rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-3">📋 Viva Demo Steps</h3>
        <ol className="text-xs text-text-secondary space-y-2 list-decimal list-inside">
          <li><strong className="text-text-primary">Scenario A:</strong> Click "Run Successful Flow" → show green result, trace ID → click "View in Jaeger" → show 4 spans all green</li>
          <li><strong className="text-text-primary">Scenario B:</strong> Click "Run Failure Flow" → show red HTTP 500, Notification=SKIPPED → click "View in Jaeger" → show red payment.process span with error tag</li>
          <li><strong className="text-text-primary">Scenario C:</strong> Click "Run Slow Payment" → open Jaeger → show payment.process span taking ~2000ms</li>
          <li><strong className="text-text-primary">Metrics:</strong> Open <a href="http://localhost:3001" target="_blank" rel="noreferrer" className="text-accent-primary hover:underline">Grafana ↗</a> → show error rate spike from Scenario B</li>
        </ol>
      </div>
    </div>
  )
}
