# TraceWatch – Distributed Tracing and Telemetry Collector

> A fully functional, production-style observability platform demonstrating distributed tracing, telemetry collection, monitoring, and failure detection across microservices.

[![Python](https://img.shields.io/badge/Python-3.12-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green.svg)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev)
[![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-1.29-orange.svg)](https://opentelemetry.io)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://docker.com)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement & Motivation](#2-problem-statement--motivation)
3. [Key Objectives](#3-key-objectives)
4. [Technology Stack](#4-technology-stack)
5. [System Architecture](#5-system-architecture)
6. [Distributed Tracing Details](#6-distributed-tracing-details)
7. [Telemetry Collection Pipeline](#7-telemetry-collection-pipeline)
8. [Microservices Breakdown](#8-microservices-breakdown)
9. [Installation & Deployment](#9-installation--deployment)
10. [Docker Compose Deployment](#10-docker-compose-deployment)
11. [API Endpoints Reference](#11-api-endpoints-reference)
12. [Automated Testing](#12-automated-testing)
13. [Dashboard Access URLs](#13-dashboard-access-urls)
14. [Sample Execution & Traces](#14-sample-execution--traces)
15. [System Design Concepts](#15-system-design-concepts)
16. [Failure Simulation & Observability Demonstration](#16-failure-simulation--observability-demonstration)
17. [College Evaluation & Demo Guide](#17-college-evaluation--demo-guide)
18. [Future Enhancements](#18-future-enhancements)

---

## 1. Project Overview

**TraceWatch** is an industry-grade System Design Mini Project designed for Computer Engineering students. It models a distributed e-commerce workflow (API Gateway, Authentication, Order Management, Payment Processing, and Notifications) fully instrumented with **OpenTelemetry**.

Telemetry signals (distributed traces and application metrics) are gathered by an **OpenTelemetry Collector**, forwarded to **Jaeger** for trace graph inspection and **Prometheus** for metric time-series aggregation, and visualized both in **Grafana** and a dedicated **React + Vite + Tailwind CSS** monitoring dashboard.

---

## 2. Problem Statement & Motivation

In microservice architectures, an incoming client transaction often involves multiple inter-service network hops. When a transaction suffers from latency or unexpected failure:
- Pinpointing which downstream microservice failed or delayed is difficult without correlation.
- Log aggregation alone lacks parent-child context and propagation timings.
- Traditional monitoring measures individual machines rather than end-to-end request journeys.

**TraceWatch** solves this by establishing context-propagated distributed tracing, metric instrumentations, automated collectors, and visual failure simulations.

---

## 3. Key Objectives

- **Microservice Decoupling**: Separate concerns across 5 modular services with asynchronous and synchronous communications.
- **Trace Context Propagation**: Implement W3C `traceparent` context propagation across all HTTP network boundaries.
- **Unified Telemetry Collection**: Channel traces and metrics through an OpenTelemetry Collector gateway.
- **Failure Identification**: Provide interactive failure injections (delayed transactions, payment declines, notification delivery faults) and immediately trace the root cause in Jaeger.
- **Turnkey Deployment**: Single-command startup using Docker Compose with automated health checks and provisioned dashboards.

---

## 4. Technology Stack

### Backend Microservices
- **Language & Runtime**: Python 3.12
- **Framework**: FastAPI 0.115.5 with Uvicorn 0.32.1
- **HTTP Client**: HTTPX 0.28.1 (async with tracing injection)
- **Security**: Python-JOSE 3.3.0 (JWT) & Passlib 1.7.4 (Bcrypt)
- **Data Validation**: Pydantic v2

### Distributed Tracing & Telemetry
- **OpenTelemetry API & SDK**: v1.29.0
- **Auto-Instrumentation**: `opentelemetry-instrumentation-fastapi` 0.50b0
- **Exporters**: OTLP gRPC (`opentelemetry-exporter-otlp-proto-grpc` 1.29.0)
- **Collector**: `otel/opentelemetry-collector-contrib:0.111.0`

### Monitoring & Visualization
- **Distributed Traces Storage & UI**: Jaeger 1.57 (`jaegertracing/all-in-one`)
- **Metrics Scraping & Time-Series DB**: Prometheus 2.55.0
- **Provisioned Dashboards**: Grafana 11.3.0
- **Python Metrics Client**: `prometheus-client` 0.21.1

### Web Frontend
- **Framework**: React 18 with Vite 6
- **Styling**: Tailwind CSS 3.4
- **Visualizations**: Recharts 2.13
- **Icons**: Lucide React
- **Web Server**: Nginx Alpine

---

## 5. System Architecture

```
User / Client
      │
      ▼ (HTTP / JSON)
┌────────────────────────────────────────────────────────┐
│               TraceWatch Web UI (:3000)                │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                 API Gateway (:8000)                    │
│    (Context Injection, Latency Recording, Proxying)   │
└───────┬──────────────────┬─────────────────┬───────────┘
        │                  │                 │
        ▼                  ▼                 ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Auth Service │   │ Order Service│   │ Payment Svc  │
│   (:8001)    │   │   (:8002)    │   │   (:8003)    │
└──────────────┘   └───────┬──────┘   └──────────────┘
                           │                 ▲
                           ├─────────────────┘ (Synchronous HTTP)
                           ▼
                   ┌──────────────┐
                   │Notification  │
                   │Service(:8004)│
                   └──────────────┘

══════════════════════ TELEMETRY FLOW ══════════════════════

All Microservices (FastAPI + OTel SDK)
       │ (OTLP gRPC :4317)
       ▼
OpenTelemetry Collector (:4317 / :4318)
       ├─── Traces Pipeline (Batch + Memory Limiter) ───► Jaeger (:16686)
       └─── Metrics Pipeline (Prometheus Exporter)   ───► Prometheus (:9090)
                                                                 │
                                                                 ▼
                                                          Grafana (:3001)
```

---

## 6. Distributed Tracing Details

### Trace & Span IDs
- **Trace ID**: A 16-byte (32 hex characters) unique identifier representing the entire request journey.
- **Span ID**: An 8-byte (16 hex characters) unique identifier representing a single unit of work within a service.

### Context Propagation in Action
When API Gateway receives a request:
1. A root span is created (e.g. `api-gateway.orders.create`).
2. OpenTelemetry's `inject(headers)` adds the standard W3C `traceparent` header to outgoing HTTP requests:
   ```
   traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
   ```
3. Downstream services (`order-service`, `payment-service`, `notification-service`) extract the context using `extract(request.headers)` or automated FastAPI instrumentors.
4. Downstream operations create child spans referencing the incoming parent Span ID.
5. If an unhandled exception or status error occurs (e.g. simulated payment rejection), `span.record_exception(e)` and `span.set_status(StatusCode.ERROR)` flag the span in red inside Jaeger.

---

## 7. Telemetry Collection Pipeline

The **OpenTelemetry Collector** configuration (`otel-collector/otel-collector-config.yaml`) configures:

```yaml
receivers:
  otlp:
    protocols:
      grpc: { endpoint: "0.0.0.0:4317" }
      http: { endpoint: "0.0.0.0:4318" }

processors:
  batch: { timeout: 1s, send_batch_size: 1024 }
  memory_limiter: { check_interval: 1s, limit_mib: 512, spike_limit_mib: 128 }

exporters:
  otlp/jaeger:
    endpoint: "jaeger:4317"
    tls: { insecure: true }
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: tracewatch
```

All microservices emit OTLP gRPC telemetry directly to `otel-collector:4317`. Prometheus subsequently scrapes the collector at `:8889` as well as all individual microservices at `/metrics`.

---

## 8. Microservices Breakdown

### A. API Gateway (`:8000`)
- **Role**: Single public ingress proxy.
- **Routes**: `/api/auth/*`, `/api/orders/*`, `/api/payments/*`, `/api/notifications/*`, `/api/simulate/order-flow`, `/api/services/health`.
- **Instrumentation**: Measures incoming request latency and forwards headers with trace context.

### B. Authentication Service (`:8001`)
- **Role**: User authentication, JWT issuance, and verification.
- **Endpoints**: `POST /register`, `POST /login`, `POST /validate`, `GET /health`, `GET /metrics`.
- **Metrics**: `auth_requests_total`, `auth_failures_total`, `auth_duration_seconds`.

### C. Order Service (`:8002`)
- **Role**: Order orchestration and lifecycle management.
- **Workflow**: Persists orders, synchronously triggers `payment-service`, then notifies `notification-service`.
- **Metrics**: `order_requests_total`, `order_duration_seconds`, `order_value_dollars`.

### D. Payment Service (`:8003`)
- **Role**: Simulates financial authorization and payment gateway.
- **Features**: Toggleable artificial latency and failure injection (`POST /simulate/failure`).
- **Metrics**: `payment_requests_total`, `payment_failures_total`, `payment_duration_seconds`.

### E. Notification Service (`:8004`)
- **Role**: Email, SMS, and in-app alerts.
- **Features**: Supports failure toggle (`POST /simulate/failure`) to test partial system degradation.
- **Metrics**: `notification_requests_total`, `notification_failures_total`, `notification_duration_seconds`.

---

## 9. Installation & Deployment

### Prerequisites
- Docker Engine 24.0+ and Docker Compose v2.20+
- (Optional for host running) Python 3.12 and Node.js 20+

### Setup Steps
```bash
# 1. Navigate to the project root
cd /path/to/SystemDesignProject

# 2. Check environment configuration
cp .env.example .env

# 3. Build and launch all containers
docker compose up --build -d

# 4. Verify running services
docker compose ps
```

---

## 10. Docker Compose Deployment

The `docker-compose.yml` orchestrates 10 interconnected services within a private bridge network `tracewatch-net`:

| Container Name | Internal Port | Host Port | Healthcheck |
|----------------|---------------|-----------|-------------|
| `tracewatch-frontend` | 80 | **3000** | HTTP GET `/` |
| `tracewatch-api-gateway` | 8000 | **8000** | HTTP GET `/health` |
| `tracewatch-auth-service` | 8001 | **8001** | HTTP GET `/health` |
| `tracewatch-order-service` | 8002 | **8002** | HTTP GET `/health` |
| `tracewatch-payment-service` | 8003 | **8003** | HTTP GET `/health` |
| `tracewatch-notification-service` | 8004 | **8004** | HTTP GET `/health` |
| `tracewatch-otel-collector` | 4317, 8889 | **4319, 8889** | HTTP GET `/` on `:13133` |
| `tracewatch-jaeger` | 16686, 4317 | **16686** | HTTP GET `/` on `:16686` |
| `tracewatch-prometheus` | 9090 | **9090** | HTTP GET `/-/healthy` |
| `tracewatch-grafana` | 3000 | **3001** | HTTP GET `/api/health` |

---

## 11. API Endpoints Reference

### API Gateway (`http://localhost:8000`)
- `GET /health`: Overall gateway health.
- `GET /metrics`: Prometheus metric scrape endpoint.
- `GET /api/services/health`: Consolidated status of all 4 downstream services.
- `POST /api/auth/register`: `{ "username": "alice", "email": "alice@test.com", "password": "pass" }`
- `POST /api/auth/login`: `{ "username": "alice", "password": "pass" }`
- `POST /api/orders`: `{ "user_id": "u1", "items": [{"product": "Book", "quantity": 1, "price": 20}], "total": 20.0 }`
- `GET /api/orders/{order_id}`: Retrieves order by ID.
- `POST /api/payments/process`: `{ "order_id": "o1", "amount": 20.0 }`
- `POST /api/notifications/send`: `{ "user_id": "u1", "message": "hello", "type": "email" }`
- `POST /api/simulate/order-flow`: Complete composite e-commerce workflow with optional flags:
  ```json
  {
    "user_id": "demo-user",
    "items": [{"product": "Widget", "quantity": 2, "price": 25.0}],
    "total": 50.0,
    "simulate_payment_failure": false,
    "simulate_notification_failure": false
  }
  ```

---

## 12. Automated Testing

TraceWatch includes automated tests using `pytest` and `httpx`.

```bash
# Install test dependencies
pip install -r tests/requirements-test.txt

# Run all test suites
pytest tests/ -v
```

Tests cover:
- Health checks for all 5 services
- User registration, duplicate guards, and JWT token authentication & validation
- Order creation and querying
- Payment success and simulated 402 rejection
- Notification transmission and simulated 503 errors
- API Gateway proxying and composite order flow
- Prometheus metrics availability
- Jaeger trace ingestion verification

---

## 13. Dashboard Access URLs

| Application | URL | Default Credentials | Description |
|---|---|---|---|
| **TraceWatch Web UI** | [http://localhost:3000](http://localhost:3000) | None | Dark-mode React telemetry portal |
| **Jaeger Tracing** | [http://localhost:16686](http://localhost:16686) | None | Distributed trace graph explorer |
| **Prometheus** | [http://localhost:9090](http://localhost:9090) | None | Metric queries and scraping status |
| **Grafana** | [http://localhost:3001](http://localhost:3001) | `admin` / `tracewatch123` | Provisioned dashboards & visualizations |
| **Gateway Swagger** | [http://localhost:8000/docs](http://localhost:8000/docs) | None | Interactive OpenAPI docs |

---

## 14. Sample Execution & Traces

### Execute Order Flow:
```bash
curl -X POST http://localhost:8000/api/simulate/order-flow \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "student-demo",
    "items": [{"product": "Cloud Architecture Guide", "quantity": 1, "price": 45.0}],
    "total": 45.0
  }'
```

### Response:
```json
{
  "flow": "complete",
  "results": {
    "order": {
      "order_id": "order-c38a19de",
      "user_id": "student-demo",
      "items": [{"product": "Cloud Architecture Guide", "quantity": 1, "price": 45.0}],
      "total": 45.0,
      "status": "paid",
      "payment_id": "pay-f0183b92"
    },
    "payment": {
      "payment_id": "pay-f0183b92",
      "order_id": "order-c38a19de",
      "amount": 45.0,
      "status": "success",
      "transaction_id": "txn-5f3e2849b01c"
    },
    "notification": {
      "notification_id": "notif-7d2a8b91",
      "user_id": "student-demo",
      "status": "sent"
    }
  }
}
```

Viewing this trace in **Jaeger** ([http://localhost:16686](http://localhost:16686)) shows a 6-span hierarchy:
```
[api-gateway] api-gateway.simulate.order-flow (120ms)
 ├── [order-service] order.create (112ms)
 │    ├── [payment-service] payment.process (85ms)
 │    └── [notification-service] notification.send (15ms)
```

---

## 15. System Design Concepts

1. **Microservices Architecture**: Discrete boundaries, loose coupling, and distinct state management.
2. **API Gateway Pattern**: Request routing, CORS handling, authentication gateway, and perimeter telemetry.
3. **Distributed Context Propagation**: Passing W3C standard HTTP trace headers across independent services.
4. **Three Pillars of Observability**:
   - *Metrics*: Aggregated time-series counters and histograms (Prometheus).
   - *Traces*: Request execution trees with latency breakdowns (Jaeger).
   - *Logs*: Context-tagged operational events.
5. **Telemetry Pipeline Architecture**: Decoupling microservices from storage backends via the OpenTelemetry Collector.
6. **Fault Isolation & Graceful Degradation**: Preventing downstream service timeouts from crashing upstream components.
7. **Service Discovery via Docker DNS**: Using container aliases within an isolated bridge network.

---

## 16. Failure Simulation & Observability Demonstration

Open the **TraceWatch Web UI** -> **Simulate** page:
1. **Trigger Auth Failure**: Sends invalid login credentials. Observe the counter `auth_failures_total` rise in Prometheus and an error span recorded in Jaeger.
2. **Payment Failure Mode**: Toggle payment failure on. Next order fails immediately with an HTTP 402 code. In Jaeger, the `payment.process` span is highlighted in red with error tags.
3. **Artificial Latency**: Introduce a 2.0-second delay. Observe the p95 latency curve climb in the Grafana dashboard and in the TraceWatch metrics charts.

---

## 17. College Evaluation & Demo Guide

During project presentation / viva:
1. **Explain the Architecture**: Use the built-in **Architecture** tab in the web UI at `http://localhost:3000/architecture` to explain the services and data flow.
2. **Demonstrate Traffic Generation**: Go to the **Simulate** tab and trigger a normal order flow.
3. **Show Distributed Tracing**: Open **Jaeger UI** (`http://localhost:16686`), select `api-gateway`, find the trace, and expand the spans to explain parent-child relationships and timing.
4. **Demonstrate Root-Cause Analysis**: Turn on "Payment Service Failure" in the simulation tab, run another order, and show how the error appears in red in Jaeger with the exact stack trace and reason.
5. **Show Centralized Metrics**: Open **Grafana** (`http://localhost:3001`) to show the automated Prometheus dashboards displaying real-time RPS, latency percentiles (p50, p95, p99), and error rates.

---

## 18. Future Enhancements

- **Persistent Database Layer**: Integration of PostgreSQL or MongoDB with OpenTelemetry SQL instrumentation.
- **Log Aggregator**: Adding Grafana Loki and Promtail to correlate logs directly with Trace IDs.
- **Message Broker**: Introducing Apache Kafka or RabbitMQ for asynchronous event-driven trace propagation.
- **Service Mesh**: Deploying Envoy / Istio for zero-code network telemetry.
