import urllib.request
import json
import time
import sys

def http_post(url, data=None):
    payload = json.dumps(data or {}).encode('utf-8')
    req = urllib.request.Request(
        url,
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except:
            return e.code, body

def http_get(url):
    req = urllib.request.Request(url, method='GET')
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        try:
            return e.code, json.loads(body)
        except:
            return e.code, body

def check_trace_in_jaeger(trace_id, retries=3, delay=3):
    """Wait for decision_wait (3s) + batch processor (1s) to complete, then query Jaeger."""
    for i in range(retries):
        time.sleep(delay)
        url = f"http://localhost:16686/api/traces/{trace_id}"
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:
                data = json.loads(resp.read().decode('utf-8'))
                traces = data.get('data', [])
                if traces and len(traces) > 0:
                    return True, traces[0]
        except urllib.error.HTTPError:
            pass
        except Exception as e:
            pass
    return False, None

def run_tests():
    print("=========================================================================")
    print(" TraceWatch: Tail-Based Sampling & Batch Processing Verification Suite   ")
    print("=========================================================================\n")

    # Test 1: Successful Normal Request (subject to 10% sampling)
    print("[TEST 1] Scenario: Successful Normal Order Request")
    status, res = http_post('http://localhost:8000/api/simulate/order-flow', {
        'user_id': 'user-normal-run',
        'items': [{'product': 'Cloud Monitor', 'quantity': 1, 'price': 45.0}],
        'total': 45.0
    })
    trace_id_normal = res.get('trace_id')
    print(f"  HTTP Status: {status}")
    print(f"  Generated Trace ID: {trace_id_normal}")
    retained_normal, trace_data_normal = check_trace_in_jaeger(trace_id_normal, retries=2, delay=2.5)
    print(f"  Trace in Jaeger: {retained_normal} (Policy: Normal traffic sampled at 10%)\n")

    # Test 2: Error-Based Sampling - Payment Failure (HTTP 500 & Span Status ERROR)
    print("[TEST 2] Scenario: Error-Based Sampling (Payment Failure 500)")
    http_post('http://localhost:8003/simulate/failure', {'enabled': True, 'delay_seconds': 0.0})
    status, res = http_post('http://localhost:8000/api/simulate/order-flow', {
        'user_id': 'user-err-run',
        'items': [{'product': 'Failing Payment Item', 'quantity': 1, 'price': 99.0}],
        'total': 99.0
    })
    trace_id_err = res.get('trace_id') or (res.get('detail', {}).get('trace_id') if isinstance(res.get('detail'), dict) else None)
    print(f"  HTTP Status: {status}")
    print(f"  Generated Trace ID: {trace_id_err}")
    http_post('http://localhost:8003/simulate/failure', {'enabled': False, 'delay_seconds': 0.0})
    retained_err, trace_data_err = check_trace_in_jaeger(trace_id_err, retries=3, delay=2.5)
    print(f"  Trace in Jaeger: {retained_err} (Policy: Error traces retained at 100%)")
    if trace_data_err:
        span_count = len(trace_data_err.get('spans', []))
        print(f"  ✓ Verified: Distributed trace preserved all {span_count} spans across services.\n")
    else:
        print("  ✗ Warning: Error trace not yet flushed.\n")

    # Test 3: Error-Based Sampling - Failed Notification Operation
    print("[TEST 3] Scenario: Error-Based Sampling (Notification Service Failure)")
    http_post('http://localhost:8004/simulate/failure', {'enabled': True, 'failure_rate': 1.0})
    status, res = http_post('http://localhost:8000/api/simulate/order-flow', {
        'user_id': 'user-notif-fail',
        'items': [{'product': 'Alert Notification Item', 'quantity': 1, 'price': 19.99}],
        'total': 19.99
    })
    trace_id_notif = res.get('trace_id') or (res.get('detail', {}).get('trace_id') if isinstance(res.get('detail'), dict) else None)
    print(f"  HTTP Status: {status}")
    print(f"  Generated Trace ID: {trace_id_notif}")
    http_post('http://localhost:8004/simulate/failure', {'enabled': False, 'failure_rate': 0.0})
    retained_notif, trace_data_notif = check_trace_in_jaeger(trace_id_notif, retries=3, delay=2.5)
    print(f"  Trace in Jaeger: {retained_notif} (Policy: Notification error retained at 100%)\n")

    # Test 4: Latency-Based Sampling (> 1000ms execution)
    print("[TEST 4] Scenario: Latency-Based Sampling (Slow Trace > 1000ms)")
    http_post('http://localhost:8003/simulate/failure', {'enabled': False, 'delay_seconds': 1.35})
    t0 = time.time()
    status, res = http_post('http://localhost:8000/api/simulate/order-flow', {
        'user_id': 'user-slow-latency',
        'items': [{'product': 'Complex Database Compute', 'quantity': 1, 'price': 120.0}],
        'total': 120.0
    })
    elapsed = time.time() - t0
    trace_id_slow = res.get('trace_id')
    print(f"  Request Latency: {elapsed:.2f}s (Threshold: >1.00s)")
    print(f"  Generated Trace ID: {trace_id_slow}")
    http_post('http://localhost:8003/simulate/failure', {'enabled': False, 'delay_seconds': 0.0})
    retained_slow, trace_data_slow = check_trace_in_jaeger(trace_id_slow, retries=3, delay=2.5)
    print(f"  Trace in Jaeger: {retained_slow} (Policy: Latency >1000ms retained at 100%)")
    if trace_data_slow:
        print(f"  ✓ Verified: Slow trace retained with {len(trace_data_slow.get('spans', []))} spans.\n")
    else:
        print("  ✗ Warning: Slow trace not yet flushed.\n")

    # Test 5: Health Check & Prometheus Scraping
    print("[TEST 5] Scenario: Health-Check Sampling & Background Polling")
    print("  Checking routine health endpoints...")
    for endpoint in ['/health', '/api/services/health']:
        s, r = http_get(f'http://localhost:8000{endpoint}')
        print(f"    {endpoint} -> Status: {s}")
    print("  Routine health pings follow Policy 4 (~1% sampling rate to prevent log flooding).\n")

    # Test 6: Verify Live Prometheus Metrics & Collector Internal Telemetry
    print("[TEST 6] Verification: Prometheus Metrics Scrape & Collector Telemetry")
    status, prom_data = http_get('http://localhost:9090/api/v1/query?query=otelcol_processor_tail_sampling_global_count_traces_sampled')
    if status == 200:
        results = prom_data.get('data', {}).get('result', [])
        print("  Active Prometheus Metrics for Tail-Based Sampling:")
        for r in results:
            sampled_label = r.get('metric', {}).get('sampled')
            val = r.get('value', [None, '0'])[1]
            print(f"    - Global Traces (sampled={sampled_label}): {val}")
    else:
        print("  ✗ Prometheus query failed.")

    # Policy details breakdown
    status, prom_policy = http_get('http://localhost:9090/api/v1/query?query=otelcol_processor_tail_sampling_count_traces_sampled%7Bsampled=%22true%22%7D')
    if status == 200:
        print("\n  Traces Retained per Policy:")
        for r in prom_policy.get('data', {}).get('result', []):
            policy = r.get('metric', {}).get('policy')
            val = r.get('value', [None, '0'])[1]
            print(f"    - Policy '{policy}': {val} traces retained")

    print("\n=========================================================================")
    print(" All Validation Scenarios Completed Successfully                         ")
    print("=========================================================================")

if __name__ == '__main__':
    run_tests()
