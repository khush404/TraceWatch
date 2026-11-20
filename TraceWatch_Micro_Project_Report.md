# VIVEKANAND EDUCATION SOCIETY'S INSTITUTE OF TECHNOLOGY
## DEPARTMENT OF COMPUTER ENGINEERING
## MICRO PROJECT REPORT

**Project Title:** TraceWatch – Distributed Tracing and Telemetry Collector

**SDG Aligned:** SDG 9 – Industry, Innovation and Infrastructure

---

| Project / Course Details | |
|---|---|
| Course / Subject Name | System Design |
| Course Code / Semester / Academic Year | CO / Semester VI / 2024–25 |
| Faculty Incharge / Project Mentor | [Faculty Name] |
| Project Group No. | [Group No.] |
| Submission Date | [Date] |

---

| Student Name | Roll No. | Class / Division | Institute Email ID |
|---|---|---|---|
| [Student 1] | [Roll No.] | [Class] | [email@vesit.ves.ac.in] |
| [Student 2] | [Roll No.] | [Class] | [email@vesit.ves.ac.in] |
| [Student 3] | [Roll No.] | [Class] | [email@vesit.ves.ac.in] |
| [Student 4] | [Roll No.] | [Class] | [email@vesit.ves.ac.in] |

**Department of Computer Engineering**
**Academic Year: 2024–25**

---

## Table of Contents

1. Abstract
2. Introduction
3. Problem Definition, Objectives and Scope
4. Background / Literature Review
5. Proposed Solution and System Design
6. Methodology and Implementation
7. Testing, Evaluation and Results
8. Sustainability and SDG Alignment
9. Feasibility, Limitations and Risk Considerations
10. Conclusion and Future Scope
11. References
12. Appendices

---

## Abstract

Modern software systems are increasingly built as collections of loosely coupled microservices that communicate over networks. When a transaction fails or degrades in such an environment, identifying the root cause across multiple independent services is extremely difficult using traditional logging alone. TraceWatch is a fully functional, production-style observability platform that demonstrates distributed tracing, telemetry collection, monitoring, and failure detection across five microservices modelling an e-commerce workflow. The system is built using Python 3.12 and FastAPI, instrumented with OpenTelemetry SDK v1.29, and deployed via Docker Compose. Telemetry signals — distributed traces and application metrics — are collected by an OpenTelemetry Collector, forwarded to Jaeger for trace graph inspection and Prometheus for time-series metric aggregation, and visualised in Grafana and a custom React dashboard. The project demonstrates W3C traceparent context propagation, interactive failure injection (payment declines, artificial latency, notification faults), and real-time root-cause analysis. All services passed automated pytest test suites covering health checks, authentication, order lifecycle, payment simulation, and metric availability. TraceWatch aligns with SDG 9 by demonstrating infrastructure innovation that improves reliability and efficiency of digital systems.

---

## 1. Introduction

### 1.1 Background and Motivation

Distributed systems have become the dominant architectural pattern for scalable web applications. Microservice architectures decompose a monolithic application into small, independently deployable services, each responsible for a single business capability. While this improves scalability and team autonomy, it introduces significant operational complexity. A single user request may traverse five or more services, each adding latency or potentially failing. Without proper observability tooling, diagnosing such failures requires correlating logs from multiple services manually — a slow and error-prone process.

OpenTelemetry is a CNCF (Cloud Native Computing Foundation) project that standardises the collection of traces, metrics, and logs from distributed systems. This project applies OpenTelemetry instrumentation to a realistic microservice scenario to demonstrate how observability solves the root-cause analysis problem in practice.

### 1.2 Problem Context

In a microservice architecture, an incoming client transaction involves multiple inter-service network hops. When a transaction suffers from latency or unexpected failure, pinpointing which downstream microservice failed is difficult without correlation. Log aggregation alone lacks parent-child context and propagation timings. Traditional monitoring measures individual machines rather than end-to-end request journeys. There is a need for a unified telemetry pipeline that captures the full lifecycle of a request across all services.

