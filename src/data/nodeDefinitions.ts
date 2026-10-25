import { NodeDefinition } from '../types/workflow';

export const NODE_DEFINITIONS: Record<string, NodeDefinition> = {
  webhook: {
    type: 'webhook',
    name: 'Webhook',
    category: 'trigger',
    icon: 'Webhook',
    description: 'Starts the workflow when an HTTP request is received',
    inputs: 0,
    outputs: 1,
    defaultParameters: {
      path: '/webhook/test-event',
      httpMethod: 'POST',
      responseMode: 'onReceived',
      responseData: 'allEntries',
      testPayload: JSON.stringify(
        {
          event: 'order.created',
          orderId: 'ORD-98231',
          customer: {
            name: 'Sarah Connor',
            email: 'sarah@example.com',
          },
          total: 149.5,
          items: [
            { id: 'sku-1', name: 'Standard Subscription', price: 99.5 },
            { id: 'sku-2', name: 'Priority Support Add-on', price: 50.0 },
          ],
        },
        null,
        2
      ),
    },
  },
  schedule: {
    type: 'schedule',
    name: 'Schedule Trigger',
    category: 'trigger',
    icon: 'Clock',
    description: 'Triggers the workflow at set recurring intervals or cron times',
    inputs: 0,
    outputs: 1,
    defaultParameters: {
      rule: 'interval',
      intervalHours: 1,
      cronExpression: '0 * * * *',
      timezone: 'UTC',
    },
  },
  manual: {
    type: 'manual',
    name: 'When clicking Test workflow',
    category: 'trigger',
    icon: 'PlayCircle',
    description: 'Triggers the workflow immediately on manual execution',
    inputs: 0,
    outputs: 1,
    defaultParameters: {
      sampleData: JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          userId: 'usr_7721',
          action: 'manual_verification',
          status: 'initiated',
        },
        null,
        2
      ),
    },
  },
  httpRequest: {
    type: 'httpRequest',
    name: 'HTTP Request',
    category: 'action',
    icon: 'Globe',
    description: 'Sends an HTTP/REST request to any API endpoint',
    inputs: 1,
    outputs: 1,
    defaultParameters: {
      method: 'GET',
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      sendHeaders: true,
      headers: JSON.stringify({ 'Content-Type': 'application/json' }, null, 2),
      sendBody: false,
      body: '{}',
    },
  },
  code: {
    type: 'code',
    name: 'Code (JavaScript)',
    category: 'transform',
    icon: 'Code2',
    description: 'Run custom JavaScript to transform and process data',
    inputs: 1,
    outputs: 1,
    defaultParameters: {
      code: `// Loop over input items and transform
const items = $input.all();
return items.map((item, index) => {
  const data = item.json || item;
  return {
    json: {
      ...data,
      processedAt: new Date().toISOString(),
      itemIndex: index + 1,
      isProcessed: true,
      normalizedScore: Math.round(((data.total || data.id || 100) * 1.15) * 100) / 100,
    }
  };
});`,
    },
  },
  editFields: {
    type: 'editFields',
    name: 'Edit Fields (Set)',
    category: 'transform',
    icon: 'Sliders',
    description: 'Set, update, or remove key-value fields on incoming items',
    inputs: 1,
    outputs: 1,
    defaultParameters: {
      fields: [
        { key: 'environment', value: 'production', type: 'string' },
        { key: 'priority', value: 'high', type: 'string' },
        { key: 'retryCount', value: '0', type: 'number' },
      ],
    },
  },
  if: {
    type: 'if',
    name: 'If',
    category: 'flow',
    icon: 'GitFork',
    description: 'Split workflow execution depending on condition results',
    inputs: 1,
    outputs: 2, // 0 = true, 1 = false
    defaultParameters: {
      field: 'total',
      operator: 'greaterThan',
      value: '100',
    },
  },
  filter: {
    type: 'filter',
    name: 'Filter',
    category: 'transform',
    icon: 'Filter',
    description: 'Keep or discard items based on defined criteria',
    inputs: 1,
    outputs: 1,
    defaultParameters: {
      field: 'status',
      operator: 'notEmpty',
      value: '',
    },
  },
  slackWebhook: {
    type: 'slackWebhook',
    name: 'Slack / Discord Webhook',
    category: 'action',
    icon: 'Send',
    description: 'Post structured notifications to a chat webhook URL',
    inputs: 1,
    outputs: 1,
    defaultParameters: {
      webhookUrl: 'https://hooks.slack.com/services/SIMULATED/WORKSPACE/WEBHOOK',
      channel: '#automations',
      messageTemplate: '🔔 *Workflow Alert*: Processed item with ID: {{orderId || id || "N/A"}} at {{new Date().toLocaleTimeString()}}',
    },
  },
  email: {
    type: 'email',
    name: 'Send Email Notification',
    category: 'action',
    icon: 'Mail',
    description: 'Send transactional email notification or report',
    inputs: 1,
    outputs: 1,
    defaultParameters: {
      toEmail: 'ops-team@company.internal',
      subject: 'Automation Digest: Workflow Success',
      bodyTemplate: 'Hello,\n\nThe workflow completed successfully.\nItem summary:\nTotal: ${{total || "0"}}\nTimestamp: {{new Date().toISOString()}}',
    },
  },
  xNode: {
    type: 'xNode',
    name: 'X (formerly Twitter)',
    category: 'action',
    icon: 'XIcon',
    description: 'Publish tweets, post threads, upload media, search tweets, and get user metrics using Twitter/X API v2',
    inputs: 1,
    outputs: 1,
    defaultParameters: {
      operation: 'createTweet',
      authType: 'oauth2',
      apiKey: 'ci360_x_client_id_live',
      apiSecretKey: 'ci360_x_client_secret_live',
      bearerToken: 'ci360_x_bearer_token_v2_live',
      accessToken: '18492049-ci360_x_access_token_live',
      accessTokenSecret: 'ci360_x_access_secret_live',
      text: 'Zero-downtime multi-region K8s autoscaling is live! Sub-10ms failover for high-concurrency cloud systems. 🚀 #Cloud #DevOps #Kubernetes',
      mediaUrls: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1200&h=630&q=80',
      replySettings: 'everyone',
      inReplyToTweetId: '',
      searchQuery: '#DevOps OR #GenerativeAI -is:retweet',
      maxResults: 10,
      userHandle: 'NexusCloudTech',
      enablePoll: false,
      pollOptions: ['Option A: High Availability', 'Option B: Cost Efficiency'],
      pollDurationMinutes: 1440,
    },
  },
};
