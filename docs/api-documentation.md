# TraceWatch – API Documentation

All services provide interactive OpenAPI documentation (Swagger UI) at `/docs` when running.

---

## 1. API Gateway (`http://localhost:8000`)

### Health Checks
- **`GET /health`**
  - Response:
    ```json
    { "status": "healthy", "service": "api-gateway", "timestamp": 1730830000.0 }
    ```
- **`GET /api/services/health`**
  - Response:
    ```json
    {
      "auth-service": { "status": "healthy", "code": 200 },
      "order-service": { "status": "healthy", "code": 200 },
      "payment-service": { "status": "healthy", "code": 200 },
      "notification-service": { "status": "healthy", "code": 200 }
    }
    ```

### Authentication Endpoints
- **`POST /api/auth/register`**
  - Request:
    ```json
    {
      "username": "johndoe",
      "email": "john@example.com",
      "password": "SecurePassword123"
    }
    ```
  - Response (200 OK):
    ```json
    {
      "message": "User registered successfully",
      "user_id": "user-a1b2c3d4",
      "username": "johndoe"
    }
    ```

- **`POST /api/auth/login`**
  - Request:
    ```json
    {
      "username": "johndoe",
      "password": "SecurePassword123"
    }
    ```
  - Response (200 OK):
    ```json
    {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer",
      "user_id": "user-a1b2c3d4"
    }
    ```

### Order Endpoints
- **`POST /api/orders`**
  - Request:
    ```json
    {
      "user_id": "user-a1b2c3d4",
      "items": [
        { "product": "Mechanical Keyboard", "quantity": 1, "price": 89.99 },
        { "product": "USB Cable", "quantity": 2, "price": 5.00 }
      ],
      "total": 99.99
    }
    ```
  - Response (200 OK):
    ```json
    {
      "order_id": "order-7f3a92b1",
      "user_id": "user-a1b2c3d4",
      "items": [...],
      "total": 99.99,
      "status": "paid",
      "payment_id": "pay-3d5e1f2a"
    }
    ```

- **`GET /api/orders/{order_id}`**
  - Response (200 OK): Returns order object.
  - Response (404 Not Found): If `order_id` does not exist.

### Payment Endpoints
- **`POST /api/payments/process`**
  - Request:
    ```json
    {
      "order_id": "order-7f3a92b1",
      "amount": 99.99,
      "simulate_failure": false,
      "delay_seconds": 0.0
    }
    ```
  - Response (200 OK):
    ```json
    {
      "payment_id": "pay-3d5e1f2a",
      "order_id": "order-7f3a92b1",
      "amount": 99.99,
      "status": "success",
      "transaction_id": "txn-9a2b3c4d5e6f",
      "timestamp": 1730830000.0
    }
    ```

### Notification Endpoints
- **`POST /api/notifications/send`**
  - Request:
    ```json
    {
      "user_id": "user-a1b2c3d4",
      "message": "Your order has shipped",
      "type": "email",
      "order_id": "order-7f3a92b1"
    }
    ```
  - Response (200 OK):
    ```json
    {
      "notification_id": "notif-8c4d2e1f",
      "user_id": "user-a1b2c3d4",
      "status": "sent",
      "timestamp": 1730830000.0
    }
    ```

### Composite Simulation Endpoint
- **`POST /api/simulate/order-flow`**
  - Orchestrates a complete customer journey through Gateway -> Order -> Payment -> Notification.
  - Parameters:
    ```json
    {
      "user_id": "sim-user",
      "items": [{ "product": "Test Item", "quantity": 1, "price": 29.99 }],
      "total": 29.99,
      "simulate_payment_failure": false,
      "simulate_notification_failure": false
    }
    ```

---

## 2. Failure Simulation Endpoints

- **Payment Failure**: `POST http://localhost:8003/simulate/failure`
  ```json
  { "enabled": true, "delay_seconds": 2.0 }
  ```
- **Notification Failure**: `POST http://localhost:8004/simulate/failure`
  ```json
  { "enabled": true }
  ```
