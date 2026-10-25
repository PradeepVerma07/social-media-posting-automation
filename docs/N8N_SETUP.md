# n8n Orchestration & Webhook Integration Setup

CI360 Automation Hub connects directly to your existing self-hosted n8n instance using authenticated webhook endpoints and the n8n REST API.

---

## 1. Webhook Architecture

Every business action dispatched from CI360 produces a signed HTTP POST request:

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "idempotencyKey": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "postId": 101,
  "brandId": 1,
  "requestedBy": 1,
  "timestamp": "2026-10-23T00:00:00.000Z",
  "data": {
    "title": "Announcing Zero-Downtime K8s Failover",
    "masterCaption": "...",
    "platforms": ["linkedin", "x"]
  }
}
```

### Security Headers
- `X-CI360-Signature`: HMAC SHA-256 hash computed with `N8N_WEBHOOK_SECRET` over `${timestamp}.${rawBody}`.
- `X-CI360-Timestamp`: ISO 8601 timestamp. Callbacks older than 300s are rejected to prevent replay attacks.
- `X-CI360-Request-Id`: Unique UUID for distributed request tracing.
- `X-CI360-Idempotency-Key`: Prevents double-publishing if network packets retry.

---

## 2. Webhook Route Mappings

| Action | n8n Webhook Path | Description |
| :--- | :--- | :--- |
| **Publish Now** | `/webhook/ci360/publish-now` | Orchestrates multi-platform release |
| **Request Approval** | `/webhook/ci360/request-approval` | Sends signed email/Slack review tokens |
| **Revise Post** | `/webhook/ci360/revise-post` | Notifies content lead of requested revisions |
| **Schedule Post** | `/webhook/ci360/schedule-post` | Registers time-delayed execution in n8n |
| **Retry Publication** | `/webhook/ci360/retry-publication` | Re-executes failed platform calls |
| **Callback Receiver** | `POST /api/v1/integrations/n8n/callback` | Receives async status updates from n8n |

---

## 3. n8n Primary Orchestration Workflow Pattern

In your n8n canvas:

1. **Webhook Trigger**: Set path to `/webhook/ci360/publish-now`.
2. **Crypto / Code Node**: Validate HMAC SHA-256 signature against `N8N_WEBHOOK_SECRET`.
3. **Database / API Check**: Confirm post ID is still in `approved` state in MySQL.
4. **Sub-Workflows**:
   - `LinkedIn Publish Node`
   - `Facebook Publish Node`
   - `Instagram Publish Node`
   - `X (Twitter) Publish Node`
5. **HTTP Request Callback**: Call `POST https://yourdomain.com/api/v1/integrations/n8n/callback` with execution result payload.
