# Card Authorization Service

A TypeScript/Node.js card authorization service that processes auth requests, checks wallet balances, and maintains a double-entry ledger.

## Quick Start

```bash
# Start the entire stack
docker compose up

# The service will be available at http://localhost:3000
```

## API Endpoints

### POST /auth

Processes card authorization requests.

**Request:**

```json
{
	"idempotency_key": "abc-123",
	"card_pan_token": "TEST_TOKEN",
	"amount_kobo": 70000,
	"currency": "NGN",
	"wallet_balance_kobo": 120000
}
```

**Response (approved):**

```json
{
	"success": true,
	"timestamp": "2024-01-01T12:00:00.000Z",
	"path": "/auth",
	"data": {
		"approved": true,
		"auth_code": "00",
		"balance_left": 50000
	}
}
```

**Response (declined):**

```json
{
	"success": false,
	"timestamp": "2024-01-01T12:00:00.000Z",
	"path": "/auth",
	"data": {
		"approved": false,
		"auth_code": "51",
		"balance_left": 120000
	}
}
```

### GET /health

Health check endpoint.

### GET /metrics

Metrics for observability.

## How Idempotency Works

The service uses an in-memory cache to track processed idempotency keys:

1. **Duplicate Detection**: Before processing, the service checks if the `idempotency_key` has been seen before
2. **Key Storage**: Processed keys are stored with a 24-hour TTL
3. **Duplicate Response**: If a duplicate key is detected, the request is rejected with a 400 error
4. **Key Marking**: Requests mark their key mmediately to prevent future duplicates

This ensures that retries or duplicate requests don't result in double-posting to the ledger.

## Load Testing

Run the k6 load test:

```bash
# Install k6 (if not already installed)
# macOS: brew install k6
# Ubuntu: sudo apt-get install k6

# Run load test (150 requests/s for 60 seconds)
k6 run test/loadtest.js
```

**Expected Performance:**

- Target: 150 requests/second
- Duration: 60 seconds
- P95 Latency: < 30ms

## Testing

```bash
# Run unit and load tests
npm test

```

## Database Schema

**Accounts Table:**

- `id`: Primary key
- `cardPanToken`: Unique card token identifier
- `createdAt`, `updatedAt`, `deletedAt`: Timestamps

**Entries Table:**

- `id`: Primary key
- `accountId`: Reference to account
- `type`: 'debit' or 'credit'
- `amountKobo`: Amount in kobo
- `currency`: Currency code
- `counterpartyId`: Reference to counterparty account
- `linkingRef`: Unique reference linking debit/credit pairs
- `createdAt`: Timestamp

## PCI Hardening

If given another week to harden for PCI compliance:

### 1. **Data Protection**

- Implement AES-256 encryption for card tokens at rest
- Add field-level encryption for sensitive data
- Implement secure key management with rotation
- Add data masking for logs and responses

### 2. **Access Control**

- Implement JWT-based authentication
- Add role-based access control (RBAC)
- Implement API rate limiting and throttling

### 3. **Security Monitoring**

- Add comprehensive audit logging
- Implement real-time fraud detection
- Add anomaly detection for unusual transaction patterns

## Environment Variables

Create a `.env` file:

```env
PORT=3000
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_DB=card_auth_service
DATABASE_URL=postgresql://postgres:password@db:5432/card_auth_service
SYSTEM_ACCOUNT_TOKEN=SYSTEM_SETTLEMENT
```

## Architecture

- **Framework**: NestJS (TypeScript)
- **Database**: PostgreSQL with Prisma ORM
- **Caching**: In-memory cache for idempotency
- **Testing**: Jest for unit tests, k6 for load testing
- **Containerization**: Docker with docker-compose
