# API Rate Limiting and Abuse Prevention Policy

**Date:** October 10, 2026  
**Implementation:** Upstash Redis with `@upstash/ratelimit` & Process-Local Memory Fallback

---

## 1. Rate Limiting Architecture

- **Primary Limiter:** Upstash Redis distributed sliding window counters via `@upstash/ratelimit`.
- **Fallback Limiter:** Sliding-window in-memory store when Redis environment credentials (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`) are unconfigured or temporarily unreachable.
- **Fail-Safe Behavior:** For costly AI generation routes, requests are throttled at a strict threshold per user UID or client IP address.

---

## 2. Policy Matrix

| Policy Scope | Time Window | Default Throttling Limit | Header Metadata Returned | Applied Endpoints |
|---|---|---|---|---|
| **AI Content Generation** | 60 seconds | 20 requests / user | `Retry-After`, `X-RateLimit-*` | `/api/generate-content`, AI functions |
| **Public Pre-Auth API** | 60 seconds | 10 requests / IP | `Retry-After`, `X-RateLimit-*` | Auth pre-flight endpoints |
| **Standard Read API** | 60 seconds | 60 requests / user | `Retry-After`, `X-RateLimit-*` | Dashboard & analytics APIs |

---

## 3. Response Format on Throttling (HTTP 429)

```json
{
  "error": "Too many requests. Please slow down and try again later.",
  "retryAfterSeconds": 45
}
```
Headers:
- `Retry-After: 45`
- `X-RateLimit-Limit: 20`
- `X-RateLimit-Remaining: 0`
- `X-RateLimit-Reset: 1760000000000`
