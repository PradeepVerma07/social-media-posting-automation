import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Calendar,
  PlusCircle,
  CheckSquare,
  Send,
  Building2,
  Share2,
  Cpu,
  Activity,
  BarChart3,
  FileSpreadsheet,
  Users,
  ShieldAlert,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  LogIn,
  Shield
} from 'lucide-react';
import { RoleName } from '../../../server/src/types';
import { isTabAllowed, getRolePermissions } from '../../utils/rbac';

export type NavigationTab =
  | 'overview'
  | 'content'
  | 'calendar'
  | 'create'
  | 'approvals'
  | 'published'
  | 'brands'
  | 'accounts'
  | 'automations'
  | 'n8n-login'
  | 'executions'
  | 'analytics'
  | 'sheets'
  | 'team'
  | 'audit'
  | 'settings'
  | 'register';

interface SidebarProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  pendingApprovalsCount?: number;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  currentRole?: RoleName;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  pendingApprovalsCount = 0,
  isMobileOpen = false,
  onCloseMobile,
  currentRole = 'Super Admin',
}) => {
  const NAV_ITEMS: Array<{
    id: NavigationTab;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'content', label: 'Content Management', icon: FileText },
    { id: 'calendar', label: 'Content Calendar', icon: Calendar },
    { id: 'create', label: 'Create Post', icon: PlusCircle },
    { id: 'approvals', label: 'Approval Queue', icon: CheckSquare, badge: pendingApprovalsCount },
    { id: 'published', label: 'Published Posts', icon: Send },
    { id: 'brands', label: 'Brands', icon: Building2 },
    { id: 'accounts', label: 'Social Accounts', icon: Share2 },
    { id: 'automations', label: 'Automations (n8n)', icon: Cpu },
    { id: 'n8n-login', label: 'Direct n8n Login', icon: LogIn },
    { id: 'executions', label: 'Workflow Executions', icon: Activity },
    { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
    { id: 'sheets', label: 'Google Sheets Sync', icon: FileSpreadsheet },
    { id: 'team', label: 'Team & RBAC', icon: Users },
    { id: 'audit', label: 'Audit Logs', icon: ShieldAlert },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleItemClick = (id: NavigationTab) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 lg:hidden animate-in fade-in duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`bg-white border-r border-[#EAECF0] flex-col justify-between transition-all duration-200 ${
          isMobileOpen
            ? 'fixed inset-y-0 left-0 z-50 w-72 shadow-2xl flex'
            : 'hidden lg:flex'
        } lg:static lg:z-auto ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Brand Wordmark & Logo */}
        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#EAECF0]">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-[#1336E8] flex items-center justify-center text-white font-bold text-sm tracking-wider shadow-md shadow-[#1336E8]/20 shrink-0">
                CI
              </div>
              {(!isCollapsed || isMobileOpen) && (
                <div className="min-w-0">
                  <span className="text-sm font-bold text-[#101828] block truncate tracking-tight">
                    CI360 HUB
                  </span>
                  <span className="text-[10px] font-mono text-[#08C5E1] font-semibold block tracking-wide uppercase">
                    n8n Orchestrator
                  </span>
                </div>
              )}
            </div>

            {/* Desktop Collapse Button */}
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-lg text-[#667085] hover:bg-[#F2F4F7] transition-colors hidden lg:block"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Button */}
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-[#667085] hover:bg-[#F2F4F7] transition-colors lg:hidden"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation List */}
          <div className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
            {NAV_ITEMS.filter(item => isTabAllowed(item.id, currentRole)).map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative ${
                    isActive
                      ? 'bg-[#1336E8] text-white shadow-sm shadow-[#1336E8]/25'
                      : 'text-[#344054] hover:bg-[#F6F8FC] hover:text-[#101828]'
                  }`}
                  title={item.label}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-[#667085]'
                    }`}
                  />
                  {(!isCollapsed || isMobileOpen) && (
                    <span className="truncate flex-1 text-left">{item.label}</span>
                  )}
                  {item.badge !== undefined && item.badge > 0 && (!isCollapsed || isMobileOpen) && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-white text-[#1336E8]' : 'bg-[#EFF8FF] text-[#1336E8]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer System Status & Role Badge */}
        {(!isCollapsed || isMobileOpen) && (
          <div className="p-3.5 border-t border-[#EAECF0] bg-[#F8F9FC] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#101828]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#12B76A] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#12B76A]"></span>
                </span>
                <span>System Online</span>
              </span>
              <span className="text-[10px] font-mono text-[#667085] bg-white px-1.5 py-0.5 rounded border border-[#EAECF0]">v2.4.0</span>
            </div>
            <div className="text-[10px] font-mono text-[#667085] flex items-center justify-between">
              <span>DB: SQLite WAL</span>
              <span className="text-[#1336E8] font-semibold">n8n Connected</span>
            </div>
            <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-medium">Role Policy:</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${getRolePermissions(currentRole).badgeClass}`}>
                {currentRole}
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
