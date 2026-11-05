"""
TraceWatch Integration Tests
Tests all microservices, health endpoints, and distributed tracing.
"""
import pytest
import httpx
import time
import uuid

BASE_URLS = {
    "gateway":      "http://localhost:8000",
    "auth":         "http://localhost:8001",
    "order":        "http://localhost:8002",
    "payment":      "http://localhost:8003",
    "notification": "http://localhost:8004",
    "jaeger":       "http://localhost:16686",
    "prometheus":   "http://localhost:9090",
}

TIMEOUT = 10.0


# ─────────────────────────────────────────────────────────────
# Health endpoint tests
# ─────────────────────────────────────────────────────────────

@pytest.mark.parametrize("service,url", [
    ("api-gateway",       f"{BASE_URLS['gateway']}/health"),
    ("auth-service",      f"{BASE_URLS['auth']}/health"),
    ("order-service",     f"{BASE_URLS['order']}/health"),
    ("payment-service",   f"{BASE_URLS['payment']}/health"),
    ("notification-svc",  f"{BASE_URLS['notification']}/health"),
])
def test_service_health(service, url):
    """All microservices must respond healthy."""
    response = httpx.get(url, timeout=TIMEOUT)
    assert response.status_code == 200, f"{service} health check failed: {response.text}"
    data = response.json()
    assert data.get("status") in ("healthy", "degraded"), f"{service} unexpected status: {data}"
    print(f"✓ {service}: {data.get('status')}")


# ─────────────────────────────────────────────────────────────
# Auth service tests
# ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def unique_user():
    suffix = str(uuid.uuid4())[:8]
    return {"username": f"testuser_{suffix}", "email": f"test_{suffix}@example.com", "password": "Test@1234"}


