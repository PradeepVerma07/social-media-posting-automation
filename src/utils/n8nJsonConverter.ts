import { Workflow, WorkflowNode, WorkflowConnection, NodeType } from '../types/workflow';

const N8N_TYPE_MAP: Record<NodeType, string> = {
  webhook: 'n8n-nodes-base.webhook',
  schedule: 'n8n-nodes-base.scheduleTrigger',
  manual: 'n8n-nodes-base.manualTrigger',
  httpRequest: 'n8n-nodes-base.httpRequest',
  code: 'n8n-nodes-base.code',
  editFields: 'n8n-nodes-base.set',
  if: 'n8n-nodes-base.if',
  filter: 'n8n-nodes-base.filter',
  slackWebhook: 'n8n-nodes-base.slack',
  email: 'n8n-nodes-base.emailSend',
  xNode: 'n8n-nodes-base.x',
};

const REVERSE_N8N_TYPE_MAP: Record<string, NodeType> = {
  'n8n-nodes-base.webhook': 'webhook',
  'n8n-nodes-base.scheduleTrigger': 'schedule',
  'n8n-nodes-base.cron': 'schedule',
  'n8n-nodes-base.interval': 'schedule',
  'n8n-nodes-base.manualTrigger': 'manual',
  'n8n-nodes-base.start': 'manual',
  'n8n-nodes-base.httpRequest': 'httpRequest',
  'n8n-nodes-base.code': 'code',
  'n8n-nodes-base.function': 'code',
  'n8n-nodes-base.functionItem': 'code',
  'n8n-nodes-base.set': 'editFields',
  'n8n-nodes-base.if': 'if',
  'n8n-nodes-base.filter': 'filter',
  'n8n-nodes-base.slack': 'slackWebhook',
  'n8n-nodes-base.emailSend': 'email',
  'n8n-nodes-base.x': 'xNode',
  'n8n-nodes-base.twitter': 'xNode',
};

export function exportWorkflowToN8n(workflow: Workflow): string {
  const nodeMap = new Map<string, WorkflowNode>();
  workflow.nodes.forEach(node => nodeMap.set(node.id, node));

  // Build connections in n8n format
  const connections: Record<string, { main: Array<Array<{ node: string; type: string; index: number }>> }> = {};

  workflow.nodes.forEach(node => {
    connections[node.name] = { main: [] };
  });

  workflow.connections.forEach(conn => {
    const fromNode = nodeMap.get(conn.fromNodeId);
    const toNode = nodeMap.get(conn.toNodeId);

    if (fromNode && toNode) {
      if (!connections[fromNode.name]) {
        connections[fromNode.name] = { main: [] };
      }

      while (connections[fromNode.name].main.length <= conn.fromOutputIndex) {
        connections[fromNode.name].main.push([]);
      }

      connections[fromNode.name].main[conn.fromOutputIndex].push({
        node: toNode.name,
        type: 'main',
        index: conn.toInputIndex,
      });
    }
  });

  const n8nJson = {
    name: workflow.name,
    nodes: workflow.nodes.map(node => ({
      parameters: node.parameters,
      id: node.id,
      name: node.name,
      type: N8N_TYPE_MAP[node.type] || 'n8n-nodes-base.httpRequest',
      typeVersion: 1,
      position: node.position,
    })),
    connections,
    active: workflow.active,
    settings: {
      executionOrder: 'v1',
    },
    versionId: '1.0.0',
    meta: {
      templateCredsSetupCompleted: true,
      instanceId: 'n8n-workflow-studio',
    },
  };

  return JSON.stringify(n8nJson, null, 2);
}

export function importWorkflowFromN8n(jsonStr: string): Workflow {
  const parsed = JSON.parse(jsonStr);

  const rawNodes: any[] = parsed.nodes || [];
  const rawConnections: Record<string, { main?: Array<Array<{ node: string; type?: string; index?: number }>> }> =
    parsed.connections || {};

  const nameToId = new Map<string, string>();

  const nodes: WorkflowNode[] = rawNodes.map((n, i) => {
    const id = n.id || `node-${i + 1}-${Date.now().toString(36)}`;
    const name = n.name || `Node ${i + 1}`;
    nameToId.set(name, id);

    const type: NodeType = REVERSE_N8N_TYPE_MAP[n.type] || 'code';
    const position: [number, number] = Array.isArray(n.position) && n.position.length >= 2
      ? [Number(n.position[0]) || 100, Number(n.position[1]) || 100]
      : [100 + i * 260, 200];

    return {
      id,
      name,
      type,
      position,
      parameters: n.parameters || {},
      status: 'idle',
    };
  });

  const connections: WorkflowConnection[] = [];
  let connCounter = 1;

  for (const [fromNodeName, connData] of Object.entries(rawConnections)) {
    const fromId = nameToId.get(fromNodeName);
    if (!fromId) continue;

    const mainOutputs = connData.main || [];
    mainOutputs.forEach((outputList, outputIdx) => {
      if (Array.isArray(outputList)) {
        outputList.forEach(target => {
          const toId = nameToId.get(target.node);
          if (toId) {
            connections.push({
              id: `conn-imp-${connCounter++}`,
              fromNodeId: fromId,
              fromOutputIndex: outputIdx,
              toNodeId: toId,
              toInputIndex: target.index ?? 0,
            });
          }
        });
      }
    });
  }

  return {
    id: `wf-${Date.now().toString(36)}`,
    name: parsed.name || 'Imported n8n Workflow',
    active: Boolean(parsed.active),
    nodes,
    connections,
    updatedAt: new Date().toISOString(),
  };
}
