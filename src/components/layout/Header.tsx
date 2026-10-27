import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Search,
  CheckCircle2,
  Calendar,
  ChevronDown,
  Menu,
  X,
  Shield,
  UserCheck,
  Camera,
  KeyRound,
  LogOut,
  LogIn,
  Upload,
  ExternalLink,
  Sparkles,
  Building2
} from 'lucide-react';
import { Brand, InAppNotification, RoleName, User } from '../../../server/src/types';
import { formatISTTime } from '../../utils/timezone';
import { api } from '../../api/client';
import { getRolePermissions } from '../../utils/rbac';

interface HeaderProps {
  brands: Brand[];
  selectedBrandId: number | null;
  onSelectBrand: (brandId: number | null) => void;
  notifications: InAppNotification[];
  currentUser?: User | null;
  currentRole: RoleName;
  onChangeRole?: (role: RoleName) => void;
  onOpenN8nStatus: () => void;
  onToggleMobileMenu?: () => void;
  isMobileMenuOpen?: boolean;
  onUpdateCurrentUserImage?: (dataUrl: string) => void;
  onOpenChangePassword?: () => void;
  onOpenLoginModal?: () => void;
  onOpenRegisterBrand?: () => void;
  onSignOut?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  brands,
  selectedBrandId,
  onSelectBrand,
  notifications,
  currentUser,
  currentRole,
  onChangeRole,
  onOpenN8nStatus,
  onToggleMobileMenu,
  isMobileMenuOpen = false,
  onUpdateCurrentUserImage,
  onOpenChangePassword,
  onOpenLoginModal,
  onOpenRegisterBrand,
  onSignOut,
  onNavigateToTab,
}) => {
  const permissions = getRolePermissions(currentRole);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [dateRange] = useState('Last 30 Days');
  const [n8nHealth, setN8nHealth] = useState<{
    reachable: boolean;
    status: 'checking' | 'connected' | 'unreachable' | 'unauthorized';
    latencyMs?: number;
    error?: string;
  }>({ reachable: false, status: 'checking' });

  // Resolve dynamic n8n public URL from environment or backend
  const resolveInitialN8nUrl = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ci360_n8n_url');
      if (
        saved &&
        (saved.includes('trycloudflare.com') ||
          (window.location.hostname.includes('webtrionix.com') && saved.includes('localhost')))
      ) {
        localStorage.removeItem('ci360_n8n_url');
      } else if (saved && saved.startsWith('http')) {
        return saved.replace(/\/$/, '');
      }
    }
    const envUrl = import.meta.env.VITE_N8N_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http') && !envUrl.includes('trycloudflare.com')) {
      return envUrl.replace(/\/$/, '');
    }
    return 'https://n8n.webtrionix.com';
  };

  const [n8nBaseUrl, setN8nBaseUrl] = useState<string>(resolveInitialN8nUrl);

  // Real backend health check GET {N8N_URL}/healthz via /api/v1/n8n/health
  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await api.getN8nHealth();
        if (!isMounted) return;
        if (res.url && !res.url.includes('trycloudflare.com')) {
          const cleanUrl = res.url.replace(/\/$/, '');
          setN8nBaseUrl(cleanUrl);
          localStorage.setItem('ci360_n8n_url', cleanUrl);
        }
        if (res.reachable) {
          setN8nHealth({ reachable: true, status: 'connected', latencyMs: res.latencyMs });
        } else if (res.status === 'unauthorized') {
          setN8nHealth({ reachable: false, status: 'unauthorized', latencyMs: res.latencyMs, error: res.error });
        } else {
          setN8nHealth({ reachable: false, status: 'unreachable', latencyMs: res.latencyMs, error: res.error });
        }
      } catch (err: any) {
        if (!isMounted) return;
        setN8nHealth({
          reachable: false,
          status: 'unreachable',
          error: err.message || 'n8n instance is unreachable',
        });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  const handleHeaderAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateCurrentUserImage) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 320;
        let { width, height } = img;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          onUpdateCurrentUserImage(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          onUpdateCurrentUserImage(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Auto-hide dropdowns when clicking anywhere outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsNotifOpen(false);
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="h-16 px-3 sm:px-6 bg-white border-b border-[#EAECF0] flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30">
      {/* Left: Mobile Drawer Trigger + Brand Switcher + Global Search */}
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        {/* Mobile Hamburger Drawer Toggle */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-[#344054] hover:bg-[#F2F4F7] transition-colors shrink-0"
          aria-label={isMobileMenuOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
          title="Toggle Navigation"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        {/* Brand Dropdown */}
        <div className="relative shrink-0">
          <select
            value={selectedBrandId || ''}
            onChange={e => onSelectBrand(e.target.value ? Number(e.target.value) : null)}
            className="h-9 pl-2.5 pr-7 sm:pl-3 sm:pr-8 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs font-semibold text-[#101828] focus:outline-none focus:border-[#1336E8] cursor-pointer appearance-none transition-colors max-w-[140px] sm:max-w-[190px] md:max-w-[240px] truncate shadow-xs"
          >
            <option value="">{brands.length > 0 ? `All Brands (${brands.length})` : 'All Brands'}</option>
            {brands.map(b => (
              <option key={b.id || b.name} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[#667085] absolute right-2 sm:right-2.5 top-3 pointer-events-none" />
        </div>

        {/* Global Search - shown on xl screens to maintain breathing space on tablet */}
        <div className="relative flex-1 hidden xl:block max-w-md">
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search posts, campaigns, tags..."
            className="w-full h-9 pl-9 pr-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] placeholder-[#667085] focus:outline-none focus:border-[#1336E8] transition-colors"
          />
        </div>
      </div>

      {/* Right: n8n Status, Register Brand, Date Range, Notifications & User */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                {/* CI360 AI Neural Studio Direct Nav Button */}
        <button
          type="button"
          onClick={() => onNavigateToTab?.('ai-studio')}
          className="h-8 px-2 sm:px-2.5 rounded-lg border border-violet-400/50 bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white flex items-center gap-1.5 text-[11px] font-bold shadow-xs hover:shadow-md transition-all cursor-pointer shrink-0"
          title="Open CI360 AI Neural Studio and Predictive Feed Intelligence"
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-200 animate-pulse" />
          <span className="hidden sm:inline">AI Neural Studio</span>
          <span className="px-1.5 py-0.5 rounded bg-white/20 text-[9px] uppercase font-mono font-extrabold hidden md:inline">AI v2</span>
        </button>

        {/* Direct n8n Workflows Link (opens in new tab) - Only if role has automation permissions */}
        {permissions.canAccessAutomations && (
          <a
            href={`${n8nBaseUrl}/home/workflows`}
            target="_blank"
            rel="noreferrer"
            className="h-8 px-2 sm:px-2.5 rounded-lg border border-[#D0D5DD] bg-white hover:bg-[#F2F4F7] flex items-center gap-1.5 text-[11px] font-semibold text-[#101828] transition-colors shrink-0 shadow-xs"
            title={`Open live n8n Workflows in new tab (${n8nBaseUrl})`}
          >
            <span className="w-2 h-2 rounded-full bg-[#FF6D5A]"></span>
            <span className="hidden sm:inline font-mono">n8n Workflows</span>
            <ExternalLink className="w-3 h-3 text-[#667085]" />
          </a>
        )}

        {/* Real n8n Health Status Pill - Only if role has automation permissions */}
        {permissions.canAccessAutomations && (
          <button
            onClick={onOpenN8nStatus}
            className="h-8 px-2 sm:px-2.5 rounded-lg border border-[#D0D5DD] bg-[#F6F8FC] hover:bg-[#F2F4F7] flex items-center gap-1.5 text-[11px] font-medium text-[#344054] transition-colors shrink-0"
            title={
              n8nHealth.status === 'connected'
                ? `n8n Connected (${n8nHealth.latencyMs}ms) via ${n8nBaseUrl}`
                : n8nHealth.status === 'unauthorized'
                ? `n8n Auth Required: ${n8nHealth.error}`
                : n8nHealth.status === 'unreachable'
                ? `n8n Offline: ${n8nHealth.error || 'Server unreachable'}`
                : 'Checking n8n connection...'
            }
          >
            <span
              className={`w-2 h-2 rounded-full ring-2 ${
                n8nHealth.status === 'connected'
                  ? 'bg-[#12B76A] ring-[#12B76A]/20'
                  : n8nHealth.status === 'checking'
                  ? 'bg-amber-400 ring-amber-400/20 animate-pulse'
                  : n8nHealth.status === 'unauthorized'
                  ? 'bg-amber-500 ring-amber-500/20'
                  : 'bg-rose-500 ring-rose-500/20'
              }`}
            ></span>
            <span className="hidden sm:inline font-mono">
              {n8nHealth.status === 'connected'
                ? `n8n Connected${n8nHealth.latencyMs ? ` (${n8nHealth.latencyMs}ms)` : ''}`
                : n8nHealth.status === 'checking'
                ? 'n8n Checking...'
                : n8nHealth.status === 'unauthorized'
                ? 'n8n Auth Key Err'
                : 'n8n Disconnected'}
            </span>
          </button>
        )}

        {/* Quick Brand Onboarding Trigger */}
        {onOpenRegisterBrand && (
          <button
            onClick={onOpenRegisterBrand}
            className="h-8 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-[#1336E8]/10 to-[#08C5E1]/15 hover:from-[#1336E8]/20 hover:to-[#08C5E1]/25 border border-[#1336E8]/30 text-[#1336E8] text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            title="Register a new Brand & configure channels"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#1336E8]" />
            <span className="hidden sm:inline">Register Brand</span>
          </button>
        )}

        {/* Date Range Selector (Hidden on mobile & tablet) */}
        <div className="hidden 2xl:flex items-center gap-1.5 h-8 px-2.5 bg-[#F6F8FC] border border-[#D0D5DD] rounded-lg text-xs font-medium text-[#344054]">
          <Calendar className="w-3.5 h-3.5 text-[#667085]" />
          <span>{dateRange}</span>
        </div>

        {/* Notifications Bell Dropdown */}
        <div className="relative shrink-0" ref={notifRef}>
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              if (!isNotifOpen) setIsProfileOpen(false);
            }}
            className="w-9 h-9 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F6F8FC] flex items-center justify-center text-[#344054] relative transition-colors"
            aria-label="View notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#F04438] text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-[#EAECF0] rounded-2xl shadow-xl p-3 z-50 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-[#EAECF0] pb-2 px-1">
                <span className="text-xs font-bold text-[#101828]">Activity Notifications</span>
                <span className="text-[11px] text-[#1336E8] cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className={`p-2.5 rounded-xl text-xs space-y-1 transition-colors ${
                      n.isRead ? 'bg-[#F9FAFB] text-[#475467]' : 'bg-[#EFF8FF] text-[#1D2939]'
                    }`}
                  >
                    <div className="font-semibold text-[11px] text-[#101828]">{n.title}</div>
                    <p className="text-[11px] leading-relaxed line-clamp-2">{n.message}</p>
                    <span className="text-[10px] text-[#98A2B3] block font-mono">
                      {formatISTTime(n.createdAt, false)} IST
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Hidden File Input for Instant Photo Upload */}
        <input
          ref={avatarFileRef}
          type="file"
          accept="image/*"
          onChange={handleHeaderAvatarChange}
          className="hidden"
        />

        {/* User Profile & Auth Section */}
        {currentUser ? (
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setIsProfileOpen(!isProfileOpen);
                if (!isProfileOpen) setIsNotifOpen(false);
              }}
              className="flex items-center gap-1.5 sm:gap-2 pl-1 pr-1.5 sm:pr-2 py-1 rounded-xl border border-[#D0D5DD] hover:bg-[#F6F8FC] transition-colors cursor-pointer"
              aria-label="User profile menu"
            >
              <div className="relative group/headerAvatar">
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.fullName}
                    className="w-7 h-7 rounded-lg object-cover border border-[#EAECF0]"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-[#1336E8]/10 text-[#1336E8] font-bold text-xs flex items-center justify-center border border-[#EAECF0]">
                    {(currentUser?.fullName || 'U').substring(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-semibold text-[#101828] block leading-tight">
                  {currentUser.fullName}
                </span>
                <span className="text-[10px] text-[#1336E8] font-medium block leading-tight">
                  {currentUser.role || currentRole}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#667085]" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-[#EAECF0] rounded-2xl shadow-xl p-3 z-50 space-y-3 animate-in fade-in duration-150">
                {/* Profile Card Header */}
                <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="relative group/menuAvatar shrink-0">
                    {currentUser?.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.fullName}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#1336E8]/10 text-[#1336E8] font-bold text-sm flex items-center justify-center border border-[#EAECF0]">
                        {(currentUser?.fullName || 'U').substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        avatarFileRef.current?.click();
                        setIsProfileOpen(false);
                      }}
                      title="Upload new profile image"
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1336E8] text-white rounded-full flex items-center justify-center shadow-xs hover:bg-[#0E27B3] transition-colors cursor-pointer"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">{currentUser.fullName}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{currentUser.email}</div>
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                      {currentUser.role || currentRole}
                    </span>
                  </div>
                </div>

                {/* Profile Actions */}
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      avatarFileRef.current?.click();
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#1336E8]" />
                    <span>Update Profile Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onOpenChangePassword?.();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#1336E8]" />
                    <span>Change Password</span>
                  </button>
                  {onOpenRegisterBrand && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        onOpenRegisterBrand();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#1336E8] hover:bg-blue-50 transition-colors flex items-center gap-2 cursor-pointer"
                    >
                      <Building2 className="w-3.5 h-3.5 text-[#1336E8]" />
                      <span>Onboard New Brand</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onSignOut?.();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenLoginModal}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