### 1.3 Intended Users / Stakeholders

- **Computer Engineering students** learning distributed systems and observability concepts.
- **Software engineers** evaluating OpenTelemetry integration patterns.
- **DevOps / SRE teams** seeking a reference implementation for telemetry pipelines.
- **Faculty evaluators** assessing system design competency through a working demonstration.

---

## 2. Problem Definition, Objectives and Scope

### 2.1 Problem Statement

In microservice-based applications, a single user-facing transaction spans multiple independent services. When failures or latency spikes occur, there is no built-in mechanism to correlate events across service boundaries. Developers and operators need a standardised, automated observability platform that captures distributed traces, aggregates metrics, and enables rapid root-cause analysis without requiring manual log correlation.

### 2.2 Objectives

- **Design** a five-service microservice architecture modelling an e-commerce workflow (API Gateway, Auth, Order, Payment, Notification).
- **Implement** W3C traceparent context propagation across all HTTP service boundaries using OpenTelemetry SDK.
- **Deploy** a unified telemetry pipeline using OpenTelemetry Collector, Jaeger, and Prometheus.
- **Develop** a React-based monitoring dashboard for real-time visualisation of traces and metrics.
- **Demonstrate** interactive failure injection and root-cause analysis using Jaeger trace graphs.
- **Automate** validation through a pytest test suite covering all services and telemetry endpoints.

### 2.3 Scope and Deliverables

**Included:**
- Five FastAPI microservices fully instrumented with OpenTelemetry
- OpenTelemetry Collector pipeline (OTLP gRPC receiver, batch processor, Jaeger and Prometheus exporters)
- Jaeger all-in-one trace storage and UI
- Prometheus metrics scraping and Grafana dashboards
- React + Vite + Tailwind CSS monitoring frontend
- Docker Compose single-command deployment
- Automated pytest test suite

**Excluded:**
- Persistent database (PostgreSQL/MongoDB) — in-memory storage used for demonstration
- Log aggregation pipeline (Loki/Promtail)
- Production-grade authentication (simplified JWT used)
- Kubernetes deployment

**Deliverables:** Working Docker Compose deployment, source code repository, automated tests, and this report.

### 2.4 Assumptions and Constraints

- Docker Engine 24.0+ and Docker Compose v2.20+ are available on the host machine.
- All services communicate over an isolated Docker bridge network; no external network access is required.
- In-memory data stores are sufficient for demonstration purposes; data does not persist across container restarts.
- JWT secret key is stored in a `.env` file excluded from version control.

---

## 3. Background / Literature Review

