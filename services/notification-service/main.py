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

def setup_telemetry():
    resource = Resource.create({
        "service.name": "notification-service",
        "service.version": "1.0.0",
        "deployment.environment": "production"
    })
    provider = TracerProvider(resource=resource)
    otlp_exporter = OTLPSpanExporter(endpoint=OTEL_ENDPOINT, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    trace.set_tracer_provider(provider)
    return trace.get_tracer("notification-service")

tracer = setup_telemetry()

NOTIF_REQUESTS = Counter('notification_requests_total', 'Total notification requests', ['type', 'status'])
NOTIF_FAILURES = Counter('notification_failures_total', 'Total notification failures', ['reason'])
NOTIF_DURATION = Histogram('notification_duration_seconds', 'Notification processing duration', ['type'])

notifications_db = []
_simulate_failure = False

class NotificationRequest(BaseModel):
    user_id: str
    message: str
    type: Optional[str] = "email"
    order_id: Optional[str] = None
    simulate_failure: Optional[bool] = False

class FailureSimulation(BaseModel):
    enabled: bool

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Notification Service starting up...")
    yield
    logger.info("Notification Service shutting down...")

app = FastAPI(title="TraceWatch Notification Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
async def health():
    return {
        "status": "healthy" if not _simulate_failure else "degraded",
        "service": "notification-service",
        "timestamp": time.time(),
        "failure_simulation": _simulate_failure,
        "notifications_sent": len(notifications_db)
    }

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/simulate/failure")
async def set_failure_simulation(config: FailureSimulation):
    global _simulate_failure
    _simulate_failure = config.enabled
    return {"failure_simulation": _simulate_failure}

@app.post("/notifications/send")
async def send_notification(request: NotificationRequest):
    start = time.time()
    with tracer.start_as_current_span("notification.send") as span:
        notif_id = f"notif-{str(uuid.uuid4())[:8]}"
        span.set_attribute("notification.id", notif_id)
        span.set_attribute("notification.user_id", request.user_id)
        span.set_attribute("notification.type", request.type or "email")
        if request.order_id:
            span.set_attribute("notification.order_id", request.order_id)
        
        try:
            should_fail = request.simulate_failure or _simulate_failure
            
            if should_fail:
                span.set_status(trace.StatusCode.ERROR, "Notification delivery failed")
                NOTIF_FAILURES.labels(reason="simulated_failure").inc()
                NOTIF_REQUESTS.labels(type=request.type or "email", status="failed").inc()
                notification = {
                    "notification_id": notif_id,
                    "user_id": request.user_id,
                    "message": request.message,
                    "type": request.type,
                    "status": "failed",
                    "error": "Notification delivery failed (simulated)",
                    "timestamp": time.time()
                }
                notifications_db.append(notification)
                raise HTTPException(status_code=503, detail="Notification service failure (simulated)")
            
            # Simulate sending delay
            time.sleep(random.uniform(0.01, 0.1))
            
            notification = {
                "notification_id": notif_id,
                "user_id": request.user_id,
                "message": request.message,
                "type": request.type,
                "order_id": request.order_id,
                "status": "sent",
                "timestamp": time.time()
            }
            notifications_db.append(notification)
            
            NOTIF_REQUESTS.labels(type=request.type or "email", status="success").inc()
            NOTIF_DURATION.labels(type=request.type or "email").observe(time.time() - start)
            span.set_attribute("notification.status", "sent")
            logger.info(f"Notification sent: {notif_id} to user {request.user_id}")
            return notification
            
        except HTTPException:
            NOTIF_DURATION.labels(type=request.type or "email").observe(time.time() - start)
            raise
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/notifications")
async def list_notifications():
    return notifications_db[-50:]  # Return last 50

FastAPIInstrumentor.instrument_app(app, tracer_provider=trace.get_tracer_provider())
