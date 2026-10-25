import React, { useState } from 'react';
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
  Search,
  X
} from 'lucide-react';
import { NODE_DEFINITIONS } from '../data/nodeDefinitions';
import { NodeType } from '../types/workflow';

interface NodeLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNode: (type: NodeType) => void;
}

const XIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" className={className}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
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
  XIcon,
};

export const NodeLibraryModal: React.FC<NodeLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectNode,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'trigger' | 'action' | 'transform' | 'flow'>('all');

  if (!isOpen) return null;

  const filteredNodes = Object.values(NODE_DEFINITIONS).filter(node => {
    const matchesSearch =
      node.name.toLowerCase().includes(search.toLowerCase()) ||
      node.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || node.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Add Node to Workflow</h3>
            <p className="text-xs text-slate-400 mt-0.5">Select a trigger, transform, or action node</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-900/80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search nodes by name or purpose (e.g. HTTP, Code, Webhook)..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#ff6d5a]"
              autoFocus
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            {(['all', 'trigger', 'action', 'transform', 'flow'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#ff6d5a] text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat === 'all' ? 'All Nodes' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Nodes Grid */}
        <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredNodes.map(node => {
            const IconComp = ICON_MAP[node.icon] || Globe;
            return (
              <button
                key={node.type}
                onClick={() => {
                  onSelectNode(node.type);
                  onClose();
                }}
                className="flex items-start gap-3 p-3 text-left rounded-lg border border-slate-800/80 bg-slate-950/60 hover:bg-slate-800/80 hover:border-[#ff6d5a]/60 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-[#ff6d5a] group-hover:bg-[#ff6d5a]/10 shrink-0">
                  <IconComp className="w-4 h-4" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white group-hover:text-[#ff6d5a] transition-colors truncate">
                      {node.name}
                    </span>
                    <span className="text-[10px] text-slate-500 capitalize shrink-0">
                      {node.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {node.description}
                  </p>
                </div>
              </button>
            );
          })}
          {filteredNodes.length === 0 && (
            <div className="col-span-2 py-8 text-center text-xs text-slate-500">
              No nodes match your filter criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
