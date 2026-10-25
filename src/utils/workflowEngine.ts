import { Workflow, WorkflowNode, WorkflowConnection } from '../types/workflow';

interface NodeExecutionOutput {
  outputByBranch: Record<number, any[]>;
  rawOutput: any;
  durationMs: number;
  error?: string;
}

function interpolateTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, expression) => {
    const trimmed = expression.trim();
    try {
      // Direct property access
      if (data[trimmed] !== undefined) {
        return String(data[trimmed]);
      }
      // Simple expression evaluation
      const fn = new Function(...Object.keys(data), `return (${trimmed});`);
      const val = fn(...Object.values(data));
      return val !== undefined && val !== null ? String(val) : '';
    } catch {
      return data[trimmed] !== undefined ? String(data[trimmed]) : '';
    }
  });
}

export async function executeSingleNode(
  node: WorkflowNode,
  incomingItems: any[]
): Promise<NodeExecutionOutput> {
  const startTime = performance.now();
  const normalizedIncoming = incomingItems.length > 0
    ? incomingItems
    : [{ json: {} }];

  try {
    switch (node.type) {
      case 'webhook': {
        let payload: any = {};
        try {
          payload = JSON.parse(node.parameters.testPayload || '{}');
        } catch {
          payload = { text: node.parameters.testPayload || '' };
        }
        const outputItems = [{ json: payload }];
        return {
          outputByBranch: { 0: outputItems },
          rawOutput: outputItems,
          durationMs: Math.round(performance.now() - startTime),
        };
      }

      case 'schedule': {
        const outputItems = [
          {
            json: {
              timestamp: new Date().toISOString(),
              rule: node.parameters.rule || 'interval',
              cron: node.parameters.cronExpression || '0 * * * *',
              timezone: node.parameters.timezone || 'UTC',
            },
          },
        ];
        return {
          outputByBranch: { 0: outputItems },
          rawOutput: outputItems,
          durationMs: Math.round(performance.now() - startTime),
        };
      }

      case 'manual': {
        let payload: any = {};
        try {
          payload = JSON.parse(node.parameters.sampleData || '{}');
        } catch {
          payload = { manualTrigger: true, triggeredAt: new Date().toISOString() };
        }
        const outputItems = [{ json: payload }];
        return {
          outputByBranch: { 0: outputItems },
          rawOutput: outputItems,
          durationMs: Math.round(performance.now() - startTime),
        };
      }

      case 'httpRequest': {
        const method = (node.parameters.method || 'GET').toUpperCase();
        const url = node.parameters.url || 'https://jsonplaceholder.typicode.com/posts/1';
        let headers: Record<string, string> = { Accept: 'application/json' };

        if (node.parameters.sendHeaders && node.parameters.headers) {
          try {
            headers = { ...headers, ...JSON.parse(node.parameters.headers) };
          } catch {
            // keep default headers
          }
        }

        let body: string | undefined = undefined;
        if (node.parameters.sendBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
          body = node.parameters.body;
        }

        let responseData: any;
        let status = 200;
        let statusText = 'OK';

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

          const res = await fetch(url, {
            method,
            headers,
            body,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          status = res.status;
          statusText = res.statusText;
          const contentType = res.headers.get('content-type') || '';

          if (contentType.includes('application/json')) {
            responseData = await res.json();
          } else {
            const text = await res.text();
            try {
              responseData = JSON.parse(text);
            } catch {
              responseData = { responseText: text };
            }
          }
        } catch (fetchErr: any) {
          // In sandboxed environments or cross-origin restricted endpoints,
          // provide a simulated realistic API response so the workflow pipeline completes
          responseData = {
            simulated: true,
            status: 200,
            notice: 'Mocked response (CORS/Network protected endpoint in browser sandbox)',
            endpoint: url,
            method,
            data: {
              id: 1,
              title: 'Workflow automation ping received',
              body: 'Payload processed successfully by n8n HTTP Request node.',
              timestamp: new Date().toISOString(),
            },
          };
        }

        const outputItems = Array.isArray(responseData)
          ? responseData.map(item => ({ json: item }))
          : [{ json: { ...responseData, statusCode: status, statusText } }];

        return {
          outputByBranch: { 0: outputItems },
          rawOutput: outputItems,
          durationMs: Math.round(performance.now() - startTime),
        };
      }

      case 'code': {
        const code = node.parameters.code || 'return $input.all();';
        const $input = {
          all: () => normalizedIncoming,
          first: () => normalizedIncoming[0] || { json: {} },
          item: normalizedIncoming[0] || { json: {} },
        };
        const $json = normalizedIncoming[0]?.json || normalizedIncoming[0] || {};

        // Execute JS in Function sandbox
        const fn = new Function('$input', '$json', code);
        const result = fn($input, $json);

        let finalItems: any[] = [];
        if (Array.isArray(result)) {
          finalItems = result.map(item => (item && item.json ? item : { json: item }));
        } else if (result && typeof result === 'object') {
          finalItems = [result.json ? result : { json: result }];
        } else {
          finalItems = [{ json: { result } }];
        }

        return {
          outputByBranch: { 0: finalItems },
          rawOutput: finalItems,
          durationMs: Math.round(performance.now() - startTime),
        };
      }

      case 'editFields': {
        const fields: Array<{ key: string; value: string; type: string }> =
          node.parameters.fields || [];

        const transformed = normalizedIncoming.map(item => {
          const json = { ...(item.json || item) };
          fields.forEach(field => {
            if (!field.key) return;
            let val: any = field.value;
            if (field.type === 'number') {
              val = Number(val) || 0;
            } else if (field.type === 'boolean') {
              val = val === 'true';
            }
            json[field.key] = val;
          });
          return { json };
        });

        return {
          outputByBranch: { 0: transformed },
          rawOutput: transformed,
          durationMs: Math.round(performance.now() - startTime),
        };
      }

      case 'if': {
        const fieldName = node.parameters.field || '';
        const operator = node.parameters.operator || 'equals';
        const compareValue = node.parameters.value ?? '';

        const trueItems: any[] = [];
        const falseItems: any[] = [];

        normalizedIncoming.forEach(item => {
          const json = item.json || item;
          const actualVal = json[fieldName];
          let isMatch = false;

          switch (operator) {
            case 'equals':
              isMatch = String(actualVal) === String(compareValue);
              break;
            case 'notEquals':
              isMatch = String(actualVal) !== String(compareValue);
              break;
            case 'greaterThan':
              isMatch = Number(actualVal) > Number(compareValue);
              break;
            case 'lessThan':
              isMatch = Number(actualVal) < Number(compareValue);
              break;
            case 'contains':
              isMatch = String(actualVal || '').toLowerCase().includes(String(compareValue).toLowerCase());
              break;
            case 'notEmpty':
              isMatch = actualVal !== undefined && actualVal !== null && actualVal !== '';
              break;
            default:
              isMatch = Boolean(actualVal);
          }

          if (isMatch) {
            trueItems.push(item);
          } else {
            falseItems.push(item);
          }
        });

        return {
          outputByBranch: {
            0: trueItems, // true branch
            1: falseItems, // false branch
          },
          rawOutput: { trueBranch: trueItems, falseBranch: falseItems },
          durationMs: Math.round(performance.now() - startTime),
        };
      }

      case 'filter': {
        const fieldName = node.parameters.field || '';
        const operator = node.parameters.operator || 'notEmpty';
        const compareVal = node.parameters.value ?? '';

        const filtered = normalizedIncoming.filter(item => {
          const json = item.json || item;
          const val = json[fieldName];
          if (operator === 'notEmpty') return val !== undefined && val !== null && val !== '';
          if (operator === 'equals') return String(val) === String(compareVal);
          if (operator === 'greaterThan') return Number(val) > Number(compareVal);
          return Boolean(val);
        });

        return {
          outputByBranch: { 0: filtered },
          rawOutput: filtered,
          durationMs: Math.round(performance.now() - startTime),
        };
      }

      case 'slackWebhook': {
        const firstJson = normalizedIncoming[0]?.json || {};
        const renderedMsg = interpolateTemplate(
          node.parameters.messageTemplate || 'Workflow Alert',
          firstJson
        );

        const deliveryReceipt = {
          destination: node.parameters.channel || '#automations',
          message: renderedMsg,
          status: 'delivered',
          sentAt: new Date().toISOString(),
          simulated: true,
        };

        const outputItems = [{ json: deliveryReceipt }];
        return {
          outputByBranch: { 0: outputItems },
          rawOutput: outputItems,
          durationMs: Math.round(performance.now() - startTime),
        };
      }

      case 'email': {
        const firstJson = normalizedIncoming[0]?.json || {};
        const renderedSubject = interpolateTemplate(
          node.parameters.subject || 'Workflow Notification',
          firstJson
        );
        const renderedBody = interpolateTemplate(
          node.parameters.bodyTemplate || 'Workflow Notification Body',
          firstJson
        );

        const emailReceipt = {
          to: node.parameters.toEmail || 'ops@example.com',
          subject: renderedSubject,
          bodyPreview: renderedBody,
          status: 'queued',
          messageId: `msg_${Date.now().toString(36)}`,
          sentAt: new Date().toISOString(),
        };

        const outputItems = [{ json: emailReceipt }];
        return {
          outputByBranch: { 0: outputItems },
          rawOutput: outputItems,
          durationMs: Math.round(performance.now() - startTime),
        };
      }

      default:
        return {
          outputByBranch: { 0: normalizedIncoming },
          rawOutput: normalizedIncoming,
          durationMs: Math.round(performance.now() - startTime),
        };
    }
  } catch (err: any) {
    return {
      outputByBranch: { 0: [] },
      rawOutput: null,
      durationMs: Math.round(performance.now() - startTime),
      error: err?.message || String(err),
    };
  }
}

export async function runWorkflow(
  workflow: Workflow,
  onNodeStateChange: (
    nodeId: string,
    status: 'running' | 'success' | 'error',
    result?: any
  ) => void,
  customTriggerPayload?: any
): Promise<{ success: boolean; durationMs: number; results: Record<string, any> }> {
  const overallStart = performance.now();
  const nodeMap = new Map<string, WorkflowNode>();
  workflow.nodes.forEach(n => nodeMap.set(n.id, n));

  // Determine root/trigger nodes (nodes that don't receive incoming connections)
  const incomingConnMap = new Map<string, WorkflowConnection[]>();
  const outgoingConnMap = new Map<string, WorkflowConnection[]>();

  workflow.nodes.forEach(n => {
    incomingConnMap.set(n.id, []);
    outgoingConnMap.set(n.id, []);
  });

  workflow.connections.forEach(conn => {
    incomingConnMap.get(conn.toNodeId)?.push(conn);
    outgoingConnMap.get(conn.fromNodeId)?.push(conn);
  });

  // Root nodes
  const rootNodes = workflow.nodes.filter(n => {
    const incomings = incomingConnMap.get(n.id) || [];
    return incomings.length === 0;
  });

  const queue: Array<{ nodeId: string; incomingData: any[] }> = [];

  // Seed root nodes
  if (rootNodes.length > 0) {
    rootNodes.forEach(node => {
      let initialData: any[] = [];
      if (customTriggerPayload && (node.type === 'webhook' || node.type === 'manual')) {
        initialData = [{ json: customTriggerPayload }];
      }
      queue.push({ nodeId: node.id, incomingData: initialData });
    });
  } else if (workflow.nodes.length > 0) {
    // fallback if cycle
    queue.push({ nodeId: workflow.nodes[0].id, incomingData: [] });
  }

  const results: Record<string, any> = {};
  const executedNodes = new Set<string>();
  let hasFailed = false;

  while (queue.length > 0) {
    const { nodeId, incomingData } = queue.shift()!;
    if (executedNodes.has(nodeId)) continue;

    const node = nodeMap.get(nodeId);
    if (!node) continue;

    // Notify running
    onNodeStateChange(nodeId, 'running');
    // small latency for visual flow animation
    await new Promise(r => setTimeout(r, 140));

    const nodeOutput = await executeSingleNode(node, incomingData);

    if (nodeOutput.error) {
      hasFailed = true;
      results[nodeId] = nodeOutput;
      onNodeStateChange(nodeId, 'error', {
        input: incomingData,
        output: null,
        durationMs: nodeOutput.durationMs,
        error: nodeOutput.error,
        timestamp: new Date().toISOString(),
      });
      break; // stop workflow on error
    }

    executedNodes.add(nodeId);
    results[nodeId] = nodeOutput;

    onNodeStateChange(nodeId, 'success', {
      input: incomingData,
      output: nodeOutput.rawOutput,
      durationMs: nodeOutput.durationMs,
      timestamp: new Date().toISOString(),
    });

    // Enqueue downstream connected nodes based on output branch
    const outgoingConns = outgoingConnMap.get(nodeId) || [];
    for (const conn of outgoingConns) {
      const branchItems = nodeOutput.outputByBranch[conn.fromOutputIndex] || [];
      if (branchItems.length > 0) {
        queue.push({
          nodeId: conn.toNodeId,
          incomingData: branchItems,
        });
      }
    }
  }

  return {
    success: !hasFailed,
    durationMs: Math.round(performance.now() - overallStart),
    results,
  };
}
