# Master Single Specification Prompt: Creator Studio & Remote PC Antigravity Worker System

> **How to use this document:**  
> Copy and paste the entire block below starting from **`=== MASTER PROMPT: ALL-IN-ONE CREATOR STUDIO & REMOTE ANTIGRAVITY WORKER SYSTEM ===`** directly into Cursor, Claude Code, ChatGPT, Devin, or provide it to a senior engineering team. It contains the complete end-to-end architecture, frontend UI, database schemas, API contracts, remote GPU worker daemon, n8n workflows, and resilient recovery workflows.

---

```markdown
=== MASTER PROMPT: ALL-IN-ONE CREATOR STUDIO & REMOTE ANTIGRAVITY WORKER SYSTEM ===

You are an expert Principal Systems Architect and Full-Stack Engineer. Build a production-ready, distributed, enterprise-grade **"Creator Studio & Remote AI Rendering Engine"** for a social media automation SaaS platform.

This unified system allows users to create, preview, schedule, and publish multi-format AI-generated content (Reels/Shorts, 24h Stories, Single Feed Posts, and Multi-Slide Carousels) from a central web app, while delegating heavy GPU rendering (video diffusion, audio TTS, image synthesis) to an external **Remote PC / GPU Workstation running an Antigravity Worker Daemon and n8n**. The finished media, captions, and metadata are automatically streamed back to the central platform for live preview, human-in-the-loop review, and multi-channel publication (Instagram, Facebook, YouTube, LinkedIn, X, TikTok).

---

### PART 1: DISTRIBUTED SYSTEM ARCHITECTURE

```
+-----------------------------------------------------------------------------------------+
|                                CENTRAL CLOUD SAAS                                        |
|                          (Web Frontend & API Coordinator)                               |
|                                                                                         |
|  [Creator Studio UI] <=======> [Express / Next.js REST API] <=======> [DB & Storage]    |
|   - Split-screen studio         - Machine router (claims, uploads)     - Jobs schema    |
|   - Multi-format switcher       - Social publishing controller         - Media storage  |
|   - Live player & preview       - Diagnostic & "Fix/Reschedule"        - SQLite/Postgres|
+-----------------------------------------------------------------------------------------+
                                   ^              ^
                HTTPS (Secure SSL) |              | HTTPS Webhooks
                X-Worker-Key Auth  |              | X-Automation-Key Auth
                                   v              v
+-----------------------------------------------------------------------------------------+
|                          REMOTE GPU PC & N8N WORKSTATION                                 |
|                                                                                         |
|   +------------------------------------+    +---------------------------------------+   |
|   |    Local Worker Daemon (Node/Py)   |    |         Local / Cloud n8n Hub         |   |
|   |    - Polls & claims queued jobs    |    |    - Triggered by instant dispatch    |   |
|   |    - Sends progress & heartbeats   |    |    - Multi-platform publishing API    |   |
|   |    - Uploads finished MP4/images   |    |    - Status callbacks                 |   |
|   +------------------------------------+    +---------------------------------------+   |
|                     |                                                                   |
|                     v                                                                   |
|   +---------------------------------------------------------------------------------+   |
|   |                         Antigravity AI Generation Engine                        |   |
|   |       - Local LLM Scripting / Storyboarding                                     |   |
|   |       - Local GPU Video Diffusion / Stable Diffusion / ComfyUI / FFmpeg         |   |
|   |       - Local TTS Audio Synthesis                                               |   |
|   +---------------------------------------------------------------------------------+   |
+-----------------------------------------------------------------------------------------+
```

---

### PART 2: DATABASE SCHEMA SPECIFICATION

Implement the following relational or document schema:

```prisma
enum ContentFormat {
  REEL_SHORT    // 9:16 Vertical Video (up to 90s)
  STORY_24H     // 9:16 Ephemeral Story (15s video or image)
  FEED_POST     // 1:1 or 4:5 Single Image Post
  CAROUSEL_POST // 2 to 10 swipeable slides (images/cards)
}

enum JobStatus {
  QUEUED                // Waiting for an available worker daemon
  GENERATING            // Remote worker actively rendering visual/audio assets
  READY                 // Media generated & uploaded; awaiting schedule setup
  READY_FOR_SCHEDULING  // Schedule set; waiting for final manager sign-off
  AWAITING_APPROVAL     // In formal approval queue
  SCHEDULED             // Confirmed and queued in publishing scheduler
  POSTED                // Successfully published live to target channels
  FAILED                // Generation or publishing failure (actionable)
  CANCELLED             // Cancelled by creator or admin
}

