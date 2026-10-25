import React, { useState, useRef, useEffect } from 'react';
import {
  Webhook,
  Clock,
  PlayCircle,
  Globe,
  Code2,
  Sliders,
  GitFork,
  Filter,
  Send,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { WorkflowNode, WorkflowConnection, NodeType } from '../types/workflow';

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  onUpdateNodePosition: (nodeId: string, position: [number, number]) => void;
  onAddConnection: (connection: Omit<WorkflowConnection, 'id'>) => void;
  onDeleteConnection: (connectionId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onOpenLibrary: () => void;
  isRunning?: boolean;
}

const XIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const ICON_MAP: Record<NodeType, React.FC<{ className?: string }>> = {
  webhook: Webhook,
  schedule: Clock,
  manual: PlayCircle,
  httpRequest: Globe,
  code: Code2,
  editFields: Sliders,
  if: GitFork,
  filter: Filter,
  slackWebhook: Send,
  email: Mail,
  xNode: XIcon,
};

const NODE_WIDTH = 210;
const NODE_HEIGHT = 80;

export const WorkflowCanvas: React.FC<WorkflowCanvasProps> = ({
  nodes,
  connections,
  selectedNodeId,
  onSelectNode,
  onUpdateNodePosition,
  onAddConnection,
  onDeleteConnection,
  onDeleteNode,
  onOpenLibrary,
  isRunning,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);

  // Pan and Zoom state
  const [zoom, setZoom] = useState(0.85);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 50 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dragging Node state
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Connecting wire in progress
  const [connectingFrom, setConnectingFrom] = useState<{
    nodeId: string;
    outputIndex: number;
    startX: number;
    startY: number;
  } | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Convert screen coordinates to canvas space
  const screenToCanvas = (screenX: number, screenY: number) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (screenX - rect.left - pan.x) / zoom,
      y: (screenY - rect.top - pan.y) / zoom,
    };
  };

  // Node position lookups for wire calculation
  const nodeMap = new Map<string, WorkflowNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const getNodePortPos = (node: WorkflowNode, type: 'input' | 'output', index = 0) => {
    const [x, y] = node.position;
    if (type === 'input') {
      return { x, y: y + NODE_HEIGHT / 2 };
    }
    // Output port
    if (node.type === 'if') {
      // 2 outputs
      return {
        x: x + NODE_WIDTH,
        y: index === 0 ? y + 26 : y + NODE_HEIGHT - 26,
      };
    }
    return { x: x + NODE_WIDTH, y: y + NODE_HEIGHT / 2 };
  };

  // Canvas Mouse Listeners
  const handleMouseDown = (e: React.MouseEvent) => {
    // If clicked directly on canvas background, start pan
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-background')) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    setMouseCanvasPos(canvasPos);

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggingNodeId) {
      onUpdateNodePosition(draggingNodeId, [
        Math.round(canvasPos.x - dragOffset.x),
        Math.round(canvasPos.y - dragOffset.y),
      ]);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
    setConnectingFrom(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: WorkflowNode) => {
    e.stopPropagation();
    onSelectNode(node.id);
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    setDraggingNodeId(node.id);
    setDragOffset({
      x: canvasPos.x - node.position[0],
      y: canvasPos.y - node.position[1],
    });
  };

  const handleStartConnection = (
    e: React.MouseEvent,
    nodeId: string,
    outputIndex: number
  ) => {
    e.stopPropagation();
    const node = nodeMap.get(nodeId);
    if (!node) return;
    const port = getNodePortPos(node, 'output', outputIndex);
    setConnectingFrom({
      nodeId,
      outputIndex,
      startX: port.x,
      startY: port.y,
    });
  };

  const handleCompleteConnection = (e: React.MouseEvent, targetNodeId: string, inputIndex = 0) => {
    e.stopPropagation();
    if (connectingFrom && connectingFrom.nodeId !== targetNodeId) {
      // Check if connection already exists
      const exists = connections.some(
        c =>
          c.fromNodeId === connectingFrom.nodeId &&
          c.fromOutputIndex === connectingFrom.outputIndex &&
          c.toNodeId === targetNodeId &&
          c.toInputIndex === inputIndex
      );

      if (!exists) {
        onAddConnection({
          fromNodeId: connectingFrom.nodeId,
          fromOutputIndex: connectingFrom.outputIndex,
          toNodeId: targetNodeId,
          toInputIndex: inputIndex,
        });
      }
    }
    setConnectingFrom(null);
  };

  // Zoom controls
  const handleZoom = (delta: number) => {
    setZoom(prev => Math.min(Math.max(0.4, prev + delta), 2.0));
  };

  const resetView = () => {
    setZoom(0.85);
    setPan({ x: 40, y: 50 });
  };

  return (
    <div
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="relative w-full h-full overflow-hidden bg-slate-950 canvas-dot-grid cursor-grab active:cursor-grabbing select-none"
    >
      {/* Zoom & Canvas Actions Toolbar */}
      <div className="absolute bottom-6 left-6 z-20 flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1.5 rounded-lg shadow-xl backdrop-blur-sm">
        <button
          onClick={() => handleZoom(0.1)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono text-slate-400 px-2 min-w-[42px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => handleZoom(-0.1)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-px h-4 bg-slate-800 mx-1" />
        <button
          onClick={resetView}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          title="Reset Zoom & Pan"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Add Node & Action Controls */}
      <div className="absolute top-6 left-6 z-20 flex items-center gap-2">
        <button
          onClick={onOpenLibrary}
          className="flex items-center gap-2 px-3.5 py-2 bg-[#ff6d5a] hover:bg-[#ea503c] text-white text-xs font-semibold rounded-lg shadow-lg shadow-[#ff6d5a]/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Node</span>
        </button>

        {selectedNodeId && (
          <button
            onClick={() => onDeleteNode(selectedNodeId)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900/90 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-slate-800 hover:border-red-800/80 text-xs font-medium rounded-lg shadow-md transition-all"
            title="Delete Selected Node"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        )}
      </div>

      {/* SVG Layer for Connection Wires */}
      <svg
        className="absolute inset-0 pointer-events-none w-full h-full"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          <linearGradient id="wire-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#ff6d5a" />
          </linearGradient>
          <linearGradient id="wire-active" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff6d5a" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>

        {/* Existing Connections */}
        {connections.map(conn => {
          const fromNode = nodeMap.get(conn.fromNodeId);
          const toNode = nodeMap.get(conn.toNodeId);
          if (!fromNode || !toNode) return null;

          const start = getNodePortPos(fromNode, 'output', conn.fromOutputIndex);
          const end = getNodePortPos(toNode, 'input', conn.toInputIndex);

          const dx = Math.max(Math.abs(end.x - start.x) * 0.5, 40);
          const pathD = `M ${start.x} ${start.y} C ${start.x + dx} ${start.y}, ${end.x - dx} ${end.y}, ${end.x} ${end.y}`;

          const isNodeActive = isRunning && (fromNode.status === 'running' || toNode.status === 'running');

          return (
            <g key={conn.id} className="pointer-events-auto group">
              {/* Invisible wider hit area for easy hover/clicking to delete wire */}
              <path
                d={pathD}
                fill="none"
                stroke="transparent"
                strokeWidth={14}
                className="cursor-pointer"
                onClick={e => {
                  e.stopPropagation();
                  onDeleteConnection(conn.id);
                }}
              />
              <path
                d={pathD}
                fill="none"
                stroke={isNodeActive ? 'url(#wire-active)' : '#475569'}
                strokeWidth={isNodeActive ? 3 : 2}
                strokeDasharray={isNodeActive ? '6,4' : undefined}
                className={`transition-colors group-hover:stroke-red-400 ${
                  isNodeActive ? 'animate-pulse' : ''
                }`}
              />
              {/* Output branch label for IF nodes */}
              {fromNode.type === 'if' && (
                <text
                  x={start.x + 12}
                  y={start.y - 4}
                  fill="#94a3b8"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {conn.fromOutputIndex === 0 ? 'true' : 'false'}
                </text>
              )}
            </g>
          );
        })}

        {/* Connection currently being dragged */}
        {connectingFrom && (
          <path
            d={`M ${connectingFrom.startX} ${connectingFrom.startY} C ${
              connectingFrom.startX + 60
            } ${connectingFrom.startY}, ${mouseCanvasPos.x - 60} ${
              mouseCanvasPos.y
            }, ${mouseCanvasPos.x} ${mouseCanvasPos.y}`}
            fill="none"
            stroke="#ff6d5a"
            strokeWidth={2.5}
            strokeDasharray="4,4"
          />
        )}
      </svg>

      {/* Nodes Layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {nodes.map(node => {
          const IconComponent = ICON_MAP[node.type] || Globe;
          const isSelected = selectedNodeId === node.id;
          const [posX, posY] = node.position;

          return (
            <div
              key={node.id}
              onMouseDown={e => handleNodeMouseDown(e, node)}
              style={{
                transform: `translate(${posX}px, ${posY}px)`,
                width: `${NODE_WIDTH}px`,
                height: `${NODE_HEIGHT}px`,
              }}
              className={`absolute pointer-events-auto rounded-xl p-3 flex flex-col justify-between transition-shadow cursor-grab active:cursor-grabbing border ${
                isSelected
                  ? 'bg-slate-900 border-[#ff6d5a] ring-2 ring-[#ff6d5a]/30 shadow-xl'
                  : 'bg-slate-900/90 hover:bg-slate-900 border-slate-800 hover:border-slate-700 shadow-md'
              }`}
            >
              {/* Left Input Port */}
              {node.type !== 'manual' && node.type !== 'schedule' && node.type !== 'webhook' && (
                <div
                  onMouseUp={e => handleCompleteConnection(e, node.id, 0)}
                  className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-800 border-2 border-slate-600 hover:border-[#ff6d5a] hover:scale-125 transition-transform flex items-center justify-center cursor-pointer z-10"
                  title="Connect input"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                </div>
              )}

              {/* Node Header */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                    node.type === 'xNode'
                      ? 'bg-black border-zinc-700 text-white shadow-xs'
                      : isSelected
                      ? 'bg-[#ff6d5a]/20 border-[#ff6d5a] text-[#ff6d5a]'
                      : 'bg-slate-950 border-slate-800 text-[#ff6d5a]'
                  }`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate leading-tight">
                    {node.name}
                  </div>
                  <div className="text-[10px] text-slate-400 capitalize truncate mt-0.5">
                    {node.type === 'xNode'
                      ? (node.parameters?.operation ? `X • ${node.parameters.operation}` : 'X (Twitter) v2')
                      : node.type}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="shrink-0">
                  {node.status === 'running' && (
                    <Loader2 className="w-4 h-4 text-[#ff6d5a] animate-spin" />
                  )}
                  {node.status === 'success' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {node.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                  {(!node.status || node.status === 'idle') && (
                    <div className="w-2 h-2 rounded-full bg-slate-700" />
                  )}
                </div>
              </div>

              {/* Node Footer Info */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-800/80">
                <span className="truncate">
                  {node.executionResult?.durationMs !== undefined
                    ? `${node.executionResult.durationMs}ms`
                    : 'Ready'}
                </span>
                <span className="capitalize">{node.status || 'idle'}</span>
              </div>

              {/* Right Output Port(s) */}
              {node.type === 'if' ? (
                <>
                  {/* True Port (index 0) */}
                  <div
                    onMouseDown={e => handleStartConnection(e, node.id, 0)}
                    className="absolute -right-2.5 top-[26px] -translate-y-1/2 w-5 h-5 rounded-full bg-slate-800 border-2 border-emerald-500 hover:scale-125 transition-transform flex items-center justify-center cursor-crosshair z-10 group"
                    title="True Branch (Drag to connect)"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  {/* False Port (index 1) */}
                  <div
                    onMouseDown={e => handleStartConnection(e, node.id, 1)}
                    className="absolute -right-2.5 bottom-[14px] w-5 h-5 rounded-full bg-slate-800 border-2 border-amber-500 hover:scale-125 transition-transform flex items-center justify-center cursor-crosshair z-10 group"
                    title="False Branch (Drag to connect)"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  </div>
                </>
              ) : (
                <div
                  onMouseDown={e => handleStartConnection(e, node.id, 0)}
                  className="absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-800 border-2 border-slate-600 hover:border-[#ff6d5a] hover:scale-125 transition-transform flex items-center justify-center cursor-crosshair z-10"
                  title="Drag to connect"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ff6d5a]" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
