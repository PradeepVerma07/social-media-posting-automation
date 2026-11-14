# Production System Specification & Implementation Prompt: Remote PC n8n & Antigravity Worker Integration

> **How to use this document:**  
> Copy and paste the section below titled **`=== MASTER PROMPT: REMOTE PC N8N & ANTIGRAVITY WORKER INTEGRATION ===`** directly into Cursor, Claude Code, ChatGPT, Devin, or provide it to your engineering team. It provides the exact blueprint, scripts, n8n workflow specifications, and networking setup to connect a remote GPU PC running Antigravity and n8n to your central Creator Studio cloud backend.

---

```markdown
=== MASTER PROMPT: REMOTE PC N8N & ANTIGRAVITY WORKER INTEGRATION ===

You are an expert Systems Architect, DevOps Engineer, and AI Automation Specialist. Your objective is to implement a secure, low-latency, distributed bridge between a **Remote PC (GPU Machine running local AI video/image generators + n8n)** and a **Central Cloud SaaS Platform (Creator Studio & Social Media Automation Hub)**.

This enables users to trigger AI video/image generation from the cloud web interface, have the heavy rendering executed on a remote GPU machine using Antigravity and n8n, and automatically deliver the finished media, captions, and metadata right back to the central platform's Creator Studio preview and publishing calendar.

---

### 1. DISTRIBUTED TOPOLOGY & ARCHITECTURE

```
+-----------------------------------------------------------------------------------------+
|                                CENTRAL CLOUD SERVER                                      |
|                             (https://360.webtrionix.com)                                |
|                                                                                         |
|  [Creator Studio UI] <---> [Express/Nest API] <---> [SQLite/Postgres DB]                |
|                                     |                                                   |
|                        Job Coordinator Endpoints:                                       |
|                        - POST /api/v1/machine/worker/claim                              |
|                        - PUT  /api/v1/machine/worker/heartbeat                          |
|                        - PUT  /api/v1/machine/worker/upload/:id                         |
|                        - POST /api/v1/machine/worker/fail                               |
+-----------------------------------------------------------------------------------------+
                                   ^              ^
                HTTPS (Secure SSL) |              | HTTPS / Webhook
                X-Worker-Key Auth  |              | X-Automation-Key Auth
                                   v              v
+-----------------------------------------------------------------------------------------+
|                           REMOTE PC / GPU WORKSTATION                                    |
|                                                                                         |
|   +------------------------------------+    +---------------------------------------+   |
|   |         Local Worker Daemon        |    |            n8n Automation             |   |
|   |       (Node.js / Python CLI)       |    |       (Docker or Self-Hosted)         |   |
|   +------------------------------------+    +---------------------------------------+   |
|                     |                                          |                        |
|                     v                                          v                        |
|   +---------------------------------------------------------------------------------+   |
|   |                         Antigravity AI Generation Engine                        |   |
|   |       - Local LLM Scripting / Storyboarding                                     |   |
|   |       - Local GPU Video Diffusion / Stable Diffusion / ComfyUI / FFmpeg         |   |
|   |       - Local TTS Audio Synthesis                                               |   |
|   +---------------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------------+
```

---

### 2. SECURITY & AUTHENTICATION PROTOCOL

Communication between the Remote PC and the Central Cloud Server is strictly secured using high-entropy pre-shared keys (PSKs) and HMAC signatures:

1. **`X-Worker-Key` (Remote Daemon -> Central API):**
   - Minimum 32-character high-entropy secret.
   - Evaluated using timing-safe buffer comparison (`crypto.timingSafeEqual`) on the server to prevent timing attacks.
   - Grants the worker rights to claim queued jobs, extend leases, and upload completed binaries.

2. **`X-Automation-Key` (n8n Webhook Dispatcher <-> Central API):**
   - Minimum 32-character high-entropy secret.
   - Authenticates n8n workflow triggers and callback responses.

3. **HMAC-SHA256 Payload Validation (for n8n Webhooks):**
   - Header: `X-CI360-Signature = sha256_hmac(secret, timestamp + "." + rawBody)`
   - Replay Protection: Rejects any payload where `abs(now - timestamp) > 300` seconds.

---

### 3. REMOTE PC WORKER DAEMON IMPLEMENTATION

Build a lightweight, resilient Node.js / TypeScript daemon (`remote-worker.ts`) to run as a persistent system service (via PM2, systemd, or Windows Task Scheduler) on the Remote GPU PC.

```typescript
import axios from 'axios';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Configuration loaded from remote PC environment
const CENTRAL_API = process.env.CENTRAL_API_URL || 'https://360.webtrionix.com/api/v1/machine';
const WORKER_KEY = process.env.ANTIGRAVITY_WORKER_KEY!;
const WORKER_ID = process.env.WORKER_ID || `gpu-worker-${crypto.randomBytes(4).toString('hex')}`;
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 5000;
const OUTPUT_DIR = path.resolve(process.env.LOCAL_OUTPUT_DIR || './antigravity_output');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const api = axios.create({
  baseURL: CENTRAL_API,
  headers: {
    'X-Worker-Key': WORKER_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

async function ping() {
  try {
    await api.post('/worker/ping', { workerId: WORKER_ID, cliReady: true });
  } catch (err: any) {
    console.error('[Ping Error]:', err.message);
  }
}

async function claimJob() {
  try {
    const { data } = await api.post('/worker/claim', { workerId: WORKER_ID });
    return data?.job || null;
  } catch (err: any) {
    if (err.response?.status !== 204) {
      console.error('[Claim Error]:', err.response?.data || err.message);
    }
    return null;
  }
}

async function sendProgress(jobId: string, leaseToken: string, stage: string, percent: number) {
  try {
    await api.post('/worker/progress', {
      jobId,
      leaseToken,
      stage,
      progressPercent: percent,
    });
  } catch (err: any) {
    console.warn('[Progress Update Failed]:', err.message);
  }
}

async function sendHeartbeat(jobId: string, leaseToken: string) {
  try {
    await api.post('/worker/heartbeat', { jobId, leaseToken });
  } catch (err: any) {
    console.warn('[Heartbeat Failed]:', err.message);
  }
}

async function uploadResult(jobId: string, leaseToken: string, filePath: string, isImage: boolean) {
  const fileBuffer = fs.readFileSync(filePath);
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  await api.put(`/worker/upload/${jobId}`, fileBuffer, {
    headers: {
      'X-Job-Lease': leaseToken,
      'X-Content-SHA256': sha256,
      'Content-Type': isImage ? 'image/png' : 'video/mp4',
      'Content-Length': fileBuffer.length,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
}

async function failJob(jobId: string, leaseToken: string, errorMsg: string) {
  try {
    await api.post('/worker/fail', { jobId, leaseToken, error: errorMsg });
  } catch (err: any) {
    console.error('[Fail Report Error]:', err.message);
  }
}

/**
 * Execute Local Antigravity Rendering CLI / Pipeline
 */
async function executeAntigravityGeneration(job: any): Promise<string> {
  const input = JSON.parse(job.inputJson || '{}');
  const format = input.kind || 'video';
  const prompt = job.prompt || input.title || 'Creative Video';
  const outputPath = path.join(OUTPUT_DIR, `${job.id}.${format === 'post' ? 'png' : 'mp4'}`);

  console.log(`[Antigravity] Starting generation for Job ${job.id} (${format})...`);

  // Call local Antigravity CLI or Python generation script
  // Example command: antigravity generate --prompt "..." --output "..." --format "9:16"
  const safePrompt = prompt.replace(/"/g, '\\"');
  const command = `antigravity-cli render --id "${job.id}" --prompt "${safePrompt}" --output "${outputPath}"`;

  const { stdout, stderr } = await execAsync(command);
  console.log('[Antigravity CLI Output]:', stdout);

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Generation finished but output file was not found at ${outputPath}`);
  }

  return outputPath;
}

/**
 * Main Worker Loop
 */
async function startWorker() {
  console.log(`[Remote Worker] Antigravity GPU Worker Daemon Started. ID: ${WORKER_ID}`);
  setInterval(ping, 60000); // 1-minute ping
  await ping();

  while (true) {
    try {
      const job = await claimJob();
      if (!job) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        continue;
      }

      console.log(`[Worker] Claimed Job ${job.id}. Starting processing...`);
      const leaseToken = job.leaseToken;

      // Start continuous heartbeat every 30 seconds
      const heartbeatInterval = setInterval(() => sendHeartbeat(job.id, leaseToken), 30000);

      try {
        await sendProgress(job.id, leaseToken, 'Initializing creative brief & model weights', 15);
        await sendProgress(job.id, leaseToken, 'Rendering visual scenes and audio synthesis', 50);

        const generatedFilePath = await executeAntigravityGeneration(job);

        await sendProgress(job.id, leaseToken, 'Encoding finished media and uploading to central cloud', 90);

        const isImage = (JSON.parse(job.inputJson || '{}').kind === 'post');
        await uploadResult(job.id, leaseToken, generatedFilePath, isImage);

        console.log(`[Worker] Job ${job.id} successfully completed and uploaded!`);
      } catch (genError: any) {
        console.error(`[Worker] Job ${job.id} failed:`, genError.message);
        await failJob(job.id, leaseToken, genError.message);
      } finally {
        clearInterval(heartbeatInterval);
      }
    } catch (err: any) {
      console.error('[Worker Fatal Loop Error]:', err.message);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

startWorker();
```

---

### 4. N8N WORKFLOW BLUEPRINT & INTEGRATION SPECIFICATION

When orchestrating through **n8n on the remote PC** (or cloud n8n connected to the remote PC), create the following n8n workflows:

#### Workflow A: Instant Dispatch Trigger (`/webhook/antigravity/dispatch`)
1. **Webhook Node (POST):**
   - Authentication: Header Auth (`X-Automation-Key`).
   - Receives `{ "jobId": "..." }` when creator clicks "Create Video" in Creator Studio.
2. **Execute Command / SSH Node:**
   - Triggers the local Antigravity generator or awakens the local GPU task queue.
3. **HTTP Request Node (Central Callback):**
   - Endpoint: `POST https://360.webtrionix.com/api/v1/machine/dispatch`
   - Headers: `X-Automation-Key: {{$env.ANTIGRAVITY_N8N_KEY}}`
   - Body: `{ "jobId": $json.jobId }`
   - Marks the job as dispatched in the central SQLite/Postgres DB.

#### Workflow B: Automated Multi-Platform Social Poster
When a video is marked `READY` or `SCHEDULED` in Creator Studio:
1. **Cron Trigger / Webhook Trigger (`/webhook/ci360/publish-now`):**
   - Receives job details, direct media download URL (`https://360.webtrionix.com/uploads/:id.mp4`), caption, hashtags, and destination accounts.
2. **Switch Node (Target Platform Branching):**
   - **Branch 1: Instagram Reel** -> Calls Meta Graph API Container Endpoint (`/media?media_type=REELS&video_url=...`), checks status until `READY`, then publishes (`/media_publish`).
   - **Branch 2: Facebook Video** -> Calls Facebook Graph API (`/{page_id}/videos`).
   - **Branch 3: YouTube Shorts** -> Uploads binary chunk to YouTube Data API v3 (`videos.insert` with `#Shorts` tag).
   - **Branch 4: LinkedIn Video** -> Registers upload via LinkedIn Assets API, streams MP4, creates user/org post.
3. **HTTP Request Node (Final Publishing Callback):**
   - Endpoint: `POST https://360.webtrionix.com/api/v1/integrations/n8n/callback`
   - Body:
     ```json
     {
       "jobId": "e9673ba8-b271-431b-8314-bf00e4c742de",
       "status": "PUBLISHED",
       "publishedUrls": {
         "instagram": "https://instagram.com/p/ABC123xyz",
         "facebook": "https://facebook.com/watch/?v=123456789"
       }
     }
     ```

---

### 5. LOCAL PC FOLDER WATCHER ("DISCOVER" MODE)

If your local Antigravity generation outputs files directly into a local desktop folder (e.g., `C:\AI_Outputs\`), implement the **Automatic Discovery Service**:

1. Watch directory for new `.mp4` or `.png` files.
2. Compute SHA-256 hash upon write completion.
3. Call `POST /api/v1/machine/worker/discover` with:
   ```json
   {
     "filename": "Wordpress_Manpower_Reel.mp4",
     "sha256": "4a1b5c..."
   }
   ```
4. Central server matches the hash with the creator's default active brand, registers the job, grants a lease token, and requests upload.
5. The daemon uploads the binary, immediately making it visible in the Creator Studio web UI without manual user intervention!

---

### 6. ENVIRONMENT CONFIGURATION REFERENCE

#### Central Cloud Server (`.env`):
```env
ANTIGRAVITY_N8N_KEY="a_very_long_secure_random_key_with_at_least_32_characters"
ANTIGRAVITY_WORKER_KEY="a_second_very_long_secure_random_key_with_at_least_32_chars"
ANTIGRAVITY_DISPATCH_URL="https://n8n.webtrionix.com/webhook/antigravity/dispatch"
PUBLIC_BASE_URL="https://360.webtrionix.com"
UPLOADS_DIRECTORY="/var/www/webtrionix/uploads"
ANTIGRAVITY_MAX_UPLOAD_BYTES=524288000
```

#### Remote PC Daemon (`.env`):
```env
CENTRAL_API_URL="https://360.webtrionix.com/api/v1/machine"
ANTIGRAVITY_WORKER_KEY="a_second_very_long_secure_random_key_with_at_least_32_chars"
WORKER_ID="remote-gpu-rig-01"
POLL_INTERVAL_MS=5000
LOCAL_OUTPUT_DIR="C:\\Antigravity_Outputs"
```

---

### 7. VERIFICATION & VALIDATION PROTOCOL

Run these steps to confirm full end-to-end connectivity:
1. **Worker Heartbeat Test:** Run worker on Remote PC. Verify `GET /api/v1/creator/status` returns `workerOnline: true` and `lastSeenAt` is within 90 seconds.
2. **End-to-End Generation Test:** Submit a new Reel prompt from the Creator Studio web UI.
3. **Execution Verification:** Confirm Remote PC logs claim the job, GPU starts rendering, and progress updates (15% -> 50% -> 90%) display in the web progress bar.
4. **Binary & Preview Verification:** Confirm that once uploaded, the video player in the Creator Studio live preview immediately loads the generated MP4.
5. **Publishing Test:** Select connected Instagram/Facebook channels and trigger schedule or direct publish.
```
