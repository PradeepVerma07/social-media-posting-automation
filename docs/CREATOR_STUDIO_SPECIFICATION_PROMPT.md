# Production System Specification & Implementation Prompt: Creator Studio Module

> **How to use this document:**  
> Copy and paste the section below titled **`=== MASTER PROMPT FOR AI CODING ASSISTANT / SOFTWARE TEAM ===`** directly into Cursor, Claude Code, ChatGPT, Devin, or provide it to a senior engineering team. It contains complete, end-to-end instructions, data schemas, API contracts, UX specs, worker protocols, and error-recovery logic to build the entire **Creator Studio Module** from scratch on any modern tech stack.

---

```markdown
=== MASTER PROMPT FOR AI CODING ASSISTANT / SOFTWARE TEAM ===

You are an expert Principal Full-Stack Architect and Systems Engineer. Your objective is to build a production-grade, enterprise-ready **"Creator Studio" (AI-Powered Multi-Format Content Creation & Publishing Engine)** module for a social media automation SaaS platform.

This module allows brand managers and content creators to generate, preview, customize, approve, reschedule, and cross-publish AI-generated social media content (Reels/Shorts, 24h Stories, Single Feed Posts, and Multi-Slide Carousels) across Instagram, Facebook, YouTube, LinkedIn, X (Twitter), and TikTok.

---

### 1. HIGH-LEVEL ARCHITECTURE & CORE WORKFLOWS

The Creator Studio module consists of four primary subsystems:
1. **Interactive Creator Frontend (UI/UX):** Split-view workspace with dynamic format switching, AI prompt engineering forms, live preview player, failure diagnostics, and a multi-slide carousel builder.
2. **REST API & Job Coordinator Backend:** Job lifecycle management, lease handling, media storage orchestration, and social account targeting.
3. **Decoupled Asynchronous Worker Daemon (GPU/AI Renderer):** Distributed workers that poll for pending generation jobs, claim them with lease timeouts, execute AI rendering (video, audio TTS, images), and stream logs and artifacts back to the coordinator.
4. **Resilience & Governance Engine:** Human-in-the-loop approval workflows, instant failure diagnostic inspector, and "Fix & Reschedule" hot-path recovery (which updates destination channels and schedules without re-running expensive AI generation).

---

### 2. DATABASE SCHEMA SPECIFICATION

Implement the following entities (SQL / Prisma / TypeORM / MongoDB equivalent):

```prisma
enum ContentFormat {
  REEL_SHORT    // 9:16 Vertical Video (up to 90s)
  STORY_24H     // 9:16 Ephemeral Story (15s video or image)
  FEED_POST     // 1:1 or 4:5 Single Image Post
  CAROUSEL_POST // 2 to 10 swipeable slides (images/cards)
}

enum JobStatus {
  QUEUED                // Waiting for an available worker daemon
  GENERATING            // Worker actively rendering visual/audio assets
  READY                 // Media generated; awaiting schedule setup
  READY_FOR_SCHEDULING  // Schedule set; waiting for final manager sign-off
  AWAITING_APPROVAL     // In formal approval queue
  SCHEDULED             // Confirmed and queued in cron/publishing scheduler
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
  
  // Script & Creative Brief
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

  // Worker Claim & Heartbeat Tracking
  workerId          String?
  workerLeaseUntil  DateTime?
  lastStage         String?        // e.g., "Synthesizing voiceover", "Rendering scenes"
  progressPercent   Int            @default(0)

  // Media Artifacts
  mediaUrl          String?        // Output MP4/MOV/PNG/JPG URL
  thumbnailUrl      String?        // Video poster or carousel cover
  mediaMetadata     Json?          // Resolution, bitrate, duration, file size

  // Publishing & Scheduling
  targetChannelIds  String[]       // Foreign keys to connected social accounts
  scheduledFor      DateTime?      // ISO-8601 publication timestamp
  directPublish     Boolean        @default(false) // Auto-publish without approval if brand allows

