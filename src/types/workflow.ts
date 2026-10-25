export type NodeType =
  | 'webhook'
  | 'schedule'
  | 'manual'
  | 'httpRequest'
  | 'code'
  | 'editFields'
  | 'if'
  | 'filter'
  | 'slackWebhook'
  | 'email'
  | 'xNode';

export interface NodeCategory {
  id: 'trigger' | 'action' | 'transform' | 'flow';
  label: string;
}

export interface NodeDefinition {
  type: NodeType;
  name: string;
  category: 'trigger' | 'action' | 'transform' | 'flow';
  icon: string;
  description: string;
  defaultParameters: Record<string, any>;
  inputs: number;
  outputs: number;
}

export interface WorkflowNode {
  id: string;
  name: string;
  type: NodeType;
  position: [number, number];
  parameters: Record<string, any>;
  status?: 'idle' | 'running' | 'success' | 'error';
  executionResult?: {
    input?: any;
    output?: any;
    durationMs?: number;
    error?: string;
    timestamp?: string;
  };
}

export interface WorkflowConnection {
  id: string;
  fromNodeId: string;
  fromOutputIndex: number;
  toNodeId: string;
  toInputIndex: number;
}

export interface Workflow {
  id: string;
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  updatedAt: string;
}

export interface ExecutionLogEntry {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'success' | 'error' | 'running';
  startedAt: string;
  durationMs: number;
  triggeredBy: string;
  nodeCount: number;
  itemCount: number;
}
