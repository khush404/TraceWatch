# services/auth-service/main.py
import os
import time
import uuid
import logging
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from jose import jwt, JWTError
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

SECRET_KEY = os.getenv("SECRET_KEY", "tracewatch-secret-key-2024-secure")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
OTEL_ENDPOINT = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")

# Setup OpenTelemetry
def setup_telemetry():
    resource = Resource.create({
        "service.name": "auth-service",
        "service.version": "1.0.0",
        "deployment.environment": "production"
    })
    provider = TracerProvider(resource=resource)
    otlp_exporter = OTLPSpanExporter(endpoint=OTEL_ENDPOINT, insecure=True)
    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
    trace.set_tracer_provider(provider)
    return trace.get_tracer("auth-service")

tracer = setup_telemetry()

# Prometheus metrics
AUTH_REQUESTS = Counter('auth_requests_total', 'Total auth requests', ['endpoint', 'status'])
AUTH_FAILURES = Counter('auth_failures_total', 'Total auth failures', ['reason'])
AUTH_DURATION = Histogram('auth_duration_seconds', 'Auth request duration', ['endpoint'])

import hashlib

def get_password_hash(password: str) -> str:
    salt = "tracewatch_salt_2024"
    return hashlib.sha256((password + salt).encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return get_password_hash(plain_password) == hashed_password

# In-memory user store
users_db = {}

class UserRegister(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class TokenValidate(BaseModel):
    token: str

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Auth Service starting up...")
    # Seed a default user
    hashed = get_password_hash("password123")
    users_db["admin"] = {"user_id": "user-001", "username": "admin", "email": "admin@tracewatch.io", "hashed_password": hashed}
    yield
    logger.info("Auth Service shutting down...")

app = FastAPI(title="TraceWatch Auth Service", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "auth-service", "timestamp": time.time(), "users_count": len(users_db)}

@app.get("/metrics")
async def metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.post("/register")
async def register(user: UserRegister):
    start = time.time()
    with tracer.start_as_current_span("auth.register") as span:
        span.set_attribute("user.username", user.username)
        span.set_attribute("user.email", user.email)
        try:
            if user.username in users_db:
                AUTH_FAILURES.labels(reason="username_exists").inc()
                AUTH_REQUESTS.labels(endpoint="register", status="failed").inc()
                raise HTTPException(status_code=400, detail="Username already registered")
            user_id = f"user-{str(uuid.uuid4())[:8]}"
            hashed_password = get_password_hash(user.password)
            users_db[user.username] = {
                "user_id": user_id,
                "username": user.username,
                "email": user.email,
                "hashed_password": hashed_password,
                "created_at": datetime.utcnow().isoformat()
            }
            span.set_attribute("user.id", user_id)
            AUTH_REQUESTS.labels(endpoint="register", status="success").inc()
            AUTH_DURATION.labels(endpoint="register").observe(time.time() - start)
            logger.info(f"User registered: {user.username}")
            return {"message": "User registered successfully", "user_id": user_id, "username": user.username}
        except HTTPException:
            raise
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            AUTH_FAILURES.labels(reason="internal_error").inc()
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/login")
async def login(credentials: UserLogin):
    start = time.time()
    with tracer.start_as_current_span("auth.login") as span:
        span.set_attribute("user.username", credentials.username)
        try:
            user = users_db.get(credentials.username)
            if not user or not verify_password(credentials.password, user["hashed_password"]):
                AUTH_FAILURES.labels(reason="invalid_credentials").inc()
                AUTH_REQUESTS.labels(endpoint="login", status="failed").inc()
                span.set_status(trace.StatusCode.ERROR, "Invalid credentials")
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            token = create_access_token({"sub": user["username"], "user_id": user["user_id"]})
            span.set_attribute("user.id", user["user_id"])
            AUTH_REQUESTS.labels(endpoint="login", status="success").inc()
            AUTH_DURATION.labels(endpoint="login").observe(time.time() - start)
            logger.info(f"User logged in: {credentials.username}")
            return {"access_token": token, "token_type": "bearer", "user_id": user["user_id"]}
        except HTTPException:
            raise
        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.StatusCode.ERROR, str(e))
            raise HTTPException(status_code=500, detail=str(e))

@app.post("/validate")
async def validate_token(data: TokenValidate):
    with tracer.start_as_current_span("auth.validate") as span:
        try:
            payload = jwt.decode(data.token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            user_id = payload.get("user_id")
            span.set_attribute("user.username", username or "unknown")
            span.set_attribute("user.id", user_id or "unknown")
            AUTH_REQUESTS.labels(endpoint="validate", status="success").inc()
            return {"valid": True, "username": username, "user_id": user_id}
        except JWTError as e:
            span.set_status(trace.StatusCode.ERROR, str(e))
            AUTH_FAILURES.labels(reason="invalid_token").inc()
            AUTH_REQUESTS.labels(endpoint="validate", status="failed").inc()
            return {"valid": False, "error": str(e)}

FastAPIInstrumentor.instrument_app(app, tracer_provider=trace.get_tracer_provider())
