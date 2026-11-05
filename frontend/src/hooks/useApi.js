import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8000'
const JAEGER_URL = import.meta.env.VITE_JAEGER_URL || 'http://localhost:16686'
const PROMETHEUS_URL = import.meta.env.VITE_PROMETHEUS_URL || 'http://localhost:9090'

export const api = axios.create({ baseURL: API_BASE, timeout: 10000 })

export function useServicesHealth() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    try {
      const res = await api.get('/api/services/health')
      setData(res.data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 15000)
    return () => clearInterval(interval)
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function usePrometheusQuery(query, refreshMs = 15000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    try {
      const res = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
        params: { query },
        timeout: 10000
      })
      setData(res.data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [query])

  useEffect(() => {
    fetch()
    if (refreshMs > 0) {
      const interval = setInterval(fetch, refreshMs)
      return () => clearInterval(interval)
    }
  }, [fetch, refreshMs])

  return { data, loading, error, refetch: fetch }
}

export function usePrometheusRangeQuery(query, duration = '1h', step = '60s', refreshMs = 30000) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    try {
      const end = Math.floor(Date.now() / 1000)
      const start = end - parseDuration(duration)
      const res = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
        params: { query, start, end, step },
        timeout: 15000
      })
      setData(res.data)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [query, duration, step])

  useEffect(() => {
    fetch()
    if (refreshMs > 0) {
      const interval = setInterval(fetch, refreshMs)
      return () => clearInterval(interval)
    }
  }, [fetch, refreshMs])

  return { data, loading, error, refetch: fetch }
}

function parseDuration(d) {
  if (d.endsWith('h')) return parseInt(d) * 3600
  if (d.endsWith('m')) return parseInt(d) * 60
  if (d.endsWith('d')) return parseInt(d) * 86400
  return 3600
}

export async function fetchJaegerTraces(service, limit = 20) {
  try {
    const res = await axios.get(`${JAEGER_URL}/api/traces`, {
      params: { service, limit, lookback: '1h' },
      timeout: 10000
    })
    return res.data?.data || []
  } catch (e) {
    return []
  }
}

export async function fetchJaegerServices() {
  try {
    const res = await axios.get(`${JAEGER_URL}/api/services`, { timeout: 5000 })
    return res.data?.data || []
  } catch (e) {
    return []
  }
}

export { JAEGER_URL, PROMETHEUS_URL }
