# CI360 Security Architecture & RBAC Policy

CI360 Automation Hub enforces zero-trust architecture, tenant isolation, and strict cryptographic safeguards.

---

## 1. Cryptography & Webhook Authentication

- **HMAC SHA-256 Webhooks**: All outbound requests from CI360 to n8n and inbound callbacks are signed using `crypto.createHmac('sha256', secret)`.
- **Replay Protection**: Timestamps are verified with a 300-second freshness window. Requests outside this window are dropped.
- **Idempotency Keys**: Every request carries an `X-CI360-Idempotency-Key` (UUIDv4) to guarantee exactly-once execution.

---

## 2. Role-Based Access Control (RBAC)

| Role | Posts | Approvals | Brands | Workflows | Settings |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Full | Override & Audit | Manage All | Manage All | Full System |
| **Admin** | Full | Approve / Reject | Manage Brand | Execute Allowed | View Logs |
| **Content Manager** | Create / Edit | Submit Only | Assigned Only | No Execution | No Access |
| **Approver** | Read | Full Review | Assigned Only | No Execution | No Access |
| **Analyst** | Read Only | No Access | Assigned Only | View Runs Only | No Access |
| **Client** | Read Only | Approve Assigned | Brand Scoped | No Access | No Access |

---

## 3. Secret Protection

- Frontend code never contains API keys, database credentials, or OAuth tokens.
- Social tokens are stored encrypted in MySQL or within n8n's internal credential manager.
- Session tokens use HTTP-only, secure, SameSite cookies.
