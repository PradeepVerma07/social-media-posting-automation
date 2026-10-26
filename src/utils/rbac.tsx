import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import { RoleName } from '../../server/src/types';
import { NavigationTab } from '../components/layout/Sidebar';

export interface RolePermissionConfig {
  label: string;
  badgeClass: string;
  description: string;
  allowedTabs: NavigationTab[];
  canCreatePost: boolean;
  canApprovePost: boolean;
  canPublishPost: boolean;
  canDeletePost: boolean;
  canManageTeam: boolean;
  canManageSettings: boolean;
  canManageAccounts: boolean;
  canManageBrands: boolean;
  canAccessAutomations: boolean;
  canAccessAuditLogs: boolean;
  canAccessSheetsSync: boolean;
  canDirectN8nLogin: boolean;
}

export const ROLE_CONFIGS: Record<RoleName, RolePermissionConfig> = {
  'Super Admin': {
    label: 'Super Admin',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Full unrestricted governance across all brands, integrations, automations, and RBAC policies.',
    allowedTabs: [
      'overview',
      'content',
      'calendar',
      'create',
      'approvals',
      'published',
      'brands',
      'accounts',
      'automations',
      'n8n-login',
      'executions',
      'analytics',
      'sheets',
      'team',
      'audit',
      'settings',
    ],
    canCreatePost: true,
    canApprovePost: true,
    canPublishPost: true,
    canDeletePost: true,
    canManageTeam: true,
    canManageSettings: true,
    canManageAccounts: true,
    canManageBrands: true,
    canAccessAutomations: true,
    canAccessAuditLogs: true,
    canAccessSheetsSync: true,
    canDirectN8nLogin: true,
  },
  'Admin': {
    label: 'Admin',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Manage brand campaigns, workflows, accounts, and team members with administrative oversight.',
    allowedTabs: [
      'overview',
      'content',
      'calendar',
      'create',
      'approvals',
      'published',
      'brands',
      'accounts',
      'automations',
      'executions',
      'analytics',
      'sheets',
      'team',
      'audit',
      'settings',
    ],
    canCreatePost: true,
    canApprovePost: true,
    canPublishPost: true,
    canDeletePost: true,
    canManageTeam: true,
    canManageSettings: true,
    canManageAccounts: true,
    canManageBrands: true,
    canAccessAutomations: true,
    canAccessAuditLogs: true,
    canAccessSheetsSync: true,
    canDirectN8nLogin: false,
  },
  'Content Manager': {
    label: 'Content Manager',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Draft, schedule, and submit content campaigns across authorized channels. Awaits approval.',
    allowedTabs: [
      'overview',
      'content',
      'calendar',
      'create',
      'approvals',
      'published',
      'brands',
      'accounts',
      'automations',
      'executions',
      'analytics',
      'sheets',
    ],
    canCreatePost: true,
    canApprovePost: false,
    canPublishPost: false,
    canDeletePost: false,
    canManageTeam: false,
    canManageSettings: false,
    canManageAccounts: false,
    canManageBrands: false,
    canAccessAutomations: true,
    canAccessAuditLogs: false,
    canAccessSheetsSync: true,
    canDirectN8nLogin: false,
  },
  'Approver': {
    label: 'Approver',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Review queued multi-channel posts, request revisions, reject, or authorize publishing.',
    allowedTabs: [
      'overview',
      'approvals',
      'content',
      'calendar',
      'published',
      'brands',
      'accounts',
      'executions',
      'analytics',
      'sheets',
    ],
    canCreatePost: false,
    canApprovePost: true,
    canPublishPost: true,
    canDeletePost: false,
    canManageTeam: false,
    canManageSettings: false,
    canManageAccounts: false,
    canManageBrands: false,
    canAccessAutomations: false,
    canAccessAuditLogs: false,
    canAccessSheetsSync: true,
    canDirectN8nLogin: false,
  },
  'Analyst': {
    label: 'Analyst',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    description: 'Read-only access to campaign analytics, execution metrics, publishing performance, and audit reporting.',
    allowedTabs: [
      'overview',
      'analytics',
      'executions',
      'published',
      'content',
      'calendar',
    ],
    canCreatePost: false,
    canApprovePost: false,
    canPublishPost: false,
    canDeletePost: false,
    canManageTeam: false,
    canManageSettings: false,
    canManageAccounts: false,
    canManageBrands: false,
    canAccessAutomations: false,
    canAccessAuditLogs: false,
    canAccessSheetsSync: false,
    canDirectN8nLogin: false,
  },
  'Client': {
    label: 'Client',
    badgeClass: 'bg-slate-50 text-slate-700 border-slate-200',
    description: 'Review brand campaign drafts, provide brand feedback, and view published post performance.',
    allowedTabs: [
      'overview',
      'approvals',
      'content',
      'calendar',
      'published',
      'analytics',
    ],
    canCreatePost: false,
    canApprovePost: true, // Brand-level approval/feedback
    canPublishPost: false,
    canDeletePost: false,
    canManageTeam: false,
    canManageSettings: false,
    canManageAccounts: false,
    canManageBrands: false,
    canAccessAutomations: false,
    canAccessAuditLogs: false,
    canAccessSheetsSync: false,
    canDirectN8nLogin: false,
  },
};

export const getRolePermissions = (role: RoleName): RolePermissionConfig => {
  return ROLE_CONFIGS[role] || ROLE_CONFIGS['Client'];
};

export const isTabAllowed = (tab: NavigationTab, role: RoleName): boolean => {
  if (tab === 'register') return true;
  const config = getRolePermissions(role);
  return config.allowedTabs.includes(tab);
};

interface RestrictedAccessProps {
  role: RoleName;
  onGoHome: () => void;
}

export const RestrictedAccess: React.FC<RestrictedAccessProps> = ({ role, onGoHome }) => {
  const permissions = getRolePermissions(role);

  return (
    <div className="flex-1 h-full flex flex-col items-center justify-center p-6 text-center bg-[#F6F8FC]">
      <div className="max-w-md bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-7 h-7" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Access Restricted</h2>
          <p className="text-xs text-slate-500 mt-1">
            This module is reserved for authorized administrative roles.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Your Current Role
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${permissions.badgeClass}`}>
              {role}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {permissions.description}
          </p>
        </div>

        <button
          onClick={onGoHome}
          className="w-full h-10 rounded-xl bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Permitted Workspace</span>
        </button>
      </div>
    </div>
  );
};