  // Error Handling & Recovery
  failureReason     String?        // User-friendly error message
  failureDetails    Json?          // Stack trace, raw API error, failed channel IDs
  localLogPath      String?        // Path or URL to detailed execution log

  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@index([brandId, status])
  @@index([status, workerLeaseUntil])
}
```

---

### 3. FRONTEND UI/UX SPECIFICATIONS (Split-Screen Layout)

Construct a responsive, split-screen UI (Left: Input & Configuration Panel | Right: Live Preview & Diagnostics Panel).

#### Left Panel: Dynamic Generation Controls
1. **Content Format Switcher Tabs (Height: 56px–64px / `h-14` to `h-16`):**
   - Options:
     - 🎬 **Reel / Short** (9:16 vertical video)
     - ⏱️ **24h Story** (9:16 ephemeral story)
     - 🖼️ **Feed Post** (1:1 / 4:5 single visual)
     - 📚 **Carousel Post** (Multi-slide swipeable card set)
   - Ensure clear visual active states (highlighted pill with drop shadow, subtle borders). Each tab must have exactly one clean, crisp icon + label.

2. **Brand Selector:**
   - Dropdown with brand identity, logo, and active social channel badges.

3. **Title & Storyboard Prompt Textareas:**
   - Working Title (`input`, max 120 chars).
   - Detailed Script / Storyboard Prompt (`textarea`, min-height 180px–220px): Clearly labeled as *"AI generation prompt (not published to viewers)"*.
   - Caption Guidance / Post Copy (`textarea`, min-height 120px): Labeled as *"Post Caption (Appears live on Instagram, Facebook & channels)"*, with emoji picker and character counter.

4. **Dynamic Format-Specific Inputs:**
   - When **Reel/Short** or **24h Story** is selected:
     - Format selector (`9:16`, `16:9`, `1:1`).
     - Video length slider (15s, 30s, 60s, 90s).
     - Language dropdown (English, Spanish, Hindi, French, German, etc.).
   - When **Feed Post** is selected:
     - Aspect ratio selector (`1:1 Square`, `4:5 Portrait`, `16:9 Landscape`).
     - Image style preset (Photorealistic, Vector Graphic, 3D Render, Editorial).
   - When **Carousel Post** is selected:
     - Multi-Slide Builder: Interactive list of slides (up to 10).
     - Add Slide (`+ Add Slide`), Delete Slide, and Reorder (drag & drop).
     - Per-slide text input + optional individual reference image upload.

5. **Reference Image & Regeneration Controls:**
   - Drag-and-drop reference image uploader for style transfer or product placement.
   - Textbox for specific regeneration guidance (*"Keep actor, change background to office"*).

6. **Destination Channels & Publishing Modes:**
   - Channel Multi-Select Checkboxes (Auto-populated with accounts linked to the active brand: Instagram, Facebook Page, YouTube Shorts, LinkedIn, etc.).
   - Action Buttons:
     - `Create Video / Generate Post` (Primary button).
     - `Direct Publish & Schedule` (Schedules directly without separate draft step if user has admin/publisher role).

---

#### Right Panel: Live Preview, Diagnostics & Job History
1. **Active Job Monitor & Live Player:**
   - When `GENERATING`:
     - Show animated progress bar (`Queued` → `Creating` → `Upload` → `Draft`).
     - Display `lastStage` status message (e.g., *"Generating scene 2 voiceover..."*) with relative timestamp.
   - When `READY` / `POSTED`:
     - For Videos: Custom HTML5 `<video>` player with loop, mute/unmute, fullscreen, and time scrubber.
     - For Carousels: Interactive swipeable/carousel slider with slide indicators (dots) and next/prev buttons.
     - For Single Posts: High-resolution zoomable image preview.

2. **Action Bar (Post-Generation):**
   - `Fix & Reschedule`: Opens diagnostic modal allowing immediate channel/caption/time adjustments.
   - `Send to Approvals`: Pushes post to organizational review queue.
   - `Regenerate with Reference`: Preserves original prompt, attaches current result or new uploaded reference, and submits a refined job.
   - `Download Media`: Direct download of rendered MP4/PNG.

3. **Failure Diagnostic Report Modal:**
   - Triggered when job enters `FAILED` status or creator clicks "View Failure Report".
   - Shows:
     - Exact Failure Code & Humanized Reason (e.g., *"A selected account does not support 9:16 vertical video"* or *"Meta token expired"*).
     - Target Channel compatibility matrix (Green checkmark for compatible channels, Red warning for incompatible ones).
     - Local log path and raw trace expandable accordion.
     - One-click `Fix & Reschedule / Publish Now` button.

---

### 4. WORKER PROTOCOL & RENDERING DAEMON ARCHITECTURE

Workers operate as stateless, horizontally scalable consumers that communicate with the central API via HTTP or WebSocket:

```
[ Central API Coordinator ]
      ^                 |
 1. Poll / Claim  2. Grant Lease (Token)
      |                 v
 [ Distributed Rendering Worker Daemon (GPU / AI Engine) ]
      |
 3. Heartbeat & Stage Updates (PUT /api/v1/creator/jobs/:id/heartbeat)
 4. AI Generation (LLM script -> TTS audio -> Image/Video rendering)
 5. Upload Rendered Artifacts (POST /api/v1/creator/worker/upload/:id)
