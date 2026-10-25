import { Workflow } from '../types/workflow';

export const WORKFLOW_TEMPLATES: Workflow[] = [
  {
    "id": "tpl-main-scheduler",
    "name": "Social Media Automation Hub - Main Scheduler & Multi-Brand Auto-Publisher",
    "active": true,
    "updatedAt": "2026-10-23T15:26:32.875Z",
    "nodes": [
      {
        "id": "node-1",
        "name": "Schedule Trigger (Every 5 Min)",
        "type": "schedule",
        "position": [
          200,
          400
        ],
        "parameters": {
          "rule": {
            "interval": [
              {
                "field": "minutes",
                "minutesInterval": 5
              }
            ]
          }
        },
        "status": "idle"
      },
      {
        "id": "node-2",
        "name": "Sheet - Read Settings",
        "type": "httpRequest",
        "position": [
          420,
          400
        ],
        "parameters": {
          "operation": "read",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Settings",
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-3",
        "name": "Parse Settings Config",
        "type": "code",
        "position": [
          640,
          400
        ],
        "parameters": {
          "jsCode": "// Parse Settings key-value pairs into a global config object\nconst items = $input.all();\nconst config = {\n  max_retries: 3,\n  retry_delay_minutes: 15,\n  poll_interval_minutes: 5,\n  missed_window_hours: 24,\n  alert_email: 'ops-alerts@agency.internal',\n  slack_webhook: '',\n  rate_limit_wait_seconds: 2,\n};\n\nfor (const item of items) {\n  const row = item.json;\n  if (row.key && row.value !== undefined) {\n    const key = String(row.key).trim();\n    const val = String(row.value).trim();\n    if (['max_retries', 'retry_delay_minutes', 'poll_interval_minutes', 'missed_window_hours', 'rate_limit_wait_seconds'].includes(key)) {\n      config[key] = parseInt(val, 10) || config[key];\n    } else {\n      config[key] = val;\n    }\n  }\n}\n\nreturn [{ json: { config } }];"
        },
        "status": "idle"
      },
      {
        "id": "node-4",
        "name": "Sheet - Read Posts",
        "type": "httpRequest",
        "position": [
          860,
          260
        ],
        "parameters": {
          "operation": "read",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Posts",
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-5",
        "name": "Sheet - Read Brands",
        "type": "httpRequest",
        "position": [
          860,
          400
        ],
        "parameters": {
          "operation": "read",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Brands",
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-6",
        "name": "Sheet - Read Clients",
        "type": "httpRequest",
        "position": [
          860,
          540
        ],
        "parameters": {
          "operation": "read",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Clients",
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-7",
        "name": "Sheet - Read Social Accounts",
        "type": "httpRequest",
        "position": [
          860,
          680
        ],
        "parameters": {
          "operation": "read",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Social_Accounts",
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-8",
        "name": "Timezone Converter & Due Filter",
        "type": "code",
        "position": [
          1100,
          400
        ],
        "parameters": {
          "jsCode": "// Code Node: Timezone Conversion, Due Window Filter, and Table Merging\nconst { DateTime, IANAZone } = require('luxon');\n\nconst config = $('Parse Settings Config').first().json.config;\nconst postItems = $('Sheet - Read Posts').all().map(i => i.json);\nconst brandItems = $('Sheet - Read Brands').all().map(i => i.json);\nconst clientItems = $('Sheet - Read Clients').all().map(i => i.json);\nconst accountItems = $('Sheet - Read Social Accounts').all().map(i => i.json);\n\n// Index reference tables for O(1) lookup\nconst brandMap = new Map();\nbrandItems.forEach(b => brandMap.set(String(b.brand_id), b));\n\nconst clientMap = new Map();\nclientItems.forEach(c => clientMap.set(String(c.client_id), c));\n\nconst accountMap = new Map();\naccountItems.forEach(a => {\n  const key = `${a.brand_id}_${String(a.platform).toLowerCase()}`;\n  accountMap.set(key, a);\n});\n\nconst nowUtc = DateTime.utc();\nconst missedWindowHours = config.missed_window_hours || 24;\nconst missedThresholdUtc = nowUtc.minus({ hours: missedWindowHours });\nconst maxRetries = config.max_retries || 3;\nconst retryDelayMinutes = config.retry_delay_minutes || 15;\n\nconst duePosts = [];\nconst skippedPosts = [];\nconst invalidPosts = [];\n\nfor (const post of postItems) {\n  const status = String(post.status || '').trim();\n  const attemptCount = parseInt(post.attempt_count || '0', 10);\n\n  // Filter criteria: Status must be Scheduled OR (Retrying with attemptCount < maxRetries)\n  if (status !== 'Scheduled' && status !== 'Retrying') {\n    continue;\n  }\n  if (status === 'Retrying' && attemptCount >= maxRetries) {\n    continue;\n  }\n\n  // If retrying, enforce cooldown delay\n  if (status === 'Retrying' && post.last_attempt_at) {\n    const lastAttempt = DateTime.fromISO(post.last_attempt_at, { zone: 'utc' });\n    if (lastAttempt.isValid && nowUtc.diff(lastAttempt, 'minutes').minutes < retryDelayMinutes) {\n      continue; // Cooldown still active\n    }\n  }\n\n  // Check locking: if already locked within last 10 minutes, skip to avoid double execution\n  if (post.locked_by_execution && post.updated_at) {\n    const lockTime = DateTime.fromISO(post.updated_at, { zone: 'utc' });\n    if (lockTime.isValid && nowUtc.diff(lockTime, 'minutes').minutes < 10) {\n      continue; // Active lock held\n    }\n  }\n\n  const brand = brandMap.get(String(post.brand_id));\n  const client = brand ? clientMap.get(String(brand.client_id)) : null;\n\n  // Resolve Timezone\n  let tz = String(post.timezone || '').trim();\n  if (!tz && brand && brand.default_timezone) {\n    tz = String(brand.default_timezone).trim();\n  }\n  if (!tz) {\n    tz = 'UTC';\n  }\n\n  // Validate IANA timezone\n  if (!IANAZone.isValidZone(tz)) {\n    invalidPosts.push({\n      ...post,\n      targetStatus: 'Failed',\n      errorCode: 'INVALID_TIMEZONE',\n      errorMessage: `Invalid IANA timezone specifier: \"${tz}\"`,\n      scheduled_utc: ''\n    });\n    continue;\n  }\n\n  // Validate and parse date & time\n  const scheduleDate = String(post.schedule_date || '').trim();\n  const scheduleTime = String(post.schedule_time || '').trim();\n  if (!scheduleDate || !scheduleTime) {\n    invalidPosts.push({\n      ...post,\n      targetStatus: 'Failed',\n      errorCode: 'INVALID_SCHEDULE_FORMAT',\n      errorMessage: 'Missing schedule_date or schedule_time in row.',\n      scheduled_utc: ''\n    });\n    continue;\n  }\n\n  const combinedStr = `${scheduleDate} ${scheduleTime}`;\n  let scheduledDt = DateTime.fromFormat(combinedStr, 'yyyy-MM-dd HH:mm', { zone: tz });\n  if (!scheduledDt.isValid) {\n    // Try secondary format with seconds\n    scheduledDt = DateTime.fromFormat(combinedStr, 'yyyy-MM-dd HH:mm:ss', { zone: tz });\n  }\n\n  if (!scheduledDt.isValid) {\n    invalidPosts.push({\n      ...post,\n      targetStatus: 'Failed',\n      errorCode: 'INVALID_SCHEDULE_FORMAT',\n      errorMessage: `Failed parsing \"${combinedStr}\" in timezone \"${tz}\": ${scheduledDt.invalidExplanation}`,\n      scheduled_utc: ''\n    });\n    continue;\n  }\n\n  const scheduledUtcIso = scheduledDt.toUTC().toISO();\n\n  // Due window filtering:\n  // If scheduled in the future -> not due yet\n  if (scheduledDt.toUTC() > nowUtc) {\n    continue;\n  }\n\n  // If scheduled earlier than missed window threshold -> Mark Skipped\n  if (scheduledDt.toUTC() < missedThresholdUtc) {\n    skippedPosts.push({\n      ...post,\n      targetStatus: 'Skipped',\n      errorCode: 'MISSED_WINDOW',\n      errorMessage: `Post scheduled for ${scheduledUtcIso} is older than ${missedWindowHours}h cutoff window.`,\n      scheduled_utc: scheduledUtcIso\n    });\n    continue;\n  }\n\n  // Relational Integrity Checks\n  if (!client || String(client.status).toLowerCase() !== 'active') {\n    invalidPosts.push({\n      ...post,\n      targetStatus: 'Failed',\n      errorCode: 'CLIENT_PAUSED',\n      errorMessage: `Client ID ${post.client_id} is Paused or non-existent.`,\n      scheduled_utc: scheduledUtcIso\n    });\n    continue;\n  }\n\n  if (!brand || String(brand.status).toLowerCase() !== 'active') {\n    invalidPosts.push({\n      ...post,\n      targetStatus: 'Failed',\n      errorCode: 'BRAND_PAUSED',\n      errorMessage: `Brand ID ${post.brand_id} (${post.brand_name}) is Paused.`,\n      scheduled_utc: scheduledUtcIso\n    });\n    continue;\n  }\n\n  const platform = String(post.platform || '').toLowerCase().trim();\n  const accountKey = `${post.brand_id}_${platform}`;\n  const account = accountMap.get(accountKey);\n\n  if (!account) {\n    invalidPosts.push({\n      ...post,\n      targetStatus: 'Failed',\n      errorCode: 'ACCOUNT_NOT_CONNECTED',\n      errorMessage: `No connected account row found in Social_Accounts for brand ${post.brand_id} on ${platform}.`,\n      scheduled_utc: scheduledUtcIso\n    });\n    continue;\n  }\n\n  if (String(account.connection_status).toLowerCase() === 'expired') {\n    invalidPosts.push({\n      ...post,\n      targetStatus: 'Failed',\n      errorCode: 'ACCOUNT_EXPIRED',\n      errorMessage: `OAuth access token for account ${account.account_handle} on ${platform} is Expired.`,\n      scheduled_utc: scheduledUtcIso\n    });\n    continue;\n  }\n\n  if (String(account.connection_status).toLowerCase() !== 'connected') {\n    invalidPosts.push({\n      ...post,\n      targetStatus: 'Failed',\n      errorCode: 'ACCOUNT_NOT_CONNECTED',\n      errorMessage: `Connection status is ${account.connection_status} for account ${account.account_handle}.`,\n      scheduled_utc: scheduledUtcIso\n    });\n    continue;\n  }\n\n  // Post is fully validated and ready for content-level platform check\n  duePosts.push({\n    ...post,\n    scheduled_utc: scheduledUtcIso,\n    timezone_resolved: tz,\n    account_handle: account.account_handle,\n    social_media_id_resolved: account.social_media_id || post.social_media_id,\n    n8n_credential_name: account.n8n_credential_name,\n    client_name: client.client_name,\n    contact_email: client.contact_email\n  });\n}\n\nreturn [\n  {\n    json: {\n      duePosts,\n      skippedPosts,\n      invalidPosts,\n      dueCount: duePosts.length,\n      skippedCount: skippedPosts.length,\n      invalidCount: invalidPosts.length,\n      executedAt: nowUtc.toISO()\n    }\n  }\n];"
        },
        "status": "idle"
      },
      {
        "id": "node-9",
        "name": "Has Due Posts?",
        "type": "if",
        "position": [
          1320,
          400
        ],
        "parameters": {
          "conditions": {
            "number": [
              {
                "value1": "={{ $json.dueCount }}",
                "operation": "larger",
                "value2": 0
              }
            ]
          }
        },
        "status": "idle"
      },
      {
        "id": "node-10",
        "name": "Unroll Due Posts",
        "type": "code",
        "position": [
          1540,
          340
        ],
        "parameters": {
          "jsCode": "// Unroll due posts for batch processing\nconst data = $input.first().json;\nreturn data.duePosts.map(post => ({ json: post }));"
        },
        "status": "idle"
      },
      {
        "id": "node-11",
        "name": "Sheet - Lock Row (Processing)",
        "type": "httpRequest",
        "position": [
          1760,
          340
        ],
        "parameters": {
          "operation": "update",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Posts",
          "columnToMatchOn": "post_id",
          "valueToMatchOn": "={{ $json.post_id }}",
          "fieldsUi": {
            "fieldValues": [
              {
                "fieldId": "status",
                "fieldValue": "Processing"
              },
              {
                "fieldId": "locked_by_execution",
                "fieldValue": "={{ $execution.id }}"
              },
              {
                "fieldId": "scheduled_utc",
                "fieldValue": "={{ $json.scheduled_utc }}"
              },
              {
                "fieldId": "last_attempt_at",
                "fieldValue": "={{ $now.toISO() }}"
              },
              {
                "fieldId": "updated_at",
                "fieldValue": "={{ $now.toISO() }}"
              }
            ]
          },
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-12",
        "name": "Validate Content Limits",
        "type": "code",
        "position": [
          1980,
          340
        ],
        "parameters": {
          "jsCode": "// Validate content limits and media requirements per platform\nconst post = $input.first().json;\nconst platform = String(post.platform || '').toLowerCase().trim();\nconst caption = String(post.caption || '');\nconst hashtags = String(post.hashtags || '');\nconst fullText = (caption + (hashtags ? ' ' + hashtags : '')).trim();\nconst mediaType = String(post.media_type || 'none').toLowerCase().trim();\nconst rawMediaUrls = String(post.media_urls || post['media_url(s)'] || '').trim();\nconst mediaUrls = rawMediaUrls ? rawMediaUrls.split(',').map(u => u.trim()).filter(Boolean) : [];\nconst postTitle = String(post.post_title || '').trim();\n\nlet isValid = true;\nlet validationError = '';\n\n// Platform-specific character and media rules\nif (platform === 'x') {\n  if (fullText.length > 280) {\n    isValid = false;\n    validationError = `X (Twitter) text limit exceeded: ${fullText.length}/280 characters.`;\n  }\n} else if (platform === 'linkedin') {\n  if (fullText.length > 3000) {\n    isValid = false;\n    validationError = `LinkedIn text limit exceeded: ${fullText.length}/3000 characters.`;\n  }\n} else if (platform === 'instagram') {\n  if (fullText.length > 2200) {\n    isValid = false;\n    validationError = `Instagram caption limit exceeded: ${fullText.length}/2200 characters.`;\n  }\n  if (mediaType === 'none' || mediaUrls.length === 0) {\n    isValid = false;\n    validationError = 'Instagram requires at least one image or video media URL.';\n  }\n  if (mediaType === 'carousel' && (mediaUrls.length < 2 || mediaUrls.length > 10)) {\n    isValid = false;\n    validationError = `Instagram carousel requires between 2 and 10 media URLs (provided ${mediaUrls.length}).`;\n  }\n} else if (platform === 'threads') {\n  if (fullText.length > 500) {\n    isValid = false;\n    validationError = `Threads text limit exceeded: ${fullText.length}/500 characters.`;\n  }\n} else if (platform === 'facebook') {\n  if (fullText.length > 5000) {\n    isValid = false;\n    validationError = `Facebook post limit exceeded: ${fullText.length}/5000 characters.`;\n  }\n} else if (platform === 'pinterest') {\n  if (fullText.length > 500) {\n    isValid = false;\n    validationError = `Pinterest description limit exceeded: ${fullText.length}/500 characters.`;\n  }\n  if (!mediaUrls.length || mediaType !== 'image') {\n    isValid = false;\n    validationError = 'Pinterest requires a valid image media URL.';\n  }\n  if (!post.social_media_id_resolved) {\n    isValid = false;\n    validationError = 'Pinterest requires board_id set in social_media_id.';\n  }\n} else if (platform === 'youtube') {\n  if (!postTitle) {\n    isValid = false;\n    validationError = 'YouTube requires post_title (video title).';\n  } else if (postTitle.length > 100) {\n    isValid = false;\n    validationError = `YouTube video title exceeds 100 characters: ${postTitle.length}/100.`;\n  }\n  if (caption.length > 5000) {\n    isValid = false;\n    validationError = `YouTube description exceeds 5000 characters: ${caption.length}/5000.`;\n  }\n  if (mediaType !== 'video' || mediaUrls.length === 0) {\n    isValid = false;\n    validationError = 'YouTube requires media_type \"video\" with a direct video download URL.';\n  }\n} else if (platform === 'tiktok') {\n  if (mediaType !== 'video' || mediaUrls.length === 0) {\n    isValid = false;\n    validationError = 'TikTok requires a video media URL.';\n  }\n}\n\nreturn [{\n  json: {\n    ...post,\n    fullText,\n    mediaUrls,\n    mediaType,\n    isValid,\n    validationError\n  }\n}];"
        },
        "status": "idle"
      },
      {
        "id": "node-13",
        "name": "Content Valid?",
        "type": "if",
        "position": [
          2200,
          340
        ],
        "parameters": {
          "conditions": {
            "boolean": [
              {
                "value1": "={{ $json.isValid }}",
                "value2": true
              }
            ]
          }
        },
        "status": "idle"
      },
      {
        "id": "node-14",
        "name": "Loop Over Posts (Batch 1)",
        "type": "httpRequest",
        "position": [
          2420,
          300
        ],
        "parameters": {
          "batchSize": 1,
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-15",
        "name": "Wait Rate Limit (2s)",
        "type": "httpRequest",
        "position": [
          2620,
          300
        ],
        "parameters": {
          "amount": 2,
          "unit": "seconds"
        },
        "status": "idle"
      },
      {
        "id": "node-16",
        "name": "Switch Platform",
        "type": "httpRequest",
        "position": [
          2840,
          300
        ],
        "parameters": {
          "rules": {
            "values": [
              {
                "value": "facebook",
                "outputKey": "facebook"
              },
              {
                "value": "instagram",
                "outputKey": "instagram"
              },
              {
                "value": "threads",
                "outputKey": "threads"
              },
              {
                "value": "linkedin",
                "outputKey": "linkedin"
              },
              {
                "value": "x",
                "outputKey": "x"
              },
              {
                "value": "youtube",
                "outputKey": "youtube"
              },
              {
                "value": "pinterest",
                "outputKey": "pinterest"
              },
              {
                "value": "tiktok",
                "outputKey": "tiktok"
              }
            ]
          },
          "value": "={{ String($json.platform).toLowerCase().trim() }}"
        },
        "status": "idle"
      },
      {
        "id": "node-17",
        "name": "HTTP - Facebook Publish",
        "type": "httpRequest",
        "position": [
          3140,
          -250
        ],
        "parameters": {
          "method": "POST",
          "url": "={{ \"https://graph.facebook.com/v21.0/\" + $json.social_media_id_resolved + ($json.media_type === \"image\" ? \"/photos\" : ($json.media_type === \"video\" ? \"/videos\" : \"/feed\")) }}",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              }
            ]
          },
          "sendBody": true,
          "bodyParameters": {
            "parameters": [
              {
                "name": "message",
                "value": "={{ $json.fullText }}"
              },
              {
                "name": "link",
                "value": "={{ $json.link_url || undefined }}"
              },
              {
                "name": "url",
                "value": "={{ $json.mediaUrls[0] || undefined }}"
              }
            ]
          },
          "options": {
            "response": {
              "response": {
                "fullResponse": true,
                "neverError": true
              }
            }
          }
        },
        "status": "idle"
      },
      {
        "id": "node-18",
        "name": "HTTP - IG Create Container",
        "type": "httpRequest",
        "position": [
          3140,
          -100
        ],
        "parameters": {
          "method": "POST",
          "url": "={{ \"https://graph.facebook.com/v21.0/\" + $json.social_media_id_resolved + \"/media\" }}",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              }
            ]
          },
          "sendBody": true,
          "bodyParameters": {
            "parameters": [
              {
                "name": "caption",
                "value": "={{ $json.fullText }}"
              },
              {
                "name": "image_url",
                "value": "={{ $json.media_type === \"image\" ? $json.mediaUrls[0] : undefined }}"
              },
              {
                "name": "video_url",
                "value": "={{ $json.media_type === \"video\" ? $json.mediaUrls[0] : undefined }}"
              },
              {
                "name": "media_type",
                "value": "={{ $json.media_type === \"video\" ? \"REELS\" : ($json.media_type === \"carousel\" ? \"CAROUSEL\" : undefined) }}"
              }
            ]
          },
          "options": {
            "response": {
              "response": {
                "fullResponse": true,
                "neverError": true
              }
            }
          }
        },
        "status": "idle"
      },
      {
        "id": "node-19",
        "name": "HTTP - IG Publish Media",
        "type": "httpRequest",
        "position": [
          3360,
          -100
        ],
        "parameters": {
          "method": "POST",
          "url": "={{ \"https://graph.facebook.com/v21.0/\" + $(\"Loop Over Posts (Batch 1)\").first().json.social_media_id_resolved + \"/media_publish\" }}",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              }
            ]
          },
          "sendBody": true,
          "bodyParameters": {
            "parameters": [
              {
                "name": "creation_id",
                "value": "={{ $json.body.id }}"
              }
            ]
          },
          "options": {
            "response": {
              "response": {
                "fullResponse": true,
                "neverError": true
              }
            }
          }
        },
        "status": "idle"
      },
      {
        "id": "node-20",
        "name": "HTTP - Threads Create Container",
        "type": "httpRequest",
        "position": [
          3140,
          50
        ],
        "parameters": {
          "method": "POST",
          "url": "={{ \"https://graph.threads.net/v1.0/\" + $json.social_media_id_resolved + \"/threads\" }}",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              }
            ]
          },
          "sendBody": true,
          "bodyParameters": {
            "parameters": [
              {
                "name": "text",
                "value": "={{ $json.fullText }}"
              },
              {
                "name": "media_type",
                "value": "={{ $json.media_type === \"image\" ? \"IMAGE\" : ($json.media_type === \"video\" ? \"VIDEO\" : \"TEXT\") }}"
              },
              {
                "name": "image_url",
                "value": "={{ $json.media_type === \"image\" ? $json.mediaUrls[0] : undefined }}"
              },
              {
                "name": "video_url",
                "value": "={{ $json.media_type === \"video\" ? $json.mediaUrls[0] : undefined }}"
              }
            ]
          },
          "options": {
            "response": {
              "response": {
                "fullResponse": true,
                "neverError": true
              }
            }
          }
        },
        "status": "idle"
      },
      {
        "id": "node-21",
        "name": "HTTP - Threads Publish",
        "type": "httpRequest",
        "position": [
          3360,
          50
        ],
        "parameters": {
          "method": "POST",
          "url": "={{ \"https://graph.threads.net/v1.0/\" + $(\"Loop Over Posts (Batch 1)\").first().json.social_media_id_resolved + \"/threads_publish\" }}",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              }
            ]
          },
          "sendBody": true,
          "bodyParameters": {
            "parameters": [
              {
                "name": "creation_id",
                "value": "={{ $json.body.id }}"
              }
            ]
          },
          "options": {
            "response": {
              "response": {
                "fullResponse": true,
                "neverError": true
              }
            }
          }
        },
        "status": "idle"
      },
      {
        "id": "node-22",
        "name": "HTTP - LinkedIn Publish",
        "type": "httpRequest",
        "position": [
          3140,
          200
        ],
        "parameters": {
          "method": "POST",
          "url": "https://api.linkedin.com/rest/posts",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              },
              {
                "name": "LinkedIn-Version",
                "value": "202401"
              },
              {
                "name": "X-Restli-Protocol-Version",
                "value": "2.0.0"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={{ JSON.stringify({ author: $json.social_media_id_resolved, commentary: $json.fullText, visibility: \"PUBLIC\", distribution: { feedDistribution: \"MAIN_FEED\", targetEntities: [], thirdPartyDistributionChannels: [] }, lifecycleState: \"PUBLISHED\", isReshareDisabledByAuthor: false }) }}",
          "options": {
            "response": {
              "response": {
                "fullResponse": true,
                "neverError": true
              }
            }
          }
        },
        "status": "idle"
      },
      {
        "id": "node-23",
        "name": "HTTP - X Post Tweet",
        "type": "httpRequest",
        "position": [
          3140,
          340
        ],
        "parameters": {
          "method": "POST",
          "url": "https://api.twitter.com/2/tweets",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={{ JSON.stringify({ text: $json.fullText }) }}",
          "options": {
            "response": {
              "response": {
                "fullResponse": true,
                "neverError": true
              }
            }
          }
        },
        "status": "idle"
      },
      {
        "id": "node-24",
        "name": "HTTP - YouTube Metadata",
        "type": "httpRequest",
        "position": [
          3140,
          480
        ],
        "parameters": {
          "method": "POST",
          "url": "https://www.googleapis.com/youtube/v3/videos?part=snippet,status",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={{ JSON.stringify({ snippet: { title: $json.post_title, description: $json.fullText, tags: ($json.hashtags || \"\").replace(/#/g, \"\").split(\" \") }, status: { privacyStatus: \"public\", selfDeclaredMadeForKids: false } }) }}",
          "options": {
            "response": {
              "response": {
                "fullResponse": true,
                "neverError": true
              }
            }
          }
        },
        "status": "idle"
      },
      {
        "id": "node-25",
        "name": "HTTP - Pinterest Create Pin",
        "type": "httpRequest",
        "position": [
          3140,
          620
        ],
        "parameters": {
          "method": "POST",
          "url": "https://api.pinterest.com/v5/pins",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={{ JSON.stringify({ board_id: $json.social_media_id_resolved, title: $json.post_title || \"New Pin\", description: $json.fullText, link: $json.link_url || undefined, media_source: { source_type: \"image_url\", url: $json.mediaUrls[0] } }) }}",
          "options": {
            "response": {
              "response": {
                "fullResponse": true,
                "neverError": true
              }
            }
          }
        },
        "status": "idle"
      },
      {
        "id": "node-26",
        "name": "HTTP - TikTok Post Init",
        "type": "httpRequest",
        "position": [
          3140,
          760
        ],
        "parameters": {
          "method": "POST",
          "url": "https://open.tiktokapis.com/v2/post/publish/video/init/",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json; charset=UTF-8"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={{ JSON.stringify({ post_info: { title: $json.fullText, privacy_level: \"PUBLIC_TO_EVERYONE\", disable_duet: false, disable_stitch: false, disable_comment: false }, source_info: { source: \"PULL_FROM_URL\", video_url: $json.mediaUrls[0] } }) }}",
          "options": {
            "response": {
              "response": {
                "fullResponse": true,
                "neverError": true
              }
            }
          }
        },
        "status": "idle"
      },
      {
        "id": "node-27",
        "name": "Normalize Platform Response",
        "type": "code",
        "position": [
          3680,
          300
        ],
        "parameters": {
          "jsCode": "// Normalize response from all platform HTTP nodes\nconst post = $('Loop Over Posts (Batch 1)').first().json;\nconst config = $('Parse Settings Config').first().json.config;\nconst platform = String(post.platform || '').toLowerCase().trim();\nconst response = $input.first() ? $input.first().json : {};\n\nconst statusCode = response.statusCode || (response.headers ? response.headers.status : 200) || 200;\nconst body = response.body || response.data || response;\nconst maxRetries = config.max_retries || 3;\nconst currentAttempt = parseInt(post.attempt_count || '0', 10) + 1;\n\nlet isSuccess = statusCode >= 200 && statusCode < 300;\nlet platformPostId = '';\nlet postUrl = '';\nlet errorCode = '';\nlet errorMessage = '';\n\n// Check platform-specific error indicators in body\nif (body.error || body.errors) {\n  isSuccess = false;\n  const errObj = body.error || (Array.isArray(body.errors) ? body.errors[0] : body.errors);\n  errorMessage = String(errObj.message || errObj.detail || JSON.stringify(errObj)).substring(0, 500);\n}\n\nif (isSuccess) {\n  if (platform === 'facebook') {\n    platformPostId = body.id || body.post_id || '';\n    postUrl = `https://facebook.com/${platformPostId}`;\n  } else if (platform === 'instagram') {\n    platformPostId = body.id || '';\n    postUrl = `https://instagram.com/p/${platformPostId}`;\n  } else if (platform === 'threads') {\n    platformPostId = body.id || '';\n    postUrl = `https://threads.net/t/${platformPostId}`;\n  } else if (platform === 'linkedin') {\n    platformPostId = body.id || (response.headers ? response.headers['x-restli-id'] : '') || '';\n    postUrl = platformPostId.includes('urn:li:share:')\n      ? `https://www.linkedin.com/feed/update/${platformPostId}`\n      : `https://www.linkedin.com/feed/update/urn:li:share:${platformPostId}`;\n  } else if (platform === 'x') {\n    platformPostId = body.data?.id || body.id || '';\n    const handle = (post.account_handle || 'user').replace('@', '');\n    postUrl = `https://x.com/${handle}/status/${platformPostId}`;\n  } else if (platform === 'youtube') {\n    platformPostId = body.id || '';\n    postUrl = `https://www.youtube.com/watch?v=${platformPostId}`;\n  } else if (platform === 'pinterest') {\n    platformPostId = body.id || '';\n    postUrl = `https://www.pinterest.com/pin/${platformPostId}`;\n  } else if (platform === 'tiktok') {\n    platformPostId = body.data?.publish_id || body.publish_id || '';\n    const handle = (post.account_handle || 'user').replace('@', '');\n    postUrl = `https://www.tiktok.com/@${handle}`;\n  }\n} else {\n  // Error Classification\n  const errStr = (errorMessage + ' ' + JSON.stringify(body)).toLowerCase();\n\n  if (statusCode === 401 || statusCode === 403 || errStr.includes('code 190') || errStr.includes('invalid token') || errStr.includes('revoked') || errStr.includes('expired')) {\n    errorCode = 'AUTH_ERROR';\n    if (!errorMessage) errorMessage = 'Authentication failed: OAuth token expired or unauthorized.';\n  } else if (statusCode === 429 || errStr.includes('rate limit') || errStr.includes('quota')) {\n    errorCode = 'RATE_LIMIT';\n    if (!errorMessage) errorMessage = 'Platform API rate limit reached.';\n  } else if (errStr.includes('media') || errStr.includes('aspect ratio') || errStr.includes('resolution') || errStr.includes('duration')) {\n    errorCode = 'MEDIA_ERROR';\n    if (!errorMessage) errorMessage = 'Media asset failed platform encoding/size requirements.';\n  } else if (statusCode >= 500) {\n    errorCode = 'PLATFORM_ERROR';\n    if (!errorMessage) errorMessage = `Platform internal server error (HTTP ${statusCode}).`;\n  } else {\n    errorCode = 'UNKNOWN';\n    if (!errorMessage) errorMessage = `HTTP ${statusCode}: ${JSON.stringify(body).substring(0, 300)}`;\n  }\n}\n\n// Determine final post status and retry eligibility\nlet finalStatus = 'Posted';\nif (!isSuccess) {\n  const isRetryable = ['RATE_LIMIT', 'PLATFORM_ERROR'].includes(errorCode) || statusCode >= 500 || statusCode === 429;\n  if (isRetryable && currentAttempt < maxRetries) {\n    finalStatus = 'Retrying';\n  } else {\n    finalStatus = 'Failed';\n  }\n}\n\nconst nowUtc = new Date().toISOString();\n\nreturn [{\n  json: {\n    post_id: post.post_id,\n    brand_id: post.brand_id,\n    brand_name: post.brand_name,\n    client_id: post.client_id,\n    client_name: post.client_name,\n    platform,\n    account_handle: post.account_handle,\n    isSuccess,\n    finalStatus,\n    attempt_count: currentAttempt,\n    posted_at: isSuccess ? nowUtc : (post.posted_at || ''),\n    platform_post_id: platformPostId,\n    post_url: postUrl,\n    error_code: isSuccess ? '' : errorCode,\n    error_message: isSuccess ? '' : errorMessage.substring(0, 500),\n    http_status: statusCode,\n    response_summary: isSuccess\n      ? `Published on ${platform}. ID: ${platformPostId}`\n      : `Error on ${platform} (${errorCode}): ${errorMessage.substring(0, 200)}`,\n    timestamp_utc: nowUtc\n  }\n}];"
        },
        "status": "idle"
      },
      {
        "id": "node-28",
        "name": "Sheet - Update Post Result",
        "type": "httpRequest",
        "position": [
          3900,
          300
        ],
        "parameters": {
          "operation": "update",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Posts",
          "columnToMatchOn": "post_id",
          "valueToMatchOn": "={{ $json.post_id }}",
          "fieldsUi": {
            "fieldValues": [
              {
                "fieldId": "status",
                "fieldValue": "={{ $json.finalStatus }}"
              },
              {
                "fieldId": "attempt_count",
                "fieldValue": "={{ $json.attempt_count }}"
              },
              {
                "fieldId": "posted_at",
                "fieldValue": "={{ $json.posted_at }}"
              },
              {
                "fieldId": "platform_post_id",
                "fieldValue": "={{ $json.platform_post_id }}"
              },
              {
                "fieldId": "post_url",
                "fieldValue": "={{ $json.post_url }}"
              },
              {
                "fieldId": "error_code",
                "fieldValue": "={{ $json.error_code }}"
              },
              {
                "fieldId": "error_message",
                "fieldValue": "={{ $json.error_message }}"
              },
              {
                "fieldId": "locked_by_execution",
                "fieldValue": ""
              },
              {
                "fieldId": "updated_at",
                "fieldValue": "={{ $now.toISO() }}"
              }
            ]
          },
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-29",
        "name": "Sheet - Append Log Entry",
        "type": "httpRequest",
        "position": [
          4120,
          300
        ],
        "parameters": {
          "operation": "append",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Logs",
          "fieldsUi": {
            "fieldValues": [
              {
                "fieldId": "timestamp_utc",
                "fieldValue": "={{ $json.timestamp_utc }}"
              },
              {
                "fieldId": "execution_id",
                "fieldValue": "={{ $execution.id }}"
              },
              {
                "fieldId": "post_id",
                "fieldValue": "={{ $json.post_id }}"
              },
              {
                "fieldId": "brand_name",
                "fieldValue": "={{ $json.brand_name }}"
              },
              {
                "fieldId": "platform",
                "fieldValue": "={{ $json.platform }}"
              },
              {
                "fieldId": "action",
                "fieldValue": "PUBLISH_POST"
              },
              {
                "fieldId": "result",
                "fieldValue": "={{ $json.finalStatus }}"
              },
              {
                "fieldId": "http_status",
                "fieldValue": "={{ $json.http_status }}"
              },
              {
                "fieldId": "response_summary",
                "fieldValue": "={{ $json.response_summary }}"
              },
              {
                "fieldId": "error_message",
                "fieldValue": "={{ $json.error_message }}"
              }
            ]
          },
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-30",
        "name": "Is Auth Error?",
        "type": "if",
        "position": [
          4340,
          300
        ],
        "parameters": {
          "conditions": {
            "string": [
              {
                "value1": "={{ $json.error_code }}",
                "value2": "AUTH_ERROR"
              }
            ]
          }
        },
        "status": "idle"
      },
      {
        "id": "node-31",
        "name": "Sheet - Mark Account Expired",
        "type": "httpRequest",
        "position": [
          4560,
          240
        ],
        "parameters": {
          "operation": "update",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Social_Accounts",
          "columnToMatchOn": "account_handle",
          "valueToMatchOn": "={{ $json.account_handle }}",
          "fieldsUi": {
            "fieldValues": [
              {
                "fieldId": "connection_status",
                "fieldValue": "Expired"
              },
              {
                "fieldId": "last_verified_at",
                "fieldValue": "={{ $now.toISO() }}"
              }
            ]
          },
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-32",
        "name": "Sheet - Mark Validation Failed",
        "type": "httpRequest",
        "position": [
          2420,
          520
        ],
        "parameters": {
          "operation": "update",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Posts",
          "columnToMatchOn": "post_id",
          "valueToMatchOn": "={{ $json.post_id }}",
          "fieldsUi": {
            "fieldValues": [
              {
                "fieldId": "status",
                "fieldValue": "Failed"
              },
              {
                "fieldId": "error_code",
                "fieldValue": "VALIDATION_ERROR"
              },
              {
                "fieldId": "error_message",
                "fieldValue": "={{ $json.validationError }}"
              },
              {
                "fieldId": "locked_by_execution",
                "fieldValue": ""
              },
              {
                "fieldId": "updated_at",
                "fieldValue": "={{ $now.toISO() }}"
              }
            ]
          },
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-33",
        "name": "Unroll Skipped & Invalid Posts",
        "type": "code",
        "position": [
          1540,
          620
        ],
        "parameters": {
          "jsCode": "// Gather skipped and invalid posts from earlier filtering node\nconst data = $('Timezone Converter & Due Filter').first().json;\nconst nonDue = [...(data.skippedPosts || []), ...(data.invalidPosts || [])];\nreturn nonDue.map(p => ({ json: p }));"
        },
        "status": "idle"
      },
      {
        "id": "node-34",
        "name": "Sheet - Update Skipped/Invalid",
        "type": "httpRequest",
        "position": [
          1760,
          620
        ],
        "parameters": {
          "operation": "update",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Posts",
          "columnToMatchOn": "post_id",
          "valueToMatchOn": "={{ $json.post_id }}",
          "fieldsUi": {
            "fieldValues": [
              {
                "fieldId": "status",
                "fieldValue": "={{ $json.targetStatus }}"
              },
              {
                "fieldId": "scheduled_utc",
                "fieldValue": "={{ $json.scheduled_utc || undefined }}"
              },
              {
                "fieldId": "error_code",
                "fieldValue": "={{ $json.errorCode }}"
              },
              {
                "fieldId": "error_message",
                "fieldValue": "={{ $json.errorMessage }}"
              },
              {
                "fieldId": "locked_by_execution",
                "fieldValue": ""
              },
              {
                "fieldId": "updated_at",
                "fieldValue": "={{ $now.toISO() }}"
              }
            ]
          },
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-35",
        "name": "Aggregate Execution Summary",
        "type": "code",
        "position": [
          4780,
          300
        ],
        "parameters": {
          "jsCode": "// Generate comprehensive run summary for Email & Slack\nconst allProcessed = $input.all().map(i => i.json);\nconst config = $('Parse Settings Config').first().json.config;\nconst executionId = $execution.id;\n\nlet postedCount = 0;\nlet failedCount = 0;\nlet retryingCount = 0;\nconst failureDetails = [];\nlet hasAuthError = false;\n\nfor (const p of allProcessed) {\n  if (p.finalStatus === 'Posted') {\n    postedCount++;\n  } else if (p.finalStatus === 'Retrying') {\n    retryingCount++;\n    failureDetails.push(`[RETRYING] Post #${p.post_id} (${p.brand_name} - ${p.platform}): ${p.error_code} - ${p.error_message}`);\n  } else if (p.finalStatus === 'Failed') {\n    failedCount++;\n    failureDetails.push(`[FAILED] Post #${p.post_id} (${p.brand_name} - ${p.platform}): ${p.error_code} - ${p.error_message}`);\n  }\n  if (p.error_code === 'AUTH_ERROR') {\n    hasAuthError = true;\n  }\n}\n\nconst summaryText = `*Social Media Automation Execution Summary*\n*Execution ID*: ${executionId}\n*Timestamp*: ${new Date().toISOString()}\n*Total Processed*: ${allProcessed.length}\n*Posted Successfully*: ${postedCount}\n*Retrying (Transient)*: ${retryingCount}\n*Failed (Permanent)*: ${failedCount}\n${hasAuthError ? '\\n⚠️ *CRITICAL: EXPIRED CREDENTIAL DETECTED! Re-authentication required in Social_Accounts.*' : ''}\n${failureDetails.length > 0 ? '\\n*Issue Breakdown:*\\n' + failureDetails.join('\\n') : '\\nAll posts published with zero errors.'}`;\n\nreturn [{\n  json: {\n    summaryText,\n    postedCount,\n    failedCount,\n    retryingCount,\n    hasAuthError,\n    alertEmail: config.alert_email,\n    slackWebhook: config.slack_webhook\n  }\n}];"
        },
        "status": "idle"
      },
      {
        "id": "node-36",
        "name": "Slack - Send Ops Notification",
        "type": "httpRequest",
        "position": [
          5000,
          240
        ],
        "parameters": {
          "method": "POST",
          "url": "={{ $json.slackWebhook || \"https://hooks.slack.com/services/DUMMY/WEBHOOK/URL\" }}",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={{ JSON.stringify({ text: $json.summaryText }) }}",
          "options": {
            "response": {
              "response": {
                "fullResponse": true,
                "neverError": true
              }
            }
          }
        },
        "status": "idle"
      },
      {
        "id": "node-37",
        "name": "Gmail - Send Email Alert",
        "type": "email",
        "position": [
          5000,
          380
        ],
        "parameters": {
          "sendTo": "={{ $json.alertEmail }}",
          "subject": "={{ ($json.hasAuthError ? \"🚨 [CRITICAL] \" : ($json.failedCount > 0 ? \"⚠️ [WARNING] \" : \"✅ [SUCCESS] \")) + \"Social Auto-Poster Summary (Exec #\" + $execution.id + \")\" }}",
          "message": "={{ $json.summaryText }}",
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-38",
        "name": "Sticky Note - Ingestion",
        "type": "httpRequest",
        "position": [
          160,
          300
        ],
        "parameters": {
          "content": "## 1. Trigger & Config Ingestion\nEvery 5 minutes, read dynamic system settings (max retries, rate limits, alerts) from Google Sheets Settings tab.",
          "height": 280,
          "width": 600,
          "color": 4
        },
        "status": "idle"
      },
      {
        "id": "node-39",
        "name": "Sticky Note - Logic & Locking",
        "type": "httpRequest",
        "position": [
          1060,
          240
        ],
        "parameters": {
          "content": "## 2. Multi-Zone Engine & Anti-Collision\nConverts schedule_date + schedule_time in the post timezone to UTC using Luxon. Enforces 24h missed window, locks row in \"Processing\" state to prevent race conditions.",
          "height": 380,
          "width": 820,
          "color": 5
        },
        "status": "idle"
      },
      {
        "id": "node-40",
        "name": "Sticky Note - Social Matrix",
        "type": "httpRequest",
        "position": [
          2800,
          -320
        ],
        "parameters": {
          "content": "## 3. Platform Execution Matrix\nSwitches by platform across 8 social networks: Meta (Facebook, Instagram, Threads), LinkedIn, X, YouTube, Pinterest, and TikTok. Each HTTP node uses Continue On Fail.",
          "height": 1200,
          "width": 900,
          "color": 7
        },
        "status": "idle"
      },
      {
        "id": "node-41",
        "name": "Sticky Note - Normalization & Logging",
        "type": "httpRequest",
        "position": [
          3640,
          200
        ],
        "parameters": {
          "content": "## 4. Normalization, Audit Logging & Alerts\nExtracts post URLs, classifies failures (AUTH_ERROR, RATE_LIMIT, etc.), marks expired credentials, updates Google Sheets, and dispatches Slack + Email summaries.",
          "height": 380,
          "width": 860,
          "color": 6
        },
        "status": "idle"
      }
    ],
    "connections": [
      {
        "id": "conn-1",
        "fromNodeId": "node-1",
        "fromOutputIndex": 0,
        "toNodeId": "node-2",
        "toInputIndex": 0
      },
      {
        "id": "conn-2",
        "fromNodeId": "node-2",
        "fromOutputIndex": 0,
        "toNodeId": "node-3",
        "toInputIndex": 0
      },
      {
        "id": "conn-3",
        "fromNodeId": "node-3",
        "fromOutputIndex": 0,
        "toNodeId": "node-4",
        "toInputIndex": 0
      },
      {
        "id": "conn-4",
        "fromNodeId": "node-3",
        "fromOutputIndex": 1,
        "toNodeId": "node-5",
        "toInputIndex": 0
      },
      {
        "id": "conn-5",
        "fromNodeId": "node-3",
        "fromOutputIndex": 2,
        "toNodeId": "node-6",
        "toInputIndex": 0
      },
      {
        "id": "conn-6",
        "fromNodeId": "node-3",
        "fromOutputIndex": 3,
        "toNodeId": "node-7",
        "toInputIndex": 0
      },
      {
        "id": "conn-7",
        "fromNodeId": "node-4",
        "fromOutputIndex": 0,
        "toNodeId": "node-8",
        "toInputIndex": 0
      },
      {
        "id": "conn-8",
        "fromNodeId": "node-5",
        "fromOutputIndex": 0,
        "toNodeId": "node-8",
        "toInputIndex": 0
      },
      {
        "id": "conn-9",
        "fromNodeId": "node-6",
        "fromOutputIndex": 0,
        "toNodeId": "node-8",
        "toInputIndex": 0
      },
      {
        "id": "conn-10",
        "fromNodeId": "node-7",
        "fromOutputIndex": 0,
        "toNodeId": "node-8",
        "toInputIndex": 0
      },
      {
        "id": "conn-11",
        "fromNodeId": "node-8",
        "fromOutputIndex": 0,
        "toNodeId": "node-9",
        "toInputIndex": 0
      },
      {
        "id": "conn-12",
        "fromNodeId": "node-8",
        "fromOutputIndex": 1,
        "toNodeId": "node-33",
        "toInputIndex": 0
      },
      {
        "id": "conn-13",
        "fromNodeId": "node-9",
        "fromOutputIndex": 0,
        "toNodeId": "node-10",
        "toInputIndex": 0
      },
      {
        "id": "conn-14",
        "fromNodeId": "node-10",
        "fromOutputIndex": 0,
        "toNodeId": "node-11",
        "toInputIndex": 0
      },
      {
        "id": "conn-15",
        "fromNodeId": "node-11",
        "fromOutputIndex": 0,
        "toNodeId": "node-12",
        "toInputIndex": 0
      },
      {
        "id": "conn-16",
        "fromNodeId": "node-12",
        "fromOutputIndex": 0,
        "toNodeId": "node-13",
        "toInputIndex": 0
      },
      {
        "id": "conn-17",
        "fromNodeId": "node-13",
        "fromOutputIndex": 0,
        "toNodeId": "node-14",
        "toInputIndex": 0
      },
      {
        "id": "conn-18",
        "fromNodeId": "node-13",
        "fromOutputIndex": 1,
        "toNodeId": "node-32",
        "toInputIndex": 0
      },
      {
        "id": "conn-19",
        "fromNodeId": "node-14",
        "fromOutputIndex": 0,
        "toNodeId": "node-15",
        "toInputIndex": 0
      },
      {
        "id": "conn-20",
        "fromNodeId": "node-14",
        "fromOutputIndex": 1,
        "toNodeId": "node-35",
        "toInputIndex": 0
      },
      {
        "id": "conn-21",
        "fromNodeId": "node-15",
        "fromOutputIndex": 0,
        "toNodeId": "node-16",
        "toInputIndex": 0
      },
      {
        "id": "conn-22",
        "fromNodeId": "node-16",
        "fromOutputIndex": 0,
        "toNodeId": "node-17",
        "toInputIndex": 0
      },
      {
        "id": "conn-23",
        "fromNodeId": "node-16",
        "fromOutputIndex": 1,
        "toNodeId": "node-18",
        "toInputIndex": 0
      },
      {
        "id": "conn-24",
        "fromNodeId": "node-16",
        "fromOutputIndex": 2,
        "toNodeId": "node-20",
        "toInputIndex": 0
      },
      {
        "id": "conn-25",
        "fromNodeId": "node-16",
        "fromOutputIndex": 3,
        "toNodeId": "node-22",
        "toInputIndex": 0
      },
      {
        "id": "conn-26",
        "fromNodeId": "node-16",
        "fromOutputIndex": 4,
        "toNodeId": "node-23",
        "toInputIndex": 0
      },
      {
        "id": "conn-27",
        "fromNodeId": "node-16",
        "fromOutputIndex": 5,
        "toNodeId": "node-24",
        "toInputIndex": 0
      },
      {
        "id": "conn-28",
        "fromNodeId": "node-16",
        "fromOutputIndex": 6,
        "toNodeId": "node-25",
        "toInputIndex": 0
      },
      {
        "id": "conn-29",
        "fromNodeId": "node-16",
        "fromOutputIndex": 7,
        "toNodeId": "node-26",
        "toInputIndex": 0
      },
      {
        "id": "conn-30",
        "fromNodeId": "node-17",
        "fromOutputIndex": 0,
        "toNodeId": "node-27",
        "toInputIndex": 0
      },
      {
        "id": "conn-31",
        "fromNodeId": "node-18",
        "fromOutputIndex": 0,
        "toNodeId": "node-19",
        "toInputIndex": 0
      },
      {
        "id": "conn-32",
        "fromNodeId": "node-19",
        "fromOutputIndex": 0,
        "toNodeId": "node-27",
        "toInputIndex": 0
      },
      {
        "id": "conn-33",
        "fromNodeId": "node-20",
        "fromOutputIndex": 0,
        "toNodeId": "node-21",
        "toInputIndex": 0
      },
      {
        "id": "conn-34",
        "fromNodeId": "node-21",
        "fromOutputIndex": 0,
        "toNodeId": "node-27",
        "toInputIndex": 0
      },
      {
        "id": "conn-35",
        "fromNodeId": "node-22",
        "fromOutputIndex": 0,
        "toNodeId": "node-27",
        "toInputIndex": 0
      },
      {
        "id": "conn-36",
        "fromNodeId": "node-23",
        "fromOutputIndex": 0,
        "toNodeId": "node-27",
        "toInputIndex": 0
      },
      {
        "id": "conn-37",
        "fromNodeId": "node-24",
        "fromOutputIndex": 0,
        "toNodeId": "node-27",
        "toInputIndex": 0
      },
      {
        "id": "conn-38",
        "fromNodeId": "node-25",
        "fromOutputIndex": 0,
        "toNodeId": "node-27",
        "toInputIndex": 0
      },
      {
        "id": "conn-39",
        "fromNodeId": "node-26",
        "fromOutputIndex": 0,
        "toNodeId": "node-27",
        "toInputIndex": 0
      },
      {
        "id": "conn-40",
        "fromNodeId": "node-27",
        "fromOutputIndex": 0,
        "toNodeId": "node-28",
        "toInputIndex": 0
      },
      {
        "id": "conn-41",
        "fromNodeId": "node-28",
        "fromOutputIndex": 0,
        "toNodeId": "node-29",
        "toInputIndex": 0
      },
      {
        "id": "conn-42",
        "fromNodeId": "node-29",
        "fromOutputIndex": 0,
        "toNodeId": "node-30",
        "toInputIndex": 0
      },
      {
        "id": "conn-43",
        "fromNodeId": "node-30",
        "fromOutputIndex": 0,
        "toNodeId": "node-31",
        "toInputIndex": 0
      },
      {
        "id": "conn-44",
        "fromNodeId": "node-30",
        "fromOutputIndex": 1,
        "toNodeId": "node-14",
        "toInputIndex": 0
      },
      {
        "id": "conn-45",
        "fromNodeId": "node-31",
        "fromOutputIndex": 0,
        "toNodeId": "node-14",
        "toInputIndex": 0
      },
      {
        "id": "conn-46",
        "fromNodeId": "node-32",
        "fromOutputIndex": 0,
        "toNodeId": "node-14",
        "toInputIndex": 0
      },
      {
        "id": "conn-47",
        "fromNodeId": "node-33",
        "fromOutputIndex": 0,
        "toNodeId": "node-34",
        "toInputIndex": 0
      },
      {
        "id": "conn-48",
        "fromNodeId": "node-35",
        "fromOutputIndex": 0,
        "toNodeId": "node-36",
        "toInputIndex": 0
      },
      {
        "id": "conn-49",
        "fromNodeId": "node-35",
        "fromOutputIndex": 1,
        "toNodeId": "node-37",
        "toInputIndex": 0
      }
    ]
  },
  {
    "id": "tpl-error-handler",
    "name": "Social Media Automation Hub - Error Handler & Crash Recovery",
    "active": true,
    "updatedAt": "2026-10-23T15:26:32.886Z",
    "nodes": [
      {
        "id": "node-1",
        "name": "Error Trigger",
        "type": "httpRequest",
        "position": [
          600,
          300
        ],
        "parameters": {},
        "status": "idle"
      },
      {
        "id": "node-2",
        "name": "Sheet - Read Posts for Locked Rows",
        "type": "httpRequest",
        "position": [
          820,
          300
        ],
        "parameters": {
          "operation": "read",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Posts",
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-3",
        "name": "Identify & Unlock Rows",
        "type": "code",
        "position": [
          1040,
          300
        ],
        "parameters": {
          "jsCode": "// Identify rows locked by the crashed execution\nconst errorInfo = $('Error Trigger').first().json;\nconst posts = $input.all().map(i => i.json);\nconst crashedExecutionId = errorInfo.execution?.id;\n\nconst lockedPosts = [];\nfor (const p of posts) {\n  if (String(p.locked_by_execution) === String(crashedExecutionId) || (p.status === 'Processing' && !p.posted_at)) {\n    const attempts = parseInt(p.attempt_count || '0', 10);\n    const maxRetries = 3;\n    const nextStatus = attempts + 1 >= maxRetries ? 'Failed' : 'Retrying';\n    lockedPosts.push({\n      ...p,\n      crashedExecutionId,\n      errorNodeName: errorInfo.node?.name || 'Unknown Node',\n      errorMessage: errorInfo.execution?.error?.message || 'Workflow crashed unexpectedly during processing.',\n      nextStatus,\n      attempt_count: attempts + 1\n    });\n  }\n}\n\nreturn lockedPosts.map(p => ({ json: p }));"
        },
        "status": "idle"
      },
      {
        "id": "node-4",
        "name": "Sheet - Reset Locked Row",
        "type": "httpRequest",
        "position": [
          1260,
          300
        ],
        "parameters": {
          "operation": "update",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Posts",
          "columnToMatchOn": "post_id",
          "valueToMatchOn": "={{ $json.post_id }}",
          "fieldsUi": {
            "fieldValues": [
              {
                "fieldId": "status",
                "fieldValue": "={{ $json.nextStatus }}"
              },
              {
                "fieldId": "attempt_count",
                "fieldValue": "={{ $json.attempt_count }}"
              },
              {
                "fieldId": "error_code",
                "fieldValue": "CRASH_RECOVERED"
              },
              {
                "fieldId": "error_message",
                "fieldValue": "={{ \"Execution #\" + $json.crashedExecutionId + \" crashed at node \" + $json.errorNodeName + \": \" + $json.errorMessage }}"
              },
              {
                "fieldId": "locked_by_execution",
                "fieldValue": ""
              },
              {
                "fieldId": "updated_at",
                "fieldValue": "={{ $now.toISO() }}"
              }
            ]
          },
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-5",
        "name": "Sheet - Append Recovery Log",
        "type": "httpRequest",
        "position": [
          1480,
          300
        ],
        "parameters": {
          "operation": "append",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Logs",
          "fieldsUi": {
            "fieldValues": [
              {
                "fieldId": "timestamp_utc",
                "fieldValue": "={{ $now.toISO() }}"
              },
              {
                "fieldId": "execution_id",
                "fieldValue": "={{ $json.crashedExecutionId }}"
              },
              {
                "fieldId": "post_id",
                "fieldValue": "={{ $json.post_id }}"
              },
              {
                "fieldId": "brand_name",
                "fieldValue": "={{ $json.brand_name }}"
              },
              {
                "fieldId": "platform",
                "fieldValue": "={{ $json.platform }}"
              },
              {
                "fieldId": "action",
                "fieldValue": "ERROR_WORKFLOW_RECOVERY"
              },
              {
                "fieldId": "result",
                "fieldValue": "RECOVERED"
              },
              {
                "fieldId": "http_status",
                "fieldValue": 500
              },
              {
                "fieldId": "response_summary",
                "fieldValue": "={{ \"Unlocked row from crashed execution #\" + $json.crashedExecutionId }}"
              },
              {
                "fieldId": "error_message",
                "fieldValue": "={{ $json.errorMessage }}"
              }
            ]
          },
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-6",
        "name": "Slack - Alert Crash Incident",
        "type": "httpRequest",
        "position": [
          1700,
          300
        ],
        "parameters": {
          "method": "POST",
          "url": "={{ $vars.SLACK_ALERT_WEBHOOK || \"https://hooks.slack.com/services/DUMMY/CRASH/WEBHOOK\" }}",
          "sendHeaders": true,
          "headerParameters": {
            "parameters": [
              {
                "name": "Content-Type",
                "value": "application/json"
              }
            ]
          },
          "sendBody": true,
          "specifyBody": "json",
          "jsonBody": "={{ JSON.stringify({ text: \"🚨 *n8n Social Media Workflow Crash Detected!*\\n• *Execution ID*: \" + $json.crashedExecutionId + \"\\n• *Failing Node*: \" + $json.errorNodeName + \"\\n• *Error*: \" + $json.errorMessage + \"\\n• *Action Taken*: Unlocked Post #\" + $json.post_id + \" and reset status to \" + $json.nextStatus + \".\" }) }}",
          "options": {
            "response": {
              "response": {
                "fullResponse": true,
                "neverError": true
              }
            }
          }
        },
        "status": "idle"
      },
      {
        "id": "node-7",
        "name": "Sticky Note - Error Workflow",
        "type": "httpRequest",
        "position": [
          580,
          200
        ],
        "parameters": {
          "content": "## Error Workflow Recovery Engine\nCatches unhandled runtime crashes or server restarts. Finds any rows stuck in \"Processing\" locked by the crashed execution ID and safely releases the lock to \"Retrying\" or \"Failed\" to avoid zombie locks.",
          "height": 240,
          "width": 1140,
          "color": 3
        },
        "status": "idle"
      }
    ],
    "connections": [
      {
        "id": "conn-1",
        "fromNodeId": "node-1",
        "fromOutputIndex": 0,
        "toNodeId": "node-2",
        "toInputIndex": 0
      },
      {
        "id": "conn-2",
        "fromNodeId": "node-2",
        "fromOutputIndex": 0,
        "toNodeId": "node-3",
        "toInputIndex": 0
      },
      {
        "id": "conn-3",
        "fromNodeId": "node-3",
        "fromOutputIndex": 0,
        "toNodeId": "node-4",
        "toInputIndex": 0
      },
      {
        "id": "conn-4",
        "fromNodeId": "node-4",
        "fromOutputIndex": 0,
        "toNodeId": "node-5",
        "toInputIndex": 0
      },
      {
        "id": "conn-5",
        "fromNodeId": "node-5",
        "fromOutputIndex": 0,
        "toNodeId": "node-6",
        "toInputIndex": 0
      }
    ]
  },
  {
    "id": "tpl-retry-failed",
    "name": "Social Media Automation Hub - Retry Failed Posts",
    "active": true,
    "updatedAt": "2026-10-23T15:26:32.888Z",
    "nodes": [
      {
        "id": "node-1",
        "name": "Manual Trigger",
        "type": "manual",
        "position": [
          600,
          260
        ],
        "parameters": {},
        "status": "idle"
      },
      {
        "id": "node-2",
        "name": "Webhook - Manual or API Retry",
        "type": "webhook",
        "position": [
          600,
          440
        ],
        "parameters": {
          "path": "retry-posts",
          "httpMethod": "POST",
          "responseMode": "onReceived",
          "responseData": "allEntries",
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-3",
        "name": "Sheet - Read Failed Posts",
        "type": "httpRequest",
        "position": [
          860,
          350
        ],
        "parameters": {
          "operation": "read",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Posts",
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-4",
        "name": "Filter Eligible Posts to Requeue",
        "type": "code",
        "position": [
          1100,
          350
        ],
        "parameters": {
          "jsCode": "// Filter posts to retry based on webhook input or default retryable error criteria\nconst posts = $input.all().map(i => i.json);\nlet filterPostIds = [];\n\ntry {\n  const webhookData = $('Webhook - Manual or API Retry').first()?.json?.body;\n  if (webhookData && webhookData.post_ids && Array.isArray(webhookData.post_ids)) {\n    filterPostIds = webhookData.post_ids.map(String);\n  }\n} catch (e) {\n  // Manual trigger run\n}\n\nconst retryableErrors = ['RATE_LIMIT', 'PLATFORM_ERROR', 'CRASH_RECOVERED', 'TIMEOUT', 'UNKNOWN'];\nconst postsToRequeue = [];\n\nfor (const post of posts) {\n  const postId = String(post.post_id);\n  const status = String(post.status || '').trim();\n  const errorCode = String(post.error_code || '').trim();\n\n  // If specific post IDs were requested via webhook\n  if (filterPostIds.length > 0) {\n    if (filterPostIds.includes(postId)) {\n      postsToRequeue.push({\n        ...post,\n        requeueReason: 'MANUAL_TARGETED_RETRY'\n      });\n    }\n  } else {\n    // Default bulk retry: all Failed posts with transient/retryable error codes\n    if (status === 'Failed' && retryableErrors.includes(errorCode)) {\n      postsToRequeue.push({\n        ...post,\n        requeueReason: `AUTO_TRANSIENT_RETRY (${errorCode})`\n      });\n    }\n  }\n}\n\nreturn postsToRequeue.map(p => ({ json: p }));"
        },
        "status": "idle"
      },
      {
        "id": "node-5",
        "name": "Sheet - Reset to Scheduled",
        "type": "httpRequest",
        "position": [
          1340,
          350
        ],
        "parameters": {
          "operation": "update",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Posts",
          "columnToMatchOn": "post_id",
          "valueToMatchOn": "={{ $json.post_id }}",
          "fieldsUi": {
            "fieldValues": [
              {
                "fieldId": "status",
                "fieldValue": "Scheduled"
              },
              {
                "fieldId": "attempt_count",
                "fieldValue": 0
              },
              {
                "fieldId": "error_code",
                "fieldValue": ""
              },
              {
                "fieldId": "error_message",
                "fieldValue": "={{ \"Requeued for publishing: \" + $json.requeueReason }}"
              },
              {
                "fieldId": "locked_by_execution",
                "fieldValue": ""
              },
              {
                "fieldId": "updated_at",
                "fieldValue": "={{ $now.toISO() }}"
              }
            ]
          },
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-6",
        "name": "Sheet - Append Retry Log",
        "type": "httpRequest",
        "position": [
          1580,
          350
        ],
        "parameters": {
          "operation": "append",
          "sheetId": "={{ $vars.GOOGLE_SHEET_ID || \"1AbCdEfGhIjKlMnOpQrStUvWxYz1234567890\" }}",
          "sheetName": "Logs",
          "fieldsUi": {
            "fieldValues": [
              {
                "fieldId": "timestamp_utc",
                "fieldValue": "={{ $now.toISO() }}"
              },
              {
                "fieldId": "execution_id",
                "fieldValue": "={{ $execution.id }}"
              },
              {
                "fieldId": "post_id",
                "fieldValue": "={{ $json.post_id }}"
              },
              {
                "fieldId": "brand_name",
                "fieldValue": "={{ $json.brand_name }}"
              },
              {
                "fieldId": "platform",
                "fieldValue": "={{ $json.platform }}"
              },
              {
                "fieldId": "action",
                "fieldValue": "MANUAL_RETRY_REQUEUE"
              },
              {
                "fieldId": "result",
                "fieldValue": "REQUEUED"
              },
              {
                "fieldId": "http_status",
                "fieldValue": 200
              },
              {
                "fieldId": "response_summary",
                "fieldValue": "={{ \"Reset post status to Scheduled: \" + $json.requeueReason }}"
              },
              {
                "fieldId": "error_message",
                "fieldValue": ""
              }
            ]
          },
          "options": {}
        },
        "status": "idle"
      },
      {
        "id": "node-7",
        "name": "Sticky Note - Retry Workflow",
        "type": "httpRequest",
        "position": [
          580,
          150
        ],
        "parameters": {
          "content": "## Retry Failed Posts Workflow\nProvides manual or webhook-triggered requeuing of posts back to \"Scheduled\" status with attempt_count reset to 0. Supports targeted post_ids or bulk transient error recovery.",
          "height": 220,
          "width": 1040,
          "color": 2
        },
        "status": "idle"
      }
    ],
    "connections": [
      {
        "id": "conn-1",
        "fromNodeId": "node-1",
        "fromOutputIndex": 0,
        "toNodeId": "node-3",
        "toInputIndex": 0
      },
      {
        "id": "conn-2",
        "fromNodeId": "node-2",
        "fromOutputIndex": 0,
        "toNodeId": "node-3",
        "toInputIndex": 0
      },
      {
        "id": "conn-3",
        "fromNodeId": "node-3",
        "fromOutputIndex": 0,
        "toNodeId": "node-4",
        "toInputIndex": 0
      },
      {
        "id": "conn-4",
        "fromNodeId": "node-4",
        "fromOutputIndex": 0,
        "toNodeId": "node-5",
        "toInputIndex": 0
      },
      {
        "id": "conn-5",
        "fromNodeId": "node-5",
        "fromOutputIndex": 0,
        "toNodeId": "node-6",
        "toInputIndex": 0
      }
    ]
  }
];
