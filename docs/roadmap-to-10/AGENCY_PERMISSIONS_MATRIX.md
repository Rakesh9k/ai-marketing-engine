# Agency Permissions & Authorization Matrix — Mitra by Brainwise
**Workstream B — Security & Multi-Tenant Role Isolation**

---

## 1. Role Definitions

| Role ID | Title | Scope & Description |
| :--- | :--- | :--- |
| `agency_admin` | Agency Owner / Manager | Full administrative access across the entire agency workspace, all client businesses, billing, member invites, and credit allocations. |
| `agency_member` | Agency Staff / Specialist | Access to managed client businesses assigned to them, campaign creation, and analytics viewing. Restricted from billing and member management. |
| `user` | Standard Business Owner | Access strictly restricted to their single owned `businessId`. No cross-tenant access. |

---

## 2. Granular Operation Matrix

| Operation / Action | `agency_admin` | `agency_member` | Standard `user` | Server-Side Enforcement Point |
| :--- | :---: | :---: | :---: | :--- |
| **View Agency Overview (`/agency`)** | ✅ | ✅ | ❌ | Plan feature gate + `agencyId` check |
| **View All Client Businesses** | ✅ | Assigned Only | ❌ | `verifyBusinessAccess` middleware |
| **Switch Client Business Context** | ✅ | Assigned Only | ❌ | `verifyBusinessAccess` middleware |
| **Create Campaign for Client** | ✅ | ✅ | Own Only | `verifyBusinessAccess` + `checkEntitlements` |
| **Allocate Credits to Client** | ✅ | ❌ | ❌ | `agencyId` owner verification |
| **Invite / Remove Agency Members** | ✅ | ❌ | ❌ | `agency_admin` role claim check |
| **Manage Agency Billing / Plan** | ✅ | ❌ | ❌ | `agency_admin` role claim check |
| **View Cross-Client Campaign Table** | ✅ | ✅ (Filtered) | ❌ | Tenant query boundary (`agencyId` filter) |

---

## 3. Server-Side Guardrail Rules

1. **No Client-Provided Trust:** The server NEVER trusts `agencyId` or `businessId` supplied in browser request parameters without validating ownership against `context.auth.uid`.
2. **Strict Firestore Security Rules:**
   ```cel
   match /businesses/{businessId} {
     allow read, write: if request.auth != null && (
       resource.data.userId == request.auth.uid ||
       (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['agency_admin', 'agency_member'] &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.agencyId == resource.data.agencyId)
     );
   }
   ```
3. **Audit Logging:** Any unauthorized cross-tenant attempt logs a `SECURITY_VIOLATION` event with full user, source IP, and target business context.
