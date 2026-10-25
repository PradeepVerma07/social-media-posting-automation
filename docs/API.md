# CI360 Automation Hub REST API v1 Specification

All endpoints are versioned under `/api/v1` and require authenticated session cookies or Bearer access tokens.

---

## Authentication

### `POST /api/v1/auth/login`
Authenticates user with email and password.
- **Request Body**: `{ "email": "admin@ci360.internal", "password": "..." }`
- **Response**: `{ "user": { ... }, "accessToken": "...", "expiresIn": "15m" }`

### `GET /api/v1/auth/me`
Returns the currently authenticated user session.

### `POST /api/v1/auth/logout`
Revokes session and clears HTTP-only cookies.

---

## Posts Management

### `GET /api/v1/posts`
Query posts with optional filters.
- **Query Parameters**:
  - `brandId` (number)
  - `approvalStatus` (`draft` | `in_review` | `revision_requested` | `approved` | `rejected`)
  - `publishingStatus` (`idle` | `scheduled` | `processing` | `published` | `failed`)
  - `search` (string)

### `POST /api/v1/posts`
Creates a new post.
- **Request Body**:
  ```json
  {
    "brandId": 1,
    "title": "Post Title",
    "masterCaption": "Caption text...",
    "scheduledAt": "2026-10-25T14:00:00Z",
    "platforms": [{ "platform": "linkedin", "captionOverride": "..." }],
    "submitForApproval": true
  }
  ```

### `POST /api/v1/posts/:id/approve`
Approves post, locks content, and transitions status to `approved`.

### `POST /api/v1/posts/:id/reject`
Rejects post with mandatory reason.
- **Request Body**: `{ "reason": "Explanation of rejection" }`

### `POST /api/v1/posts/:id/publish`
Triggers immediate multi-channel publishing via signed n8n webhook.

---

## Integrations

### `POST /api/v1/integrations/n8n/test`
Verifies network connectivity and authentication to the n8n REST API.

### `POST /api/v1/integrations/n8n/callback`
Receives execution callbacks from n8n. Requires valid `X-CI360-Signature` and `X-CI360-Timestamp` headers.

### `POST /api/v1/integrations/google-sheets/sync`
Performs bi-directional sync with connected planning spreadsheet.
