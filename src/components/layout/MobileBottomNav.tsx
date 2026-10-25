import React from 'react';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  CheckSquare,
  BarChart3,
  Menu,
  Users,
  Calendar
} from 'lucide-react';
import { NavigationTab } from './Sidebar';
import { RoleName } from '../../../server/src/types';
import { getRolePermissions } from '../../utils/rbac';

interface MobileBottomNavProps {
  activeTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onOpenMenu: () => void;
  pendingApprovalsCount?: number;
  currentRole?: RoleName;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenMenu,
  pendingApprovalsCount = 0,
  currentRole = 'Super Admin',
}) => {
  const permissions = getRolePermissions(currentRole);

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#EAECF0] z-30 flex items-center justify-around px-2 shadow-lg">
      <button
        onClick={() => onSelectTab('overview')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          activeTab === 'overview' ? 'text-[#1336E8]' : 'text-[#667085]'
        }`}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[10px] font-semibold mt-0.5">Overview</span>
      </button>

      <button
        onClick={() => onSelectTab('content')}
        className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
          activeTab === 'content' ? 'text-[#1336E8]' : 'text-[#667085]'
        }`}
      >
        <FileText className="w-5 h-5" />
        <span className="text-[10px] font-semibold mt-0.5">Content</span>
      </button>

      {permissions.canCreatePost ? (
        <button
          onClick={() => onSelectTab('create')}
          className="flex flex-col items-center justify-center -mt-4 cursor-pointer"
          title="Create Post"
        >
          <div className="w-12 h-12 rounded-full bg-[#1336E8] text-white flex items-center justify-center shadow-lg shadow-[#1336E8]/30">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-[#1336E8] mt-0.5">Create</span>
        </button>
      ) : (
        <button
          onClick={() => onSelectTab('analytics')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'analytics' ? 'text-[#1336E8]' : 'text-[#667085]'
          }`}
        >
          <BarChart3 className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Analytics</span>
        </button>
      )}

      <button
        onClick={() => onSelectTab('approvals')}
        className={`flex flex-col items-center justify-center flex-1 py-1 relative transition-colors ${
          activeTab === 'approvals' ? 'text-[#1336E8]' : 'text-[#667085]'
        }`}
      >
        <div className="relative">
          <CheckSquare className="w-5 h-5" />
          {pendingApprovalsCount > 0 && (
            <span className="absolute -top-1 -right-2 w-4 h-4 bg-[#F04438] text-white rounded-full text-[9px] font-bold flex items-center justify-center">
              {pendingApprovalsCount}
            </span>
          )}
        </div>
        <span className="text-[10px] font-semibold mt-0.5">Queue</span>
      </button>

      {permissions.canManageTeam ? (
        <button
          onClick={() => onSelectTab('team')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'team' ? 'text-[#1336E8]' : 'text-[#667085]'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Team</span>
        </button>
      ) : (
        <button
          onClick={() => onSelectTab('calendar')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            activeTab === 'calendar' ? 'text-[#1336E8]' : 'text-[#667085]'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] font-semibold mt-0.5">Calendar</span>
        </button>
      )}

      <button
        onClick={onOpenMenu}
        className="flex flex-col items-center justify-center flex-1 py-1 text-[#667085] hover:text-[#101828] transition-colors cursor-pointer"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] font-semibold mt-0.5">Menu</span>
      </button>
    </nav>
  );
};