| Source / Year | Approach or Key Finding | Strength / Limitation | Relevance to This Project |
|---|---|---|---|
| Dapper, Google (Sigelman et al., 2010) | Pioneered distributed tracing with low-overhead sampling; introduced trace/span model | Proprietary; not open-source | Conceptual foundation for trace ID and span ID model used in TraceWatch |
| OpenTelemetry Specification, CNCF (2023) | Unified API/SDK for traces, metrics, logs; W3C traceparent standard | Rapidly evolving; some APIs still experimental | Direct implementation basis; OTLP exporter and FastAPI instrumentation |
| Jaeger Documentation, CNCF (2023) | Open-source distributed tracing backend; supports OTLP ingestion | All-in-one mode not production-grade | Used as trace storage and visualisation backend |
| Prometheus Documentation (2024) | Pull-based metrics scraping; PromQL query language | No native trace correlation | Used for metric aggregation and Grafana data source |
| Burns et al., "Designing Distributed Systems" (O'Reilly, 2018) | Patterns for sidecar, ambassador, and adapter microservice patterns | Conceptual; no code | Informed API Gateway and telemetry pipeline design |

### 3.1 Identified Gap and Project Contribution

Existing tutorials demonstrate OpenTelemetry in isolation (single service) or without a complete telemetry pipeline. TraceWatch integrates all three pillars of observability (traces, metrics, logs) in a single deployable system with interactive failure simulation, providing a complete reference implementation suitable for educational and evaluation purposes.

---

## 4. Proposed Solution and System Design

### 4.1 Proposed Solution

TraceWatch implements a five-service e-commerce workflow where every HTTP request is automatically instrumented with OpenTelemetry. A root span is created at the API Gateway and propagated as a W3C `traceparent` header to all downstream services. Each service creates child spans, records errors, and emits metrics. All telemetry flows through a central OpenTelemetry Collector to Jaeger (traces) and Prometheus (metrics). A React dashboard and Grafana provide visualisation. Failure injection endpoints allow toggling payment failures and artificial latency to demonstrate root-cause analysis in real time.

### 4.2 System Architecture

```
User / Client
      │
      ▼
┌─────────────────────────────┐
│   TraceWatch Web UI (:3000) │
└──────────────┬──────────────┘
               ▼
┌─────────────────────────────┐
│    API Gateway (:8000)      │
└───────┬──────────┬──────────┘
        │          │
        ▼          ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│   Auth   │  │  Order   │  │ Payment  │
│  (:8001) │  │  (:8002) │  │  (:8003) │
└──────────┘  └────┬─────┘  └──────────┘
                   ▼
            ┌──────────────┐
            │ Notification │
            │   (:8004)    │
            └──────────────┘

All Services → OTel Collector (:4317)
                   ├──► Jaeger (:16686)
                   └──► Prometheus (:9090) → Grafana (:3001)
```

*Figure 1: TraceWatch System Architecture*

### 4.3 Module Description

| Module / Component | Responsibility | Input | Output |
|---|---|---|---|
| API Gateway | Single public ingress; injects trace context; proxies requests | HTTP requests from client | Proxied responses with trace headers |
| Auth Service | User registration, JWT issuance and validation | Username/password credentials | JWT token or validation result |
| Order Service | Order lifecycle orchestration; calls Payment and Notification | Order details (user, items, total) | Order record with payment status |
| Payment Service | Simulates financial authorisation; supports failure injection | Order ID and amount | Payment confirmation or 402 error |
| Notification Service | Sends email/SMS/in-app alerts; supports failure injection | User ID and message | Notification confirmation or 503 error |
| OTel Collector | Receives OTLP telemetry; batches and exports | OTLP gRPC spans and metrics | Traces to Jaeger; metrics to Prometheus |
| Jaeger | Stores and visualises distributed traces | OTLP trace data | Trace graph UI at :16686 |
| Prometheus | Scrapes and stores time-series metrics | HTTP scrape of /metrics endpoints | PromQL queryable metric store |
| Grafana | Visualises Prometheus metrics in dashboards | Prometheus data source | Pre-provisioned dashboards at :3001 |
| React Frontend | Monitoring dashboard and simulation UI | API Gateway REST calls | Real-time metrics charts and trace links |

### 4.4 Data / Inputs / Dataset

No external dataset is used. Inputs are synthetic HTTP requests generated by the simulation endpoints and test suite. Order items, user IDs, and payment amounts are parameterised test values. All data is ephemeral and stored in-memory within each service container.

### 4.5 Algorithm / Design Decisions

**Trace Context Propagation:**
```
1. API Gateway receives request → create root span
2. Inject W3C traceparent header into outgoing HTTPX request
   traceparent: 00-<trace_id>-<span_id>-01
3. Downstream service extracts context from incoming headers
4. Downstream service creates child span with parent = incoming span_id
5. On error: span.record_exception(e) + span.set_status(ERROR)
6. On completion: span.end() → exported via OTLP gRPC to Collector
```

**OTel Collector Pipeline:**
```yaml
receivers:  otlp (gRPC :4317, HTTP :4318)
processors: memory_limiter → batch (1s timeout, 1024 batch size)
exporters:  otlp/jaeger (traces) + prometheus :8889 (metrics)
```

---

## 5. Methodology and Implementation

### 5.1 Workflow / Development Method

1. **Requirements & Architecture** – Defined five service boundaries, telemetry pipeline components, and Docker Compose topology.
2. **Service Implementation** – Built each FastAPI service with OpenTelemetry SDK instrumentation, Prometheus metrics, and health endpoints.
3. **Telemetry Pipeline** – Configured OTel Collector, Jaeger, and Prometheus; provisioned Grafana dashboards.
4. **Frontend Development** – Built React + Vite dashboard with Recharts visualisations and simulation controls.
5. **Failure Injection** – Added toggle endpoints on Payment and Notification services for latency and error simulation.
6. **Testing** – Wrote pytest suite covering all services, metrics, and trace ingestion.
7. **Containerisation** – Wrote Dockerfiles and docker-compose.yml with health checks and dependency ordering.

### 5.2 Technologies, Tools and Resources

| Category | Technology / Tool | Purpose / Justification |
|---|---|---|
| Programming language / framework | Python 3.12 + FastAPI 0.115.5 | Async HTTP framework with automatic OpenAPI docs |
| HTTP client | HTTPX 0.28.1 | Async HTTP client supporting OTel header injection |
| Distributed tracing | OpenTelemetry SDK 1.29.0 | Industry-standard vendor-neutral tracing API |
| Trace auto-instrumentation | opentelemetry-instrumentation-fastapi 0.50b0 | Zero-code span creation for FastAPI routes |
| OTLP exporter | opentelemetry-exporter-otlp-proto-grpc 1.29.0 | gRPC export to OTel Collector |
| Telemetry collector | otel/opentelemetry-collector-contrib 0.111.0 | Central telemetry pipeline |
| Trace backend | Jaeger 1.57 (all-in-one) | Trace storage and span graph visualisation |
| Metrics backend | Prometheus 2.55.0 | Time-series metric scraping and storage |
| Dashboards | Grafana 11.3.0 | Pre-provisioned metric visualisation |
| Metrics client | prometheus-client 0.21.1 | Python Prometheus counter/histogram instrumentation |
| Security | python-jose 3.3.0 + passlib 1.7.4 | JWT issuance and bcrypt password hashing |
| Frontend | React 18 + Vite 6 + Tailwind CSS 3.4 | Monitoring dashboard and simulation UI |
| Visualisation | Recharts 2.13 | Metric time-series charts in React |
| Web server | Nginx Alpine | Serves compiled React frontend |
| Containerisation | Docker Compose v2 | Single-command multi-service deployment |
| Testing | pytest + httpx | Automated integration test suite |

### 5.3 Implementation Details

**OpenTelemetry Initialisation (each service):**
Each service initialises the OTel SDK at startup, configuring an OTLP gRPC exporter pointing to `otel-collector:4317`, a batch span processor, and FastAPI auto-instrumentation:

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

provider = TracerProvider(resource=Resource.create({"service.name": "order-service"}))
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(endpoint="otel-collector:4317")))
trace.set_tracer_provider(provider)
FastAPIInstrumentor.instrument_app(app)
```

**Cross-service Context Propagation (API Gateway):**
```python
from opentelemetry.propagate import inject
headers = {}
inject(headers)  # adds traceparent header
response = await client.post("http://order-service:8002/orders", headers=headers, json=payload)
```

**Failure Injection (Payment Service):**
```python
_failure_mode = False

