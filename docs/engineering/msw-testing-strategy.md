# MSW HTTP API Mocking Strategy

**Date:** October 10, 2026  
**Implementation:** Mock Service Worker (MSW v2) in `src/mocks/`

---

## 1. Scope & Architecture

- Centralized request handlers in `src/mocks/handlers.ts`.
- Node test server setup in `src/mocks/server.ts`.
- Intercepts outgoing client HTTP/REST requests during unit and component tests without patching global fetch manually.
