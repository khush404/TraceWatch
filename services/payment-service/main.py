import os
import time
import uuid
import logging
import random
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OTEL_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")
FAILURE_RATE = float(os.getenv("PAYMENT_FAILURE_RATE", "0.0"))

def setup_telemetry():
    resource = Resource.create({
        "service.name": "payment-service",
        "service.version": "1.0.0",
        "deployment.environment": "production"
    })
    provider = TracerProvider(resource=resource)
    otlp_exporter = OTLPSpanExporter(endpoint=OTEL_ENDPOINT, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    trace.set_tracer_provider(provider)
    return trace.get_tracer("payment-service")

tracer = setup_telemetry()

PAYMENT_REQUESTS = Counter('payment_requests_total', 'Total payment requests', ['status'])
PAYMENT_FAILURES = Counter('payment_failures_total', 'Total payment failures', ['reason'])
PAYMENT_DURATION = Histogram('payment_duration_seconds', 'Payment processing duration',
                              buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0])
PAYMENT_AMOUNT = Histogram('payment_amount_dollars', 'Payment amounts', buckets=[10, 25, 50, 100, 250, 500])

payments_db = {}
_simulate_failure = False
_simulate_delay = 0.0

class PaymentRequest(BaseModel):
    order_id: str
    amount: float
    simulate_failure: Optional[bool] = False
    delay_seconds: Optional[float] = 0.0

class FailureSimulation(BaseModel):
    enabled: bool
    delay_seconds: Optional[float] = 0.0

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Payment Service starting up...")
    yield
    logger.info("Payment Service shutting down...")

app = FastAPI(title="TraceWatch Payment Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
async def health():
    return {
        "status": "healthy" if not _simulate_failure else "degraded",
        "service": "payment-service",
        "timestamp": time.time(),
        "failure_simulation": _simulate_failure,
        "simulated_delay": _simulate_delay,
        "total_payments": len(payments_db)
    }

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/simulate/failure")
async def set_failure_simulation(config: FailureSimulation):
    global _simulate_failure, _simulate_delay
    _simulate_failure = config.enabled
    _simulate_delay = config.delay_seconds or 0.0
    return {"failure_simulation": _simulate_failure, "delay_seconds": _simulate_delay}

@app.post("/payments/process")
async def process_payment(request: PaymentRequest):
    start = time.time()
    with tracer.start_as_current_span("payment.process") as span:
        payment_id = f"pay-{str(uuid.uuid4())[:8]}"
        span.set_attribute("payment.id", payment_id)
        span.set_attribute("payment.order_id", request.order_id)
        span.set_attribute("payment.amount", request.amount)
        
        try:
            # Simulate artificial delay
            delay = request.delay_seconds or _simulate_delay
            if delay > 0:
                span.set_attribute("payment.artificial_delay", delay)
                time.sleep(delay)
            
            # Check for failure simulation
            should_fail = request.simulate_failure or _simulate_failure or (random.random() < FAILURE_RATE)
            
            if should_fail:
                span.set_status(trace.StatusCode.ERROR, "Payment processing failed")
                span.set_attribute("payment.failed", True)
                PAYMENT_FAILURES.labels(reason="simulated_failure" if (request.simulate_failure or _simulate_failure) else "random_failure").inc()
                PAYMENT_REQUESTS.labels(status="failed").inc()
                payment = {
                    "payment_id": payment_id,
                    "order_id": request.order_id,
                    "amount": request.amount,
                    "status": "failed",
                    "error": "Payment processing failed",
                    "timestamp": time.time()
                }
                payments_db[payment_id] = payment
                raise HTTPException(status_code=402, detail="Payment processing failed")
            
            # Simulate processing time
            processing_time = random.uniform(0.05, 0.3)
            time.sleep(processing_time)
            span.set_attribute("payment.processing_time", processing_time)
            
            payment = {
                "payment_id": payment_id,
                "order_id": request.order_id,
                "amount": request.amount,
                "status": "success",
                "transaction_id": f"txn-{str(uuid.uuid4())[:12]}",
                "timestamp": time.time()
            }
            payments_db[payment_id] = payment
            
            duration = time.time() - start
            PAYMENT_REQUESTS.labels(status="success").inc()
            PAYMENT_DURATION.observe(duration)
            PAYMENT_AMOUNT.observe(request.amount)
            span.set_attribute("payment.status", "success")
            span.set_attribute("payment.transaction_id", payment["transaction_id"])
            logger.info(f"Payment processed: {payment_id} for order {request.order_id}")
            return payment
            
        except HTTPException:
            PAYMENT_DURATION.observe(time.time() - start)
            raise
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            PAYMENT_FAILURES.labels(reason="internal_error").inc()
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/payments/{payment_id}")
async def get_payment(payment_id: str):
    with tracer.start_as_current_span("payment.get") as span:
        span.set_attribute("payment.id", payment_id)
        payment = payments_db.get(payment_id)
        if not payment:
            raise HTTPException(status_code=404, detail=f"Payment {payment_id} not found")
        return payment

@app.get("/payments")
async def list_payments():
    return list(payments_db.values())

FastAPIInstrumentor.instrument_app(app, tracer_provider=trace.get_tracer_provider())