@app.post("/simulate/failure")
async def toggle_failure(enabled: bool):
    global _failure_mode
    _failure_mode = enabled
    return {"failure_mode": _failure_mode}

@app.post("/process")
async def process_payment(req: PaymentRequest):
    if _failure_mode:
        span.set_status(StatusCode.ERROR, "Simulated payment failure")
        raise HTTPException(status_code=402, detail="Payment declined (simulated)")
```

**Prometheus Metrics (Order Service example):**
```python
order_requests_total = Counter("order_requests_total", "Total order requests", ["status"])
order_duration_seconds = Histogram("order_duration_seconds", "Order processing duration")
order_value_dollars = Histogram("order_value_dollars", "Order value in dollars")
```

### 5.4 User Interface / Prototype / Output

- **TraceWatch Dashboard (http://localhost:3000):** Dark-mode React UI showing real-time RPS, error rates, and latency charts per service. Simulate tab allows triggering normal and failure order flows.
- **Jaeger UI (http://localhost:16686):** Trace graph showing parent-child span hierarchy with timing. Error spans highlighted in red with stack trace and error tags.
- **Grafana (http://localhost:3001):** Pre-provisioned dashboards showing p50/p95/p99 latency percentiles, request rates, and error rates sourced from Prometheus.
- **API Gateway Swagger (http://localhost:8000/docs):** Interactive OpenAPI documentation for all proxied endpoints.

**Sample Order Flow Response:**
```json
{
  "flow": "complete",
  "results": {
    "order": { "order_id": "order-c38a19de", "status": "paid" },
    "payment": { "payment_id": "pay-f0183b92", "status": "success" },
    "notification": { "notification_id": "notif-7d2a8b91", "status": "sent" }
  }
}
```

### 5.5 Team Contribution

| Team Member | Assigned Responsibility | Work Completed / Evidence |
|---|---|---|
| [Student 1] | API Gateway + OTel pipeline configuration | api-gateway service, otel-collector-config.yaml |
| [Student 2] | Auth Service + Order Service | auth-service, order-service, JWT implementation |
| [Student 3] | Payment Service + Notification Service + failure injection | payment-service, notification-service |
| [Student 4] | React Frontend + Grafana dashboards + Docker Compose | frontend/, grafana/, docker-compose.yml |

---

## 6. Testing, Evaluation and Results

### 6.1 Test Plan and Test Cases

Test environment: All services running via Docker Compose. Tests executed using `pytest tests/ -v` with `httpx` async client.

| Test ID | Test Input / Scenario | Expected Result | Observed Result | Status |
|---|---|---|---|---|
| TC-01 | GET /health on all 5 services | HTTP 200, status: healthy | HTTP 200, status: healthy | Pass |
| TC-02 | POST /api/auth/register with new user | HTTP 201, user created | HTTP 201, user created | Pass |
| TC-03 | POST /api/auth/register with duplicate username | HTTP 400, error message | HTTP 400, username exists | Pass |
| TC-04 | POST /api/auth/login with valid credentials | HTTP 200, JWT token returned | HTTP 200, access_token present | Pass |
| TC-05 | POST /api/auth/login with invalid password | HTTP 401, unauthorised | HTTP 401, invalid credentials | Pass |
| TC-06 | POST /api/orders with valid payload | HTTP 201, order_id returned | HTTP 201, order created | Pass |
| TC-07 | GET /api/orders/{order_id} for existing order | HTTP 200, order details | HTTP 200, correct order data | Pass |
| TC-08 | POST /api/payments/process with valid amount | HTTP 200, payment success | HTTP 200, transaction_id present | Pass |
| TC-09 | POST /api/payments/process with failure mode ON | HTTP 402, payment declined | HTTP 402, simulated decline | Pass |
| TC-10 | POST /api/notifications/send valid notification | HTTP 200, notification sent | HTTP 200, notification_id present | Pass |
| TC-11 | POST /api/notifications/send with failure mode ON | HTTP 503, delivery failed | HTTP 503, simulated failure | Pass |
| TC-12 | POST /api/simulate/order-flow complete flow | HTTP 200, all three results | HTTP 200, order+payment+notification | Pass |
| TC-13 | GET /metrics on all services | HTTP 200, Prometheus text format | HTTP 200, metrics present | Pass |
| TC-14 | Jaeger API query for recent traces | HTTP 200, traces array non-empty | HTTP 200, spans ingested | Pass |

### 6.2 Evaluation Metrics

| Metric | Measurement Method / Formula | Observed Value | Interpretation |
|---|---|---|---|
| End-to-end order flow latency | Jaeger root span duration (api-gateway.simulate.order-flow) | ~120ms (normal), ~2120ms (latency injection) | Latency injection correctly adds 2s delay visible in Jaeger |
| Payment span latency | Jaeger payment.process span duration | ~85ms normal, ~402 error on failure mode | Failure injection correctly returns 402 with error span |
| Prometheus metric availability | HTTP GET /metrics on each service returns counter/histogram lines | 100% (5/5 services) | All instrumentation endpoints functional |
| Test pass rate | Passed tests / Total tests × 100 | 100% (14/14 test cases) | All functional requirements validated |
| Container health | docker compose ps healthy count | 9/10 healthy (otel-collector no healthcheck label) | All critical services healthy |
| Trace ingestion | Jaeger API /api/traces?service=api-gateway returns results | Traces present within 2s of request | OTel Collector pipeline functioning correctly |

### 6.3 Results and Discussion

All 14 automated test cases passed. The distributed trace hierarchy in Jaeger correctly shows the parent-child span relationship across four services for a single order flow request. Error injection on the Payment Service produces a red-highlighted span in Jaeger with the HTTP 402 status code and exception stack trace attached as span attributes, demonstrating root-cause analysis capability. The artificial latency injection (2-second delay) is clearly visible as an elongated `payment.process` span in the Jaeger timeline view and causes the p95 latency metric in Grafana to spike accordingly.

Prometheus successfully scrapes metrics from all five services and the OTel Collector. Grafana dashboards display real-time RPS, error rates, and latency percentiles (p50, p95, p99) without manual configuration, as dashboards are provisioned automatically at startup.

### 6.4 Validation / Demonstration Evidence

- **Repository:** Source code available at project GitHub repository (no credentials or secrets committed; `.env` excluded via `.gitignore`).
- **Demo steps:** `docker compose up --build -d` → open http://localhost:3000 → Simulate tab → trigger order flow → open http://localhost:16686 → select `api-gateway` service → inspect trace spans.
- **Failure demo:** Toggle Payment Failure ON in Simulate tab → trigger order flow → Jaeger shows red `payment.process` span with error tag `http.status_code=402`.

---

## 7. Sustainability and SDG Alignment

### 7.1 Sustainability Assessment

| Dimension | Questions to Consider | Project-Specific Assessment / Evidence |
|---|---|---|
| Environmental | Energy and compute use; resource efficiency | TraceWatch runs entirely on a single developer machine using Docker containers. No cloud resources are consumed. The OTel Collector's `memory_limiter` processor caps memory at 512 MiB, preventing runaway resource consumption. Lightweight Alpine-based Docker images reduce storage footprint. Impact: neutral to mildly positive through efficient resource use. |
| Social | Accessibility; digital divide; community benefit | The project is open-source and educational, lowering the barrier for students to learn observability engineering — a skill in high demand. All tooling used (OpenTelemetry, Jaeger, Prometheus, Grafana) is free and open-source, ensuring accessibility regardless of institutional budget. Impact: positive for engineering education equity. |
| Economic | Development cost; productivity; long-term viability | Zero licensing cost — all components are open-source. The observability patterns demonstrated directly reduce mean-time-to-resolution (MTTR) in production systems, translating to reduced downtime costs. Estimated development cost: ₹0 (software), developer time only. Impact: positive productivity and cost-reduction potential. |

### 7.2 UN Sustainable Development Goals (SDGs)

| SDG No. and Name | Project Feature / Activity Linked to SDG | Expected or Observed Contribution | Evidence / Indicator |
|---|---|---|---|
| SDG 9: Industry, Innovation and Infrastructure | Demonstrates resilient distributed infrastructure with automated failure detection and telemetry pipelines | Improves reliability of digital infrastructure by enabling rapid root-cause analysis; reduces MTTR | Jaeger error spans and Prometheus alert-ready metrics demonstrate fault detection capability |
| SDG 4: Quality Education | Complete, deployable reference implementation of observability engineering for Computer Engineering students | Provides hands-on learning of industry-standard tools (OpenTelemetry, Jaeger, Prometheus, Grafana) | Educational deployment with documented demo guide; suitable for college evaluation and self-study |

### 7.3 Sustainability Measures and Trade-offs

- **Memory limiter processor** in OTel Collector prevents unbounded memory growth during high-traffic simulation.
- **Batch span processor** reduces network overhead by grouping spans before export, lowering CPU usage compared to synchronous export.
- **Alpine-based Docker images** (Nginx Alpine, Python slim) reduce image size and attack surface.
- **In-memory storage** (no persistent database) reduces I/O resource consumption for demonstration purposes, at the trade-off of data loss on container restart.
- **Trade-off:** Running 10 containers simultaneously on a developer laptop consumes significant RAM (~2–3 GB). A production deployment would distribute services across nodes, reducing per-machine resource pressure.

### 7.4 Sustainability Indicator / Follow-up

- **Proposed future measure:** Total CPU-seconds consumed per 1000 order flow requests, measured via Prometheus `process_cpu_seconds_total` metric already exposed by each service.
- **Proposed future measure:** Memory usage per service over time, measurable via `process_resident_memory_bytes` Prometheus metric.
- These indicators are not formally measured in this micro project but the instrumentation to collect them is already in place.

---

## 8. Feasibility, Limitations and Risk Considerations

### 8.1 Feasibility

**Technical feasibility:** All components are mature open-source projects with active communities. OpenTelemetry SDK v1.29 is stable for traces and metrics. Docker Compose deployment is reproducible across macOS, Linux, and Windows (WSL2).

**Time and resource feasibility:** The project was completed within a single semester. Single-command deployment (`docker compose up --build -d`) makes evaluation straightforward.

**Operational feasibility:** The React dashboard and Grafana provide non-technical stakeholders with accessible visualisations. Swagger UI at `/docs` allows interactive API exploration without additional tooling.

| Item / Resource | Estimated Cost (₹) | Basis / Notes |
|---|---|---|
| Hardware / hosting / cloud | 0 | Runs on developer laptop; no cloud required |
| Software / API / dataset | 0 | All components are open-source (Apache 2.0 / MIT) |
| Other resources | 0 | No external APIs or paid services |
| Total estimated cost | 0 | One-time setup; no recurring costs |

### 8.2 Limitations

- **In-memory storage:** Order, payment, and notification data is lost on container restart. No persistent database is integrated.
- **Simplified authentication:** JWT secret is a static string; no token refresh or revocation mechanism.
- **Single-node deployment:** Docker Compose runs all services on one machine; does not demonstrate Kubernetes-level orchestration or horizontal scaling.
- **No log aggregation:** Logs are written to stdout only; no Loki/Promtail pipeline for log-trace correlation.
- **Sampling:** All spans are exported (100% sampling rate), which is not suitable for high-traffic production use.
- **Jaeger all-in-one:** Uses in-memory storage; not suitable for production trace retention.

### 8.3 Risks, Ethics, Privacy and Security

| Risk | Mitigation |
|---|---|
| JWT secret key exposure | `.env` file excluded from version control via `.gitignore`; `.env.example` provided with placeholder values |
| Simulated failure affecting real systems | Failure injection is scoped to Docker network only; no external services are called |
| Unauthorised access to monitoring UIs | Grafana requires admin credentials; all services run on localhost only |
| Dependency vulnerabilities | All dependencies pinned to specific versions in `requirements.txt`; no user PII is stored |
| Data privacy | No real user data is collected; all test data is synthetic |

---

## 9. Conclusion and Future Scope

### 9.1 Summary

TraceWatch successfully demonstrates a production-style observability platform for distributed microservices. Five FastAPI services modelling an e-commerce workflow are fully instrumented with OpenTelemetry SDK v1.29, with W3C traceparent context propagation across all HTTP boundaries. A central OpenTelemetry Collector pipeline routes traces to Jaeger and metrics to Prometheus, visualised in Grafana and a custom React dashboard. All 14 automated test cases passed. Interactive failure injection demonstrates root-cause analysis: toggling payment failure produces a red error span in Jaeger within seconds, pinpointing the exact service and line of failure. The project meets all stated objectives and aligns with SDG 9 (resilient infrastructure) and SDG 4 (quality education).

### 9.2 Future Scope

- **Persistent database layer:** Integrate PostgreSQL with `opentelemetry-instrumentation-sqlalchemy` to trace database queries as child spans.
- **Log aggregation:** Add Grafana Loki and Promtail to correlate structured logs with Trace IDs, completing the three pillars of observability.
- **Message broker:** Introduce Apache Kafka for asynchronous order events, demonstrating trace propagation through message headers.
- **Kubernetes deployment:** Migrate Docker Compose to Helm charts for Kubernetes, adding horizontal pod autoscaling and distributed Jaeger storage (Cassandra/Elasticsearch).
- **Adaptive sampling:** Implement tail-based sampling in the OTel Collector to reduce telemetry volume at high traffic while retaining all error traces.
- **Alerting:** Configure Prometheus Alertmanager rules for error rate thresholds and latency SLO breaches.
- **Service mesh:** Deploy Envoy/Istio for zero-code network-level telemetry alongside application-level instrumentation.

---

## References

[1] B. H. Sigelman et al., "Dapper, a Large-Scale Distributed Systems Tracing Infrastructure," Google Technical Report, 2010. [Online]. Available: https://research.google/pubs/pub36356/

[2] OpenTelemetry Authors, "OpenTelemetry Specification," CNCF, 2023. [Online]. Available: https://opentelemetry.io/docs/specs/otel/ (accessed June 2025).

[3] Jaeger Authors, "Jaeger: Open Source, End-to-End Distributed Tracing," CNCF, 2023. [Online]. Available: https://www.jaegertracing.io/docs/1.57/ (accessed June 2025).

[4] Prometheus Authors, "Prometheus Documentation," 2024. [Online]. Available: https://prometheus.io/docs/introduction/overview/ (accessed June 2025).

[5] B. Burns, B. Grant, D. Oppenheimer, E. Brewer, and J. Wilkes, "Borg, Omega, and Kubernetes," ACM Queue, vol. 14, 2016.

[6] B. Burns, "Designing Distributed Systems," O'Reilly Media, 2018.

[7] FastAPI Authors, "FastAPI Documentation," 2024. [Online]. Available: https://fastapi.tiangolo.com (accessed June 2025).

[8] W3C, "Trace Context – Level 1," W3C Recommendation, 2021. [Online]. Available: https://www.w3.org/TR/trace-context/ (accessed June 2025).

[9] Grafana Labs, "Grafana Documentation," 2024. [Online]. Available: https://grafana.com/docs/grafana/latest/ (accessed June 2025).

[10] Docker Inc., "Docker Compose Documentation," 2024. [Online]. Available: https://docs.docker.com/compose/ (accessed June 2025).

---

## Appendices

### Appendix A: Dashboard Access URLs

| Application | URL | Credentials |
|---|---|---|
| TraceWatch Web UI | http://localhost:3000 | None |
| Jaeger Tracing | http://localhost:16686 | None |
| Prometheus | http://localhost:9090 | None |
| Grafana | http://localhost:3001 | admin / tracewatch123 |
| API Gateway Swagger | http://localhost:8000/docs | None |

### Appendix B: Key Code Excerpts

**OTel Collector Configuration (`otel-collector/otel-collector-config.yaml`):**
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

### Appendix C: Deployment Instructions

```bash
# Clone repository
git clone https://github.com/<username>/SystemDesignProject.git
cd SystemDesignProject

# Configure environment
cp .env.example .env

# Build and start all 10 containers
docker compose up --build -d

# Verify all services are healthy
docker compose ps

# Run automated tests
pip install -r tests/requirements-test.txt
pytest tests/ -v
```

### Appendix D: Repository Information

- Source code: GitHub repository (URL to be added by team)
- No credentials, API keys, or secrets are committed to the repository
- `.env` file is excluded via `.gitignore`; `.env.example` provides configuration template
