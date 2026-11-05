# TraceWatch – System Design & Architecture Analysis

## 1. System Design Goals & Principles

The architectural design of TraceWatch demonstrates fundamental distributed system patterns:
- **Low-Overhead Observability**: Utilizing asynchronous OTLP pipelines and batch processing so telemetry overhead does not measurably degrade microservice throughput.
- **Resilience & Fault Isolation**: Contain errors at component boundaries. Downstream payment or notification failures do not crash the order service or API Gateway.
- **Observability Parity**: Both metrics (aggregation) and traces (request journeys) work synchronously to give complete situational awareness.

---

## 2. Microservice Decomposition Strategy

TraceWatch separates concerns along domain boundaries:
1. **Perimeter Layer (API Gateway)**: Handles cross-cutting concerns (CORS, edge routing, request latency metrics).
2. **Identity Domain (Auth Service)**: Isolated cryptographic operations (Bcrypt hashing, JWT signature generation/verification).
3. **Core Business Domain (Order Service)**: State management for business transactions.
4. **Integration Domains (Payment & Notification Services)**: Simulated external 3rd-party dependencies.

---

## 3. Distributed Tracing Deep-Dive

### Span Lifecycle & Parent-Child Relationships
A span represents a contiguous block of execution. In TraceWatch:
- When an order request arrives at API Gateway:
  - Span: `api-gateway.orders.create` (Root span, SpanID = `S1`, TraceID = `T1`).
  - Gateway calls Order Service with `traceparent: 00-T1-S1-01`.
- Order Service extracts `T1` and `S1`:
  - Span: `order.create` (Child span of `S1`, SpanID = `S2`, TraceID = `T1`).
  - Order Service calls Payment Service with `traceparent: 00-T1-S2-01`.
- Payment Service extracts `T1` and `S2`:
  - Span: `payment.process` (Child span of `S2`, SpanID = `S3`, TraceID = `T1`).

In Jaeger, this creates an intuitive hierarchical call tree displaying duration waterfalls and service boundaries.

### Exception Recording
When a failure occurs:
```python
span.record_exception(e)
span.set_status(trace.StatusCode.ERROR, str(e))
```
This flags the span in Jaeger with an error indicator and embeds the exception message and stack trace directly inside the span attributes.

---

## 4. Telemetry Collection & Processing Pipeline

### The Role of OpenTelemetry Collector
Why not have microservices send data directly to Jaeger and Prometheus?
1. **Decoupling**: Services only know one endpoint (`otel-collector:4317`) and one protocol (OTLP gRPC). Backends can be swapped without modifying service code.
2. **Batching**: The collector aggregates spans and metrics into batches of up to 1024 or 1-second windows, minimizing network transmission overhead.
3. **Memory Limiting**: Prevents the collector process from exceeding memory limits under sudden traffic bursts.

---

## 5. Metrics Design (Prometheus)

TraceWatch adopts Prometheus metric naming standards:
- **Counters**: Monotonically increasing values:
  - `api_gateway_requests_total{method, endpoint, status_code, service}`
  - `payment_failures_total{reason}`
  - `auth_failures_total{reason}`
- **Histograms**: Measurement of duration distributions across predefined buckets:
  - `api_gateway_request_duration_seconds_bucket{le, service}`
  - `payment_duration_seconds_bucket{le}`
  - `order_value_dollars_bucket{le}`

These histograms enable p50, p95, and p99 percentile queries in Grafana using PromQL expressions like:
```promql
histogram_quantile(0.95, sum(rate(api_gateway_request_duration_seconds_bucket[5m])) by (le, service))
```

---

## 6. Docker Networking & Deployment Topology

TraceWatch deploys inside a private user-defined bridge network (`tracewatch-net`):
- Internal service discovery occurs through Docker's embedded DNS server.
- Inter-service traffic routes over low-latency virtual bridges.
- Public ports (`3000`, `8000`, `16686`, `9090`, `3001`) are exposed only for operator inspection and browser interfaces.
