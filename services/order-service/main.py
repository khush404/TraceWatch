import os
import time
import uuid
import logging
import random
from contextlib import asynccontextmanager
from typing import List, Optional

import httpx
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
from opentelemetry.propagate import inject, extract

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PAYMENT_SERVICE_URL = os.getenv("PAYMENT_SERVICE_URL", "http://payment-service:8003")
NOTIFICATION_SERVICE_URL = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8004")
OTEL_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")

def setup_telemetry():
    resource = Resource.create({
        "service.name": "order-service",
        "service.version": "1.0.0",
        "deployment.environment": "production"
    })
    provider = TracerProvider(resource=resource)
    otlp_exporter = OTLPSpanExporter(endpoint=OTEL_ENDPOINT, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    trace.set_tracer_provider(provider)
    return trace.get_tracer("order-service")

tracer = setup_telemetry()

ORDER_REQUESTS = Counter('order_requests_total', 'Total order requests', ['operation', 'status'])
ORDER_DURATION = Histogram('order_duration_seconds', 'Order processing duration', ['operation'])
ORDER_VALUE = Histogram('order_value_dollars', 'Order value in dollars', buckets=[10, 25, 50, 100, 250, 500, 1000])

# In-memory order store
orders_db = {}

class OrderItem(BaseModel):
    product: str
    quantity: int
    price: float

class CreateOrderRequest(BaseModel):
    user_id: str
    items: List[OrderItem]
    total: float
    simulate_failure: Optional[bool] = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Order Service starting up...")
    # Seed some sample orders
    for i in range(3):
        oid = f"order-seed-{i+1:03d}"
        orders_db[oid] = {
            "order_id": oid,
            "user_id": "user-001",
            "items": [{"product": f"Sample Product {i+1}", "quantity": 1, "price": 29.99}],
            "total": 29.99,
            "status": "completed",
            "created_at": time.time() - (i * 3600)
        }
    yield
    logger.info("Order Service shutting down...")

app = FastAPI(title="TraceWatch Order Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "order-service", "timestamp": time.time(), "orders_count": len(orders_db)}

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/orders")
async def create_order(request: CreateOrderRequest):
    start = time.time()
    with tracer.start_as_current_span("order.create") as span:
        order_id = f"order-{str(uuid.uuid4())[:8]}"
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.user_id", request.user_id)
        span.set_attribute("order.total", request.total)
        span.set_attribute("order.items_count", len(request.items))
        
        try:
            if request.simulate_failure:
                span.set_status(trace.StatusCode.ERROR, "Simulated order failure")
                ORDER_REQUESTS.labels(operation="create", status="failed").inc()
                raise HTTPException(status_code=500, detail="Simulated order service failure")
            
            # Store order
            order = {
                "order_id": order_id,
                "user_id": request.user_id,
                "items": [item.model_dump() for item in request.items],
                "total": request.total,
                "status": "pending",
                "created_at": time.time()
            }
            orders_db[order_id] = order
            
            # Call payment service with trace propagation
            headers = {}
            inject(headers)
            
            with tracer.start_as_current_span("order.call_payment") as pay_span:
                pay_span.set_attribute("payment.order_id", order_id)
                pay_span.set_attribute("payment.amount", request.total)
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        pay_resp = await client.post(
                            f"{PAYMENT_SERVICE_URL}/payments/process",
                            json={"order_id": order_id, "amount": request.total, "simulate_failure": False},
                            headers=headers
                        )
                        payment_data = pay_resp.json()
                        pay_span.set_attribute("payment.status", payment_data.get("status", "unknown"))
                        if pay_resp.status_code == 200:
                            order["status"] = "paid"
                            order["payment_id"] = payment_data.get("payment_id")
                        else:
                            order["status"] = "payment_failed"
                except Exception as e:
                    pay_span.record_exception(e)
                    order["status"] = "payment_error"
                    logger.error(f"Payment failed for order {order_id}: {e}")
            
            # Call notification service
            with tracer.start_as_current_span("order.call_notification") as notif_span:
                notif_span.set_attribute("notification.order_id", order_id)
                try:
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        await client.post(
                            f"{NOTIFICATION_SERVICE_URL}/notifications/send",
                            json={
                                "user_id": request.user_id,
                                "message": f"Order {order_id} has been placed. Status: {order['status']}",
                                "type": "email",
                                "order_id": order_id
                            },
                            headers=headers
                        )
                        notif_span.set_attribute("notification.sent", True)
                except Exception as e:
                    notif_span.record_exception(e)
                    notif_span.set_attribute("notification.sent", False)
                    logger.warning(f"Notification failed for order {order_id}: {e}")
            
            orders_db[order_id] = order
            ORDER_REQUESTS.labels(operation="create", status="success").inc()
            ORDER_DURATION.labels(operation="create").observe(time.time() - start)
            ORDER_VALUE.observe(request.total)
            logger.info(f"Order created: {order_id}")
            return order
            
        except HTTPException:
            raise
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            ORDER_REQUESTS.labels(operation="create", status="error").inc()
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    with tracer.start_as_current_span("order.get") as span:
        span.set_attribute("order.id", order_id)
        order = orders_db.get(order_id)
        if not order:
            span.set_status(trace.StatusCode.ERROR, "Order not found")
            ORDER_REQUESTS.labels(operation="get", status="not_found").inc()
            raise HTTPException(status_code=404, detail=f"Order {order_id} not found")
        ORDER_REQUESTS.labels(operation="get", status="success").inc()
        return order

@app.get("/orders")
async def list_orders():
    with tracer.start_as_current_span("order.list") as span:
        span.set_attribute("orders.count", len(orders_db))
        return list(orders_db.values())

FastAPIInstrumentor.instrument_app(app, tracer_provider=trace.get_tracer_provider())
