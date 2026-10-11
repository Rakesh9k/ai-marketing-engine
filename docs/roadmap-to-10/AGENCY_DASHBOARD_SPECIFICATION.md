# Dedicated Agency Dashboard Specification — Mitra by Brainwise
**Workstream B — Multi-Client Agency Management Architecture**

---

## 1. Executive Summary & Product Vision

The **Dedicated Agency Dashboard** (`/agency`) enables marketing agencies, consultants, and multi-location managers to operate across multiple client businesses from a single, high-efficiency workspace. 

### Core Capabilities:
1. **Multi-Client Workspace Navigation:** Seamless switching between managed client accounts without logging out or manipulating credentials.
2. **Aggregated Performance & Campaign Analytics:** Real-time visibility across all managed client campaigns, inquiries, conversion rates, and spend.
3. **Credit Allocation & Ledger Governance:** Distributed credit pool management allowing agencies to allocate credit allowances to individual clients.
4. **Server-Side Tenant Isolation & Security:** Role-based access control (`agency_admin`, `agency_member`) protecting client data boundaries via `verifyBusinessAccess`.

---

## 2. Route Architecture (`/agency`)

```
src/app/agency/
├── layout.tsx                  # Agency Top Navigation Bar & Sidebar Context
├── page.tsx                    # Overview Dashboard & Executive Summary
├── clients/
│   ├── page.tsx                # Client Directory (Search, Filter, Onboarding)
│   └── [clientId]/page.tsx     # Client Business Workspace & Settings
├── campaigns/
│   └── page.tsx                # Multi-Client Cross-Tenant Campaign Table
└── settings/
    └── page.tsx                # Agency Profile, Team Members & Role Management
```

---

## 3. Data Model & Architecture

### 3.1 Agency Entity Model (`Agency`)
```typescript
export interface Agency {
  agencyId: string;
  name: string;
  ownerUserId: string;
  vertical?: BusinessCategory;
  members: AgencyMember[];
  clientCount: number;
  allocatedCredits: number;
  totalCredits: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgencyMember {
  userId: string;
  email: string;
  name: string;
  role: 'agency_admin' | 'agency_member';
  assignedClientIds?: string[];
  addedAt: string;
}
```

### 3.2 Client Entity Model (`Client`)
```typescript
export interface Client {
  clientId: string;
  agencyId: string;
  businessId: string;
  name: string;
  category: BusinessCategory;
  status: 'ACTIVE' | 'ONBOARDING' | 'PAUSED' | 'ARCHIVED';
  allocatedCredits: number;
  usedCredits: number;
  activeCampaignsCount: number;
  totalInquiries: number;
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. Client Switcher & Workspace Isolation

When an agency user switches active clients via the Client Switcher dropdown:
1. The active `businessId` context in global state (`useBusinessBrain` or `useAgencyStore`) updates to the target client's `businessId`.
2. All subsequent backend calls include `businessId` in the request payload or header.
3. Cloud Functions middleware `verifyBusinessAccess` verifies:
   - User `agencyId` matches business `agencyId`.
   - User role is `agency_admin` or `agency_member`.
   - Access is rejected immediately with `HttpsError('permission-denied')` if tenancy boundaries do not match.
