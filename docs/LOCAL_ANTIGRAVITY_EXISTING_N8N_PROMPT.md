# Master Prompt: Local Antigravity & Existing n8n Video Generation Integration

> **How to use this document:**  
> Copy and paste the block below directly into your AI coding tool, script runner, or Antigravity daemon. It connects your local computer's video files and local Antigravity generator to your software's create prompt using your **existing `n8n.webtrionix.com` setup without creating any new workflows in n8n**.

---

```markdown
=== MASTER PROMPT: LOCAL COMPUTER ANTIGRAVITY & EXISTING N8N INTEGRATION ===

You are an expert AI Automation and Media Pipeline Engineer. Your task is to connect a **Local Computer (running Antigravity AI & holding local video files)** directly to the existing **Webtrionix 360 Software (`https://360.webtrionix.com`)** and the **existing `n8n.webtrionix.com` instance**, with **ZERO new workflows added to n8n**.

---

### 1. CORE ARCHITECTURAL RULE: NO NEW N8N WORKFLOWS
- Your existing `n8n.webtrionix.com` already has the standard social publishing webhook (`POST /webhook/ci360/publish-now`).
- **DO NOT create or require any new dispatch workflows in n8n.**
- Instead, the local computer Antigravity daemon communicates directly with the software's backend machine endpoints via secure polling and direct binary streaming. Once the video is ready, the existing n8n publishing pipeline handles the social distribution automatically.

---

### 2. THE TWO LOCAL GENERATION MODES IN THE SAME CREATE PROMPT

In the software's existing Creator Studio prompt, users can create videos in two ways:

#### Mode 1: Local Computer Video File (Direct Local Media)
- The user has a pre-recorded or pre-rendered video file (`.mp4`, `.mov`) on their computer.
- The file is attached directly in the create prompt via `POST /api/v1/upload` (returns `https://360.webtrionix.com/uploads/<filename>.mp4`).
- The job is created with `fileUrl: <uploadedUrl>`, immediately setting `status = 'READY'` in the software.
- The existing `n8n.webtrionix.com` workflow (`/webhook/ci360/publish-now`) automatically receives this public video URL when scheduled or published.

#### Mode 2: Local Antigravity AI Video Generator (Local PC GPU)
- The user enters a storyboard prompt, script, language, and duration (9:16) in the create prompt.
- The software creates a job in `status = 'QUEUED'`.
- The **Local Antigravity Daemon** running on the computer claims the job via `POST /api/v1/machine/worker/claim`.
- Local Antigravity generates the video file on your computer (local LLM script -> local TTS audio -> local GPU visual diffusion/FFmpeg).
- The daemon streams the finished `.mp4` to `PUT /api/v1/machine/worker/upload/:id`.
- The video appears instantly in the software's live preview player, ready for existing n8n publishing.

---

### 3. COMPLETE LOCAL ANTIGRAVITY WORKER DAEMON SCRIPT

Save and run this script (`local-antigravity-worker.ts`) on the computer where Antigravity is installed:

