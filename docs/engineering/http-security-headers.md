# HTTP Security Headers & Content Security Policy Documentation

**Date:** October 10, 2026  
**Status:** Enforced in `next.config.ts`

---

## 1. Summary of Configured Security Headers

| Header Key | Configured Value | Security Function |
|---|---|---|
| `Content-Security-Policy` | Restrictive directive list (see §2) | Prevents unauthorized cross-site scripting (XSS), script injection, data exfiltration |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains` | Enforces HTTPS-only communication across main domain and subdomains |
| `X-Frame-Options` | `DENY` | Prevents clickjacking by forbidding iframe rendering of the application |
| `X-Content-Type-Options` | `nosniff` | Blocks MIME-type sniffing by browsers |
| `X-XSS-Protection` | `1; mode=block` | Enables legacy browser XSS filters |
| `Referrer-Policy` | `origin-when-cross-origin` | Controls information sent in Referer headers |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(self "https://*.paddle.com")` | Disables unused hardware device APIs while preserving Paddle checkout |
| `X-DNS-Prefetch-Control` | `on` | Optimizes DNS resolution safely |

---

## 2. Content Security Policy Breakdown

```http
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.paddle.com https://checkout.razorpay.com https://sdk.cashfree.com https://www.google.com https://www.gstatic.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: blob: https://firebasestorage.googleapis.com https://storage.googleapis.com https://lh3.googleusercontent.com https://images.unsplash.com https://plus.unsplash.com;
  font-src 'self' https://fonts.gstatic.com data:;
  connect-src 'self' https://*.firebaseio.com https://*.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://api.paddle.com https://*.cashfree.com https://api.razorpay.com https://*.sentry.io wss://*.firebaseio.com;
  frame-src 'self' https://*.paddle.com https://*.cashfree.com https://api.razorpay.com https://*.firebaseapp.com;
  frame-ancestors 'none';
  object-src 'none';
  base-uri 'self';
```