```

#### Worker API Endpoints to Implement:
1. `POST /api/v1/creator/worker/claim`
   - Worker sends `workerId` and supported formats (`video`, `image`, `carousel`).
   - Server claims the oldest `QUEUED` job using atomic row-level locking (`FOR UPDATE SKIP LOCKED`) and sets `workerLeaseUntil = now() + 5 minutes`.
   - Returns the full job payload or `204 No Content`.

2. `PUT /api/v1/creator/worker/jobs/:id/heartbeat`
   - Worker sends progress updates: `{ progressPercent: 45, stage: "Stitching MP4 chunks" }`.
   - Server extends `workerLeaseUntil` by another 5 minutes.
   - If worker crashes, server cron resets expired jobs (`workerLeaseUntil < now()`) back to `QUEUED` or marks them `FAILED` after 3 retries.

3. `POST /api/v1/creator/worker/upload/:id`
   - Multipart streaming upload for the finished media file (`video/mp4` or image).
   - Backend saves to S3/Cloud Storage/Local Static Storage, updates `mediaUrl`, `status = 'READY'`, and logs completion.

---

### 5. RESILIENCE: "FIX & RESCHEDULE" HOT-PATH WORKFLOW

**Crucial Production Requirement:** When a video generation finishes successfully but fails during channel publishing (e.g., due to an expired Facebook token, invalid Instagram permissions, or rate limits), **NEVER force the user to re-render the video from scratch**.

Implement the dedicated endpoint:
`POST /api/v1/creator/jobs/:id/fix-reschedule`

**Request Payload:**
```json
{
  "targetChannelIds": ["channel-id-instagram-verified"],
  "scheduledFor": "2026-11-14T10:00:00.000Z",
  "publishDirectly": true,
  "caption": "Updated caption if user edited it"
}
```

**Controller Logic:**
1. Retrieve existing `CreatorJob` by `:id`.
2. Verify that `mediaUrl` already exists on disk or storage.
3. If `mediaUrl` is present:
   - Update `targetChannelIds`, `captionGuidance`, and `scheduledFor`.
   - If `publishDirectly == true`:
     - Validate channel permissions.
     - Call social publisher immediately.
     - Update job status to `POSTED` (or `SCHEDULED` if future date).
   - If `publishDirectly == false`:
     - Update status to `READY_FOR_SCHEDULING` or `AWAITING_APPROVAL`.
4. Return updated job object with `200 OK`.

---

### 6. COMPLETE API ENDPOINTS CONTRACT

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/creator/jobs` | Query jobs by `brandId`, `format`, `status` with pagination |
| `POST` | `/api/v1/creator/jobs` | Create new creation job (queues for worker) |
| `GET` | `/api/v1/creator/jobs/:id` | Fetch complete job details with logs and media |
| `POST` | `/api/v1/creator/jobs/:id/fix-reschedule` | Update targets/schedule and re-trigger publishing without re-rendering |
| `POST` | `/api/v1/creator/jobs/:id/regenerate` | Queue regeneration with new reference image or refined prompt |
| `DELETE` | `/api/v1/creator/jobs/:id` | Move job to trash / soft delete |
| `POST` | `/api/v1/creator/worker/claim` | Worker poll & claim endpoint |
| `PUT` | `/api/v1/creator/worker/jobs/:id/heartbeat` | Worker progress heartbeat |
| `POST` | `/api/v1/creator/worker/upload/:id` | Worker media binary upload |

---

### 7. IMPLEMENTATION CHECKLIST

- [ ] Database migration for `CreatorJob` and `ContentFormat` enum.
- [ ] Responsive split-screen UI layout in React/Tailwind.
- [ ] Tab switcher for Reel/Short, 24h Story, Feed Post, Carousel Post (`h-14` to `h-16`).
- [ ] Multi-slide carousel creation sub-form.
- [ ] Dynamic reference-image upload and regeneration text notes.
- [ ] HTML5 video player and swipeable carousel preview.
- [ ] Asynchronous worker claim, heartbeat, and upload routes.
- [ ] "Fix & Reschedule" recovery dialog and API handler.
- [ ] Failure diagnostic modal displaying root cause and channel compatibility.
- [ ] End-to-end automated unit & integration test suite.
```