```typescript
import axios from 'axios';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// Configuration - Connects directly to existing backend
const SERVER_URL = process.env.CENTRAL_API_URL || 'https://360.webtrionix.com/api/v1/machine';
const WORKER_KEY = process.env.ANTIGRAVITY_WORKER_KEY!;
const WORKER_ID = process.env.WORKER_ID || `local-pc-${crypto.randomBytes(3).toString('hex')}`;
const OUTPUT_DIR = path.resolve(process.env.LOCAL_VIDEO_DIR || './local_antigravity_videos');
const POLL_INTERVAL_MS = 5000;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const api = axios.create({
  baseURL: SERVER_URL,
  headers: {
    'X-Worker-Key': WORKER_KEY,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// 1. Register Local Computer as Online in Software
async function ping() {
  try {
    await api.post('/worker/ping', { workerId: WORKER_ID, cliReady: true });
  } catch (err: any) {
    console.error('[Ping Error]:', err.message);
  }
}

// 2. Poll and Claim Queued Generation Jobs (No n8n dispatch required)
async function claimNextJob() {
  try {
    const { data } = await api.post('/worker/claim', { workerId: WORKER_ID });
    return data?.job || null;
  } catch (err: any) {
    if (err.response?.status !== 204) {
      console.error('[Claim Check]:', err.response?.data?.error || err.message);
    }
    return null;
  }
}

// 3. Send Real-Time Progress to Software Preview
async function updateProgress(jobId: string, leaseToken: string, stage: string, percent: number) {
  try {
    await api.post('/worker/progress', { jobId, leaseToken, stage, progressPercent: percent });
  } catch (err: any) {
    console.warn('[Progress Update]:', err.message);
  }
}

// 4. Keep Lease Alive During Heavy Local GPU Rendering
async function sendHeartbeat(jobId: string, leaseToken: string) {
  try {
    await api.post('/worker/heartbeat', { jobId, leaseToken });
  } catch (err: any) {
    console.warn('[Heartbeat]:', err.message);
  }
}

// 5. Upload Finished Local Video File to Server Storage
async function uploadLocalVideo(jobId: string, leaseToken: string, filePath: string) {
  const fileBuffer = fs.readFileSync(filePath);
  const sha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

  await api.put(`/worker/upload/${jobId}`, fileBuffer, {
    headers: {
      'X-Job-Lease': leaseToken,
      'X-Content-SHA256': sha256,
      'Content-Type': 'video/mp4',
      'Content-Length': fileBuffer.length,
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
}

// 6. Execute Local Antigravity Video Generation Command
async function renderWithLocalAntigravity(job: any): Promise<string> {
  const input = JSON.parse(job.inputJson || '{}');
  const duration = input.durationSeconds || 30;
  const prompt = job.prompt || input.title || 'Social Video';
  const localOutputFile = path.join(OUTPUT_DIR, `${job.id}.mp4`);

  console.log(`[Antigravity Local] Rendering 9:16 Video (${duration}s) for Job ${job.id}...`);

  // Local CLI generation call using local PC GPU / models
  const safePrompt = prompt.replace(/"/g, '\\"');
  const cmd = `antigravity-cli video --prompt "${safePrompt}" --duration ${duration} --aspect "9:16" --output "${localOutputFile}"`;

  const { stdout } = await execAsync(cmd);
  console.log('[Antigravity Output]:', stdout);

  if (!fs.existsSync(localOutputFile)) {
    throw new Error(`Local render completed but file not found at: ${localOutputFile}`);
  }

  return localOutputFile;
}

// 7. Main Daemon Loop
async function startDaemon() {
  console.log(`[Antigravity Local Worker] Running on PC. Worker ID: ${WORKER_ID}`);
  setInterval(ping, 60000);
  await ping();

  while (true) {
    try {
      const job = await claimNextJob();
      if (!job) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }

      console.log(`[Antigravity Local] Claimed Job ${job.id}. Starting local render...`);
      const lease = job.leaseToken;
      const heartbeatTimer = setInterval(() => sendHeartbeat(job.id, lease), 30000);

      try {
        await updateProgress(job.id, lease, 'Processing creative brief on local computer', 20);
        await updateProgress(job.id, lease, 'Generating local TTS voiceover & rendering scenes', 50);

        const localVideoPath = await renderWithLocalAntigravity(job);

        await updateProgress(job.id, lease, 'Uploading local video file to storage', 85);
        await uploadLocalVideo(job.id, lease, localVideoPath);

        console.log(`[Antigravity Local] Job ${job.id} rendered and uploaded successfully!`);
      } catch (err: any) {
        console.error(`[Antigravity Local] Job ${job.id} failed:`, err.message);
        await api.post('/worker/fail', { jobId: job.id, leaseToken: lease, error: err.message }).catch(() => {});
      } finally {
        clearInterval(heartbeatTimer);
      }
    } catch (loopErr: any) {
      console.error('[Daemon Loop Error]:', loopErr.message);
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
}

startDaemon();
```

---

### 4. LOCAL FOLDER WATCHER (For Pre-Existing Local Video Files)

If you already have pre-made video files on your computer and want to auto-sync them to the software:

```typescript
// Watches local directory for new .mp4 files and syncs to software:
fs.watch(OUTPUT_DIR, async (eventType, filename) => {
  if (eventType === 'rename' && filename?.endsWith('.mp4')) {
    const fullPath = path.join(OUTPUT_DIR, filename);
    if (!fs.existsSync(fullPath)) return;
    
    // Wait for file write to complete
    await new Promise(r => setTimeout(r, 2000));
    
    const bytes = fs.readFileSync(fullPath);
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    
    // Register file with software
    const { data } = await api.post('/worker/discover', { filename, sha256 });
    if (data.leaseToken && !data.alreadyStored) {
      await uploadLocalVideo(data.job.id, data.leaseToken, fullPath);
      console.log(`[Folder Sync] Uploaded local file: ${filename}`);
    }
  }
});
```

---

### 5. LOCAL PC ENVIRONMENT SETUP (`.env`)

Save this `.env` file on your local computer in the same folder as `local-antigravity-worker.ts`:

```env
CENTRAL_API_URL="https://360.webtrionix.com/api/v1/machine"
ANTIGRAVITY_WORKER_KEY="your_configured_worker_key_min_32_chars"
WORKER_ID="local-pc-antigravity-01"
LOCAL_VIDEO_DIR="C:\\Local_Videos"
```

---

### 6. HOW EXISTING N8N PUBLISHES THE VIDEO (NO NEW WORKFLOW NEEDED)

Once the local video file is uploaded:
1. The video immediately shows in the software's Creator Studio preview at:
   `https://360.webtrionix.com/uploads/<jobId>.mp4`
2. When the user sets the schedule and approves the post, the software sends the existing webhook dispatch to `n8n.webtrionix.com`:
   - URL: `https://n8n.webtrionix.com/webhook/ci360/publish-now`
   - Payload:
     ```json
     {
       "postId": "post-123",
       "data": {
         "mediaUrls": ["https://360.webtrionix.com/uploads/<jobId>.mp4"],
         "caption": "Your generated caption #trending",
         "platforms": ["instagram", "facebook"]
       }
     }
     ```
3. Your existing n8n workflow executes and publishes the video to Instagram/Facebook without any workflow changes!
```
