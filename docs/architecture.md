# TraceWatch – Architecture Specification

## 1. System Overview

TraceWatch is a distributed telemetry and observability platform built to demonstrate real-time tracing, metrics aggregation, and failure diagnosis in microservices architectures.

```
                    ┌────────────────────────────┐
                    │  TraceWatch Frontend (Web) │
                    │     (React / Vite :3000)   │
                    └─────────────┬──────────────┘
                                  │ HTTP / JSON
                                  ▼
                    ┌────────────────────────────┐
                    │        API Gateway         │
                    │       (FastAPI :8000)      │
                    └─────────────┬──────────────┘
                                  │ W3C Traceparent Header
         ┌────────────────────────┼────────────────────────┐
         │                        │                        │
         ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Auth Service   │    │  Order Service   │    │ Payment Service  │
│ (FastAPI :8001)  │    │ (FastAPI :8002)  │    │ (FastAPI :8003)  │
└──────────────────┘    └─────────┬────────┘    └──────────────────┘
                                  │ Synchronous HTTP       ▲
                                  ├────────────────────────┘
                                  ▼
                        ┌──────────────────┐
                        │Notification Svc  │
                        │ (FastAPI :8004)  │
                        └──────────────────┘

═══════════════════════════ TELEMETRY PIPELINE ═══════════════════════════

   [All Microservices]
            │
            ▼ OTLP gRPC (:4317)
   ┌────────────────────────────────┐
   │    OpenTelemetry Collector     │
   │  (batch, memory_limiter, otlp) │
   └───────┬────────────────┬───────┘
           │                │
           ▼ OTLP gRPC      ▼ Prometheus Exporter (:8889)
    ┌──────────────┐   ┌──────────────────┐
    │    Jaeger    │   │    Prometheus    │
    │   (:16686)   │   │     (:9090)      │
    └──────────────┘   └────────┬─────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │     Grafana      │
                       │     (:3001)      │
                       └──────────────────┘
```

## 2. Component Directory

| Service | Internal Hostname | Port | Responsibility |
|---|---|---|---|
| **API Gateway** | `api-gateway` | 8000 | Reverse proxy, CORS enforcement, request routing, initial trace inception |
| **Auth Service** | `auth-service` | 8001 | User registration, bcrypt authentication, JWT token issuance & validation |
| **Order Service** | `order-service` | 8002 | Order management, downstream orchestration to payment & notification |
| **Payment Service** | `payment-service` | 8003 | Financial transaction processing, failure simulation, latency induction |
| **Notification Service** | `notification-service` | 8004 | Alerts and notifications, delivery failure simulation |
| **OTel Collector** | `otel-collector` | 4317, 8889 | Telemetry ingestion, batch processing, trace export to Jaeger, metrics export |
| **Jaeger** | `jaeger` | 16686 | Distributed trace indexing and query UI |
| **Prometheus** | `prometheus` | 9090 | Metrics time-series database and scrape coordinator |
| **Grafana** | `grafana` | 3001 | Provisioned analytics dashboards |
| **TraceWatch UI** | `frontend` | 3000 | Real-time observability web dashboard |

## 3. Communication Patterns

### Synchronous Request-Response (HTTP/REST)
- Client to API Gateway: Standard HTTP/1.1 JSON.
- API Gateway to Downstream: Asynchronous non-blocking HTTP using `httpx.AsyncClient`.
- Order Service to Payment Service: Synchronous HTTP invocation to ensure immediate payment confirmation prior to order completion.
- Order Service to Notification Service: HTTP invocation following payment status evaluation.

### Telemetry Export (gRPC/OTLP)
- All Python microservices instantiate the OpenTelemetry `OTLPSpanExporter` configured to export over gRPC directly to `otel-collector:4317`.
- The collector batches spans and pushes them via OTLP gRPC to `jaeger:4317`.

## 4. Context Propagation Mechanism

TraceWatch adheres to the **W3C Trace Context Specification**:
1. When a client initiates a request at `api-gateway`, an initial `trace_id` is established.
2. The gateway executes `opentelemetry.propagate.inject(headers)`. This populates the `traceparent` HTTP header formatted as:
   `version-traceid-parentspanid-traceflags` (e.g. `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`).
3. Downstream services receive the request, auto-extract the parent context, and bind child operations as subordinate spans under the exact same `trace_id`.