model CreatorJob {
  id                String         @id @default(uuid())
  brandId           String
  title             String
  format            ContentFormat  @default(REEL_SHORT)
  status            JobStatus      @default(QUEUED)
  
  // Prompt & Creative Brief
  scriptPrompt      String         // Detailed visual description / storyboard
  captionGuidance   String?        // Viewers' caption / copy with hashtags & CTAs
  targetLanguage    String         @default("en")
  aspectRatio       String         @default("9:16") // "9:16", "1:1", "16:9", "4:5"
  videoLengthSeconds Int?          @default(30)
  
  // Carousel specific
  carouselSlides    Json?          // Array<{ slideIndex: number, text: string, imageUrl?: string }>
  
  // Reference Assets for Regeneration
  referenceImageUrl String?        // Seed/Style reference uploaded by creator
  regenerateNotes   String?        // Specific instructions for re-generation

  // Remote Worker Tracking
  workerId          String?
  leaseToken        String?
  leaseUntil        DateTime?
  lastStage         String?        // e.g., "Synthesizing voiceover", "Rendering scenes"
  progressPercent   Int            @default(0)

  // Media Artifacts
  mediaUrl          String?        // Public URL of finished MP4/MOV/PNG/JPG
  thumbnailUrl      String?        // Video poster or carousel cover
  fileSha256        String?        // SHA-256 integrity hash

  // Publishing & Scheduling
  targetChannelIds  String[]       // Foreign keys to connected social accounts
  scheduledFor      DateTime?      // ISO-8601 publication timestamp
  directPublish     Boolean        @default(false) // Auto-publish without approval if permitted

  // Error Handling & Recovery
  failureReason     String?        // User-friendly error message
  failureDetails    Json?          // Raw API error, failed channel IDs
  localLogPath      String?        // Path to worker execution log

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@index([brandId, status])
  @@index([status, leaseUntil])
}
```

---

### PART 3: CENTRAL WEB FRONTEND SPECIFICATION (Split-Screen UI)

Construct a responsive, split-screen UI:

#### Left Panel: Dynamic Generation Controls
1. **Content Format Switcher Tabs (Height: 56px–64px / `h-14` to `h-16`):**
   - Four format pills:
     - 🎬 **Reel / Short** (9:16 vertical video)
     - ⏱️ **24h Story** (9:16 ephemeral story)
     - 🖼️ **Feed Post** (1:1 / 4:5 single visual)
     - 📚 **Carousel Post** (Multi-slide swipeable card set)
   - Must have clean single icons, active highlight pills, and smooth transitions.

2. **Brand Selector & Context:**
   - Dropdown listing brands with active social account badges.

3. **Storyboard Prompt & Post Caption Textareas:**
   - **Working Title** (`input`, max 120 chars).
   - **Detailed Script & Storyboard** (`textarea`, min-height 180px–220px): Labeled *"AI generation prompt (not published to viewers)"*.
   - **Post Caption** (`textarea`, min-height 120px): Labeled *"Post Caption (Appears live on Instagram, Facebook & channels)"*, with emoji bar and character counter.

4. **Dynamic Format-Specific Inputs:**
   - If **Reel/Short** or **24h Story**: Aspect ratio (`9:16`, `16:9`, `1:1`), duration slider (15s, 30s, 60s, 90s), and language selector.
   - If **Feed Post**: Aspect ratio (`1:1 Square`, `4:5 Portrait`), image style preset.
   - If **Carousel Post**: Multi-slide builder with `+ Add Slide`, drag-and-drop reordering, per-slide copy, and optional per-slide reference image.

5. **Reference Image & Regeneration Controls:**
   - Image dropzone for style/actor reference.
   - Regeneration notes input (*"Keep the actor, change background to office"*).

6. **Action Triggers:**
   - `Create Video / Generate Post` (Primary button).
   - `Direct Publish & Schedule` (Schedules/publishes immediately without draft review if brand permissions allow).

#### Right Panel: Live Preview, Diagnostics & Job History
1. **Live Monitor & Player:**
   - While `GENERATING`:
     - Show 4-stage progress bar: `Queued` → `Creating` → `Upload` → `Draft`.
     - Real-time stage display (e.g., *"Rendering scene 2 voiceover..."*) with progress percentage.
   - When `READY` / `POSTED`:
     - **Video**: Responsive HTML5 `<video>` player with custom controls, looping, time scrubber, and sound toggle.
     - **Carousel**: Interactive multi-card swipeable slider with dot indicators.
     - **Image**: High-resolution zoomable viewer.

2. **Action Bar & Hot-Path Recovery:**
   - `Fix & Reschedule`: Opens diagnostic modal allowing immediate channel/caption/time adjustments without re-rendering.
   - `Send to Approvals`: Pushes post to organizational review queue.
   - `Regenerate with Reference`: Preserves original prompt, attaches current result or new reference, and resubmits to worker queue.
   - `Download Media`: Direct download of rendered MP4/PNG.

3. **Failure Diagnostic Report Modal:**
   - Displays humanized error reason (e.g., *"A selected account does not support 9:16 vertical video"*).
   - Channel compatibility matrix (Green check / Red alert).
   - Expandable raw error stack and local worker log path.
   - One-click `Fix & Reschedule / Publish Now` action.

---

### PART 4: CENTRAL BACKEND API CONTRACT

Secure all machine endpoints with timing-safe comparison (`crypto.timingSafeEqual`) against pre-shared keys:
- `X-Worker-Key`: Authenticates Remote PC worker daemon.
- `X-Automation-Key`: Authenticates n8n dispatch & webhooks.

#### Endpoints:
1. `GET /api/v1/creator/jobs` - List jobs filtered by `brandId` and `status`.
2. `POST /api/v1/creator/jobs` - Queue new creation job for remote worker.
3. `POST /api/v1/creator/jobs/:id/fix-reschedule` - **Hot-Path Recovery**: Updates destination channels, caption, or schedule and triggers instant publish without re-rendering.
4. `POST /api/v1/creator/jobs/:id/regenerate` - Resubmits job with modified prompt/reference.
5. `POST /api/v1/machine/worker/claim` - Remote worker polls and claims oldest `QUEUED` job (returns job payload + `leaseToken`).
6. `POST /api/v1/machine/worker/progress` - Updates stage text & percentage.
7. `POST /api/v1/machine/worker/heartbeat` - Extends `leaseUntil` by 2 minutes.
8. `PUT /api/v1/machine/worker/upload/:id` - Streams finished MP4/PNG binary, validates SHA-256 and MIME magic bytes, saves to storage, and sets status to `READY`.
9. `POST /api/v1/machine/worker/fail` - Marks job as `FAILED` with detailed error reason.
10. `POST /api/v1/machine/worker/discover` - Allows remote PC to register an offline rendered video from a local folder and upload it directly.

---

### PART 5: REMOTE PC WORKER DAEMON (Complete Production Script)

Run this persistent Node.js/TypeScript daemon on the Remote GPU PC (`remote-worker.ts`):

```typescript
import axios from 'axios';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const CENTRAL_API = process.env.CENTRAL_API_URL || 'https://360.webtrionix.com/api/v1/machine';
const WORKER_KEY = process.env.ANTIGRAVITY_WORKER_KEY!;
const WORKER_ID = process.env.WORKER_ID || `gpu-rig-${crypto.randomBytes(4).toString('hex')}`;
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
    if (err.response?.status !== 204) console.error('[Claim Error]:', err.response?.data || err.message);
    return null;
  }
}

