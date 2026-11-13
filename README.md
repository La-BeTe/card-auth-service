# Card authorisation service

A NestJS service that takes a card authorisation request, approves or declines it against the wallet balance supplied in the request, and posts approved amounts to a double-entry ledger in Postgres. It is a small, readable model of the core of a card issuer's auth path: duplicate rejection by idempotency key, ISO 8583-style response codes (`00` approved, `51` insufficient funds) and paired debit/credit entries tied together by a shared reference.

## Tech Stack

- TypeScript
- NestJS
- PostgreSQL
- Prisma
- Jest
- k6
- Docker

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

This starts Postgres and the app, runs the Prisma migrations, and serves the API on `http://localhost:3000` (or whatever `PORT` is set to in `.env`). The migrations seed two accounts: the settlement account `SYSTEM_SETTLEMENT` and a test card account `TEST_TOKEN`.

```bash
curl -X POST http://localhost:3000/auth \
  -H 'Content-Type: application/json' \
  -d '{"idempotency_key":"abc-123","card_pan_token":"TEST_TOKEN","amount_kobo":70000,"currency":"NGN","wallet_balance_kobo":120000}'
```

## How an authorisation is processed

1. The request body is validated (`class-validator`, unknown fields rejected). Amounts are non-negative integers in kobo; `NGN` is the only accepted currency.
2. The idempotency key is checked. If it has been seen in the last 24 hours the request is rejected; otherwise the key is recorded and processing continues.
3. The amount is compared with `wallet_balance_kobo` from the request. The service does not store balances; the caller supplies the balance and the service decides against it.
4. If the amount exceeds the balance, the request is declined with code `51` and nothing is written.
5. If it fits, the card account is looked up by `card_pan_token` and two ledger entries are written: a debit on the card account and a credit on the settlement account, sharing a generated `linkingRef`. The response carries code `00` and the remaining balance.

## API

All responses are wrapped in an envelope with `success`, `timestamp` and `path`. Successful handler results go under `data`; errors go under `error.message`.

### POST /auth

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

**Approved** (HTTP 201):

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

**Declined, insufficient funds** (also HTTP 201; `success` mirrors `approved`):

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

**Errors:**

- `400 Duplicate request`: the idempotency key was already used.
- `400 Account not found for token: ...`: the card token has no account (checked only on the approve path).
- `400` with validation messages: malformed body.
- `500`: the settlement account is missing, or an unexpected failure.

### GET /health

Liveness check. Returns the standard envelope with `"data": "Hello World!"`. It does not check the database.

### GET /metrics

A JSON summary kept in process memory: request totals (successful and failed, based on the envelope's `success` flag), average, P95 and P99 latency over the last 1,000 requests, and process heap usage. It is not in Prometheus format and resets on restart.

## Idempotency

Keys are held in an in-process cache with a 24-hour TTL. The key is recorded before the authorisation runs, so a second request with the same key gets `400 Duplicate request` whatever happened to the first one. This prevents the same request being posted to the ledger twice.

It is duplicate rejection, not response replay: a client retrying after a timeout gets a 400 rather than the original result, and a request that failed (for example, unknown card token) cannot be retried with the same key. Because the cache is in memory, keys are lost on restart and are not shared between instances.

## Database schema

**Account**

- `id`: primary key
- `cardPanToken`: card token, unique
- `createdAt`, `updatedAt`, `deletedAt`: timestamps (`deletedAt` set means the account is treated as not found)

**Entry**

- `id`: primary key
- `accountId`: the account the entry belongs to
- `type`: `debit` or `credit`
- `amountKobo`: amount in kobo
- `currency`: currency code
- `counterpartyId`: the account on the other side of the posting
- `linkingRef`: UUID shared by the debit and credit of one posting; indexed, not unique (each value appears on two rows)
- `createdAt`: timestamp

## Running locally without Docker

```bash
npm install
cp .env.example .env            # DATABASE_URL points at localhost:5431
docker compose up -d db         # or point DATABASE_URL at your own Postgres
npx prisma migrate deploy
npm run start:dev
```

## Testing

```bash
npm test          # Jest unit tests, then the k6 load test
npx jest          # unit tests only
```

The unit tests cover the auth decision (approve, decline, zero amount) and the ledger posting with Prisma mocked. `npm test` runs `k6 run test/loadtest.js` after Jest, so it needs k6 installed and the service running on `localhost:3000`.

### Load test

`test/loadtest.js` runs 150 concurrent virtual users for 60 seconds. Each one sends `POST /auth` with a random amount and a fresh idempotency key, then sleeps 10 ms. It checks for HTTP 201 and an `approved` field. It sets no throughput target and no latency thresholds, so it is a soak and correctness check rather than a benchmark; read latency from k6's summary or from `GET /metrics`.

```bash
# macOS: brew install k6
k6 run test/loadtest.js
```

## Limitations

- **Ledger postings are not atomic.** The debit and credit are written by two separate `prisma.entry.create` calls with no transaction, so a failure between them leaves a one-sided posting.
- **No stored balances.** The balance is whatever the client sends; the service does not derive it from the ledger or hold funds.
- **Idempotency is per process and in memory**, and rejects duplicates rather than replaying the first response.
- **Declines are not recorded.** Only approved authorisations write to the ledger, and the card account lookup happens only on that path, so an unknown token with an insufficient balance gets `51` rather than an error.
- **Single currency** (`NGN`), and no endpoint to create accounts or read the ledger.

## Next steps

Correctness:

- Wrap the debit and credit in a single `prisma.$transaction`.
- Move idempotency keys to Postgres or Redis, store the response against the key, and replay it on retries; release the key when processing fails.
- Keep account balances (or derive them from the ledger) and place holds, instead of trusting a client-supplied balance.
- Add a unique constraint on `(linkingRef, type)` so a posting cannot have two debits.

Production hardening (PCI DSS scope):

- Encrypt card tokens at rest with managed keys and rotation; mask tokens in logs and error messages.
- Authenticate callers (mTLS or signed tokens) and add rate limiting.
- Audit logging for every authorisation decision.
- Export metrics in Prometheus format and make `/health` check the database.

## License

MIT