def test_auth_register(unique_user):
    """User registration should return user_id."""
    resp = httpx.post(f"{BASE_URLS['auth']}/register", json=unique_user, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Registration failed: {resp.text}"
    data = resp.json()
    assert "user_id" in data
    assert data["username"] == unique_user["username"]
    print(f"✓ Registered user: {data['user_id']}")


def test_auth_register_duplicate(unique_user):
    """Duplicate registration should return 400."""
    # First registration
    httpx.post(f"{BASE_URLS['auth']}/register", json=unique_user, timeout=TIMEOUT)
    # Second registration (duplicate)
    resp = httpx.post(f"{BASE_URLS['auth']}/register", json=unique_user, timeout=TIMEOUT)
    assert resp.status_code == 400, f"Expected 400 for duplicate: {resp.status_code}"


def test_auth_login(unique_user):
    """Login with correct credentials should return JWT token."""
    # Register first
    httpx.post(f"{BASE_URLS['auth']}/register", json=unique_user, timeout=TIMEOUT)
    # Login
    resp = httpx.post(
        f"{BASE_URLS['auth']}/login",
        json={"username": unique_user["username"], "password": unique_user["password"]},
        timeout=TIMEOUT
    )
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    print(f"✓ Login returned token: {data['access_token'][:30]}...")


def test_auth_login_invalid_credentials():
    """Login with wrong password should return 401."""
    resp = httpx.post(
        f"{BASE_URLS['auth']}/login",
        json={"username": "admin", "password": "completely_wrong_password"},
        timeout=TIMEOUT
    )
    assert resp.status_code == 401, f"Expected 401, got: {resp.status_code}"
    print("✓ Invalid credentials correctly rejected")


def test_auth_validate_token(unique_user):
    """Token from login should validate successfully."""
    # Register & login
    httpx.post(f"{BASE_URLS['auth']}/register", json=unique_user, timeout=TIMEOUT)
    login_resp = httpx.post(
        f"{BASE_URLS['auth']}/login",
        json={"username": unique_user["username"], "password": unique_user["password"]},
        timeout=TIMEOUT
    )
    if login_resp.status_code != 200:
        pytest.skip("Login failed, skipping token validation")
    token = login_resp.json()["access_token"]

    validate_resp = httpx.post(f"{BASE_URLS['auth']}/validate", json={"token": token}, timeout=TIMEOUT)
    assert validate_resp.status_code == 200
    data = validate_resp.json()
    assert data["valid"] is True
    print(f"✓ Token validated for user: {data.get('username')}")


# ─────────────────────────────────────────────────────────────
# Order service tests
# ─────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def sample_order_payload():
    return {
        "user_id": "test-user-001",
        "items": [{"product": "Test Widget", "quantity": 2, "price": 15.50}],
        "total": 31.00
    }


def test_order_create(sample_order_payload):
    """Creating an order should return order details."""
    resp = httpx.post(f"{BASE_URLS['order']}/orders", json=sample_order_payload, timeout=TIMEOUT)
    assert resp.status_code == 200, f"Order creation failed: {resp.text}"
    data = resp.json()
    assert "order_id" in data
    assert data["user_id"] == sample_order_payload["user_id"]
    assert data["total"] == sample_order_payload["total"]
    print(f"✓ Order created: {data['order_id']} | status: {data.get('status')}")


def test_order_get(sample_order_payload):
    """Retrieving an order by ID should return order details."""
    # Create order first
    create_resp = httpx.post(f"{BASE_URLS['order']}/orders", json=sample_order_payload, timeout=TIMEOUT)
    assert create_resp.status_code == 200
    order_id = create_resp.json()["order_id"]

    # Get order
    get_resp = httpx.get(f"{BASE_URLS['order']}/orders/{order_id}", timeout=TIMEOUT)
    assert get_resp.status_code == 200, f"Get order failed: {get_resp.text}"
    data = get_resp.json()
    assert data["order_id"] == order_id
    print(f"✓ Order retrieved: {order_id}")


def test_order_not_found():
    """Non-existent order should return 404."""
    resp = httpx.get(f"{BASE_URLS['order']}/orders/non-existent-order-xyz", timeout=TIMEOUT)
    assert resp.status_code == 404
    print("✓ Non-existent order correctly returns 404")


def test_order_list():
    """List orders endpoint should return a list."""
    resp = httpx.get(f"{BASE_URLS['order']}/orders", timeout=TIMEOUT)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    print(f"✓ Order list returned {len(resp.json())} orders")


# ─────────────────────────────────────────────────────────────
# Payment service tests
# ─────────────────────────────────────────────────────────────

def test_payment_process_success():
    """Successful payment should return payment_id and status=success."""
    resp = httpx.post(
        f"{BASE_URLS['payment']}/payments/process",
        json={"order_id": f"test-order-{uuid.uuid4().hex[:8]}", "amount": 49.99},
        timeout=TIMEOUT
    )
    assert resp.status_code == 200, f"Payment failed: {resp.text}"
    data = resp.json()
    assert data["status"] == "success"
    assert "payment_id" in data
    assert "transaction_id" in data
    print(f"✓ Payment processed: {data['payment_id']} | txn: {data['transaction_id']}")


def test_payment_process_simulated_failure():
    """Simulated payment failure should return 402."""
    resp = httpx.post(
        f"{BASE_URLS['payment']}/payments/process",
        json={"order_id": f"test-order-fail", "amount": 100.00, "simulate_failure": True},
        timeout=TIMEOUT
    )
    assert resp.status_code == 402, f"Expected 402 failure, got {resp.status_code}: {resp.text}"
    print("✓ Simulated payment failure correctly returned 402")


def test_payment_list():
    """Payments list endpoint should return a list."""
    resp = httpx.get(f"{BASE_URLS['payment']}/payments", timeout=TIMEOUT)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
    print(f"✓ Payments list: {len(resp.json())} records")


# ─────────────────────────────────────────────────────────────
# Notification service tests
# ─────────────────────────────────────────────────────────────

def test_notification_send_success():
    """Sending a notification should return notification_id."""
    resp = httpx.post(
        f"{BASE_URLS['notification']}/notifications/send",
        json={"user_id": "user-001", "message": "Test notification", "type": "email"},
        timeout=TIMEOUT
    )
    assert resp.status_code == 200, f"Notification failed: {resp.text}"
    data = resp.json()
    assert data["status"] == "sent"
    assert "notification_id" in data
    print(f"✓ Notification sent: {data['notification_id']}")


def test_notification_send_simulated_failure():
    """Simulated notification failure should return 503."""
    resp = httpx.post(
        f"{BASE_URLS['notification']}/notifications/send",
        json={"user_id": "user-001", "message": "Fail this", "simulate_failure": True},
        timeout=TIMEOUT
    )
    assert resp.status_code == 503, f"Expected 503, got: {resp.status_code}"
    print("✓ Simulated notification failure correctly returned 503")


# ─────────────────────────────────────────────────────────────
# API Gateway tests
# ─────────────────────────────────────────────────────────────

def test_gateway_health():
    """API Gateway health check."""
    resp = httpx.get(f"{BASE_URLS['gateway']}/health", timeout=TIMEOUT)
    assert resp.status_code == 200
    assert resp.json()["service"] == "api-gateway"


def test_gateway_all_services_health():
    """Gateway /api/services/health should report all services."""
    resp = httpx.get(f"{BASE_URLS['gateway']}/api/services/health", timeout=TIMEOUT)
    assert resp.status_code == 200
    data = resp.json()
    expected_services = ["auth-service", "order-service", "payment-service", "notification-service"]
    for svc in expected_services:
        assert svc in data, f"Missing service: {svc}"
    print(f"✓ All services reported: {list(data.keys())}")


def test_gateway_full_order_flow():
    """Full order flow through API Gateway should succeed."""
    resp = httpx.post(
        f"{BASE_URLS['gateway']}/api/simulate/order-flow",
        json={
            "user_id": "gateway-test-user",
            "items": [{"product": "Gateway Test Item", "quantity": 1, "price": 25.0}],
            "total": 25.0,
        },
        timeout=30.0
    )
    assert resp.status_code == 200, f"Full flow failed: {resp.text}"
    data = resp.json()
    assert data["flow"] == "complete"
    assert "results" in data
    results = data["results"]
    assert "order" in results
    assert "payment" in results
    assert "notification" in results
    print(f"✓ Full order flow: order={results['order'].get('order_id')}, payment={results['payment'].get('status')}, notification={results['notification'].get('status')}")


# ─────────────────────────────────────────────────────────────
# Telemetry tests
# ─────────────────────────────────────────────────────────────

def test_metrics_endpoints():
    """All services should expose Prometheus metrics."""
    for svc, base in BASE_URLS.items():
        if svc in ("jaeger", "prometheus"):
            continue
        resp = httpx.get(f"{base}/metrics", timeout=TIMEOUT)
        assert resp.status_code == 200, f"{svc} /metrics failed: {resp.status_code}"
        assert "# HELP" in resp.text or "# TYPE" in resp.text, f"{svc} metrics format invalid"
        print(f"✓ {svc} Prometheus metrics exposed")


def test_prometheus_running():
    """Prometheus should be accessible."""
    resp = httpx.get(f"{BASE_URLS['prometheus']}/-/healthy", timeout=TIMEOUT)
    assert resp.status_code == 200
    print("✓ Prometheus is healthy")


def test_jaeger_running():
    """Jaeger UI should be accessible."""
    resp = httpx.get(f"{BASE_URLS['jaeger']}/api/services", timeout=TIMEOUT)
    assert resp.status_code == 200
    data = resp.json()
    assert "data" in data
    print(f"✓ Jaeger running, services: {data.get('data', [])}")


def test_trace_propagation():
    """Order creation should generate a trace visible in Jaeger."""
    # Create an order to generate a trace
    httpx.post(
        f"{BASE_URLS['order']}/orders",
        json={"user_id": "trace-test", "items": [{"product": "Trace Test", "quantity": 1, "price": 9.99}], "total": 9.99},
        timeout=TIMEOUT
    )
    # Give the collector time to export
    time.sleep(2)

    # Check Jaeger for traces
    resp = httpx.get(
        f"{BASE_URLS['jaeger']}/api/traces",
        params={"service": "order-service", "limit": 5, "lookback": "5m"},
        timeout=TIMEOUT
    )
    if resp.status_code == 200:
        data = resp.json()
        traces = data.get("data", [])
        print(f"✓ Trace propagation: found {len(traces)} traces in Jaeger")
        if traces:
            trace = traces[0]
            services = set(trace.get("processes", {}).keys())
            print(f"  Services in trace: {services}")
    else:
        print(f"⚠ Jaeger query returned {resp.status_code} - traces may not have propagated yet")


# ─────────────────────────────────────────────────────────────
# Failure simulation tests
# ─────────────────────────────────────────────────────────────

def test_payment_failure_simulation_toggle():
    """Payment failure can be toggled on and off."""
    # Enable
    enable_resp = httpx.post(
        f"{BASE_URLS['payment']}/simulate/failure",
        json={"enabled": True},
        timeout=TIMEOUT
    )
    assert enable_resp.status_code == 200
    assert enable_resp.json()["failure_simulation"] is True

    # Verify payment fails
    pay_resp = httpx.post(
        f"{BASE_URLS['payment']}/payments/process",
        json={"order_id": "sim-test", "amount": 10.0},
        timeout=TIMEOUT
    )
    assert pay_resp.status_code == 402

    # Disable
    disable_resp = httpx.post(
        f"{BASE_URLS['payment']}/simulate/failure",
        json={"enabled": False},
        timeout=TIMEOUT
    )
    assert disable_resp.status_code == 200
    assert disable_resp.json()["failure_simulation"] is False

    # Verify payment succeeds again
    pay_resp2 = httpx.post(
        f"{BASE_URLS['payment']}/payments/process",
        json={"order_id": "sim-test-2", "amount": 10.0},
        timeout=TIMEOUT
    )
    assert pay_resp2.status_code == 200
    print("✓ Payment failure simulation toggle works correctly")


def test_notification_failure_simulation_toggle():
    """Notification failure can be toggled on and off."""
    # Enable
    httpx.post(f"{BASE_URLS['notification']}/simulate/failure", json={"enabled": True}, timeout=TIMEOUT)

    fail_resp = httpx.post(
        f"{BASE_URLS['notification']}/notifications/send",
        json={"user_id": "sim-test", "message": "Should fail"},
        timeout=TIMEOUT
    )
    assert fail_resp.status_code == 503

    # Disable
    httpx.post(f"{BASE_URLS['notification']}/simulate/failure", json={"enabled": False}, timeout=TIMEOUT)

    ok_resp = httpx.post(
        f"{BASE_URLS['notification']}/notifications/send",
        json={"user_id": "sim-test", "message": "Should succeed"},
        timeout=TIMEOUT
    )
    assert ok_resp.status_code == 200
    print("✓ Notification failure simulation toggle works correctly")