async function sendProgress(jobId: string, leaseToken: string, stage: string, percent: number) {
  try {
    await api.post('/worker/progress', { jobId, leaseToken, stage, progressPercent: percent });
  } catch (err: any) {
    console.warn('[Progress Error]:', err.message);
  }
}

async function sendHeartbeat(jobId: string, leaseToken: string) {
  try {
    await api.post('/worker/heartbeat', { jobId, leaseToken });
  } catch (err: any) {
    console.warn('[Heartbeat Error]:', err.message);
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
 * Execute Local Antigravity GPU Generation Pipeline
 */
async function executeAntigravityGeneration(job: any): Promise<string> {
  const input = JSON.parse(job.inputJson || '{}');
  const format = input.kind || 'video';
  const prompt = job.prompt || input.title || 'Creative Video';
  const outputPath = path.join(OUTPUT_DIR, `${job.id}.${format === 'post' ? 'png' : 'mp4'}`);

  console.log(`[Antigravity] Starting rendering for Job ${job.id} (${format})...`);

  // Local CLI / Python rendering execution
  const safePrompt = prompt.replace(/"/g, '\\"');
  const command = `antigravity-cli render --id "${job.id}" --prompt "${safePrompt}" --output "${outputPath}"`;

  const { stdout } = await execAsync(command);
  console.log('[CLI Output]:', stdout);

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Generation finished but output file was not found at ${outputPath}`);
  }

  return outputPath;
}

/**
 * Main Continuous Polling Loop
 */
async function startWorker() {
  console.log(`[Worker Daemon] Antigravity GPU Worker started. ID: ${WORKER_ID}`);
  setInterval(ping, 60000);
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
      console.error('[Worker Loop Error]:', err.message);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

startWorker();
```

---

### PART 6: N8N WORKFLOW SPECIFICATION & MULTI-PLATFORM POSTING

Connect n8n (either on the Remote PC or cloud) as the orchestration and multi-platform publishing engine:

1. **Dispatch Workflow (`/webhook/antigravity/dispatch`):**
   - Webhook triggered by Central API when a new job is created.
   - Awakens the remote PC GPU worker and signals `POST /api/v1/machine/dispatch`.

2. **Publishing Workflow (`/webhook/ci360/publish-now`):**
   - Triggered when a video is scheduled or directly published.
   - Receives the permanent cloud media URL (`https://360.webtrionix.com/uploads/:id.mp4`), caption, and channel IDs.
   - Branching nodes:
     - **Instagram Reel**: Uploads to Meta Graph API Container (`/media?media_type=REELS`), polls status until `READY`, and triggers publish (`/media_publish`).
     - **Facebook Page Video**: Uploads to `/{page-id}/videos`.
     - **YouTube Shorts**: Uploads chunked binary to YouTube Data API v3 with `#Shorts`.
     - **LinkedIn Video**: Initializes asset upload, streams file, and creates post.
   - Callback Node: Reports live published URLs back to Central Cloud API `POST /api/v1/integrations/n8n/callback`.

---

### PART 7: RESILIENCY & "FIX & RESCHEDULE" LOGIC

If a job fails at publishing time (e.g. invalid Instagram token or temporary API downtime), the media rendered by the remote GPU is **preserved intact**. 

When the user clicks **"Fix & Reschedule"**:
1. Frontend submits new channels, schedule time, or caption to `POST /api/v1/creator/jobs/:id/fix-reschedule`.
2. Backend verifies `fileUrl` and `fileSha256` already exist.
3. If valid, backend updates channels and immediately re-triggers publishing (or schedules it) **without re-running the expensive AI generation on the remote GPU**.

---

### PART 8: ENVIRONMENT CONFIGURATION

#### Central Cloud Server (`.env`):
```env
PORT=3000
PUBLIC_BASE_URL="https://360.webtrionix.com"
UPLOADS_DIRECTORY="/var/www/webtrionix/uploads"
ANTIGRAVITY_N8N_KEY="minimum_32_char_secure_n8n_automation_key"
ANTIGRAVITY_WORKER_KEY="minimum_32_char_secure_remote_worker_key"
ANTIGRAVITY_DISPATCH_URL="https://n8n.webtrionix.com/webhook/antigravity/dispatch"
ANTIGRAVITY_MAX_UPLOAD_BYTES=524288000
```

#### Remote GPU PC (`.env`):
```env
CENTRAL_API_URL="https://360.webtrionix.com/api/v1/machine"
ANTIGRAVITY_WORKER_KEY="minimum_32_char_secure_remote_worker_key"
WORKER_ID="remote-gpu-rig-01"
POLL_INTERVAL_MS=5000
LOCAL_OUTPUT_DIR="C:\\Antigravity_Outputs"
```

---

### PART 9: VERIFICATION & COMPLETION CHECKLIST

- [ ] Central DB migration for `CreatorJob` schema and status enums.
- [ ] Split-view Creator Studio UI with tab switcher (`h-14` to `h-16`).
- [ ] Live preview HTML5 player with real-time stage progress indicator.
- [ ] "Fix & Reschedule" modal preserving already rendered media.
- [ ] Failure diagnostic inspector displaying error details & channel compatibility.
- [ ] Remote PC Node.js worker daemon with heartbeat, lease renewal, and binary upload.
- [ ] n8n webhook dispatch and multi-platform publishing flows.
- [ ] End-to-end integration test: Web submit -> Remote GPU render -> Upload -> Live Preview -> Social Publish.
```
