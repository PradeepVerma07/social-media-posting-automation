import React, { useState, useRef } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Search,
  Filter,
  Shield,
  CheckCircle2,
  XCircle,
  X,
  Mail,
  UserCheck,
  Building2,
  KeyRound,
  MoreVertical,
  Check,
  Camera,
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  Sparkles,
  RotateCcw,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { User, RoleName } from '../../../server/src/types';
import { getRolePermissions } from '../../utils/rbac';

interface TeamPageProps {
  users: User[];
  currentRole: RoleName;
  onAddUser: (userData: {
    fullName: string;
    email: string;
    role: RoleName;
    tenantScope: string;
    isActive: boolean;
    avatarUrl?: string;
    password?: string;
  }) => Promise<void>;
  onUpdateUser: (id: number, updates: Partial<User>) => Promise<void>;
  onDeleteUser: (id: number) => Promise<void>;
}

export const PRESET_AVATARS = [
  {
    id: 'david',
    label: 'David Vance',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&h=240&q=80',
  },
  {
    id: 'elena',
    label: 'Elena Rostova',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=240&h=240&q=80',
  },
  {
    id: 'marcus',
    label: 'Marcus Sterling',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=240&h=240&q=80',
  },
  {
    id: 'sophia',
    label: 'Sophia Al-Mansoor',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=240&h=240&q=80',
  },
  {
    id: 'alex',
    label: 'Alex Rivera',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=240&h=240&q=80',
  },
  {
    id: 'maya',
    label: 'Maya Chen',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=240&h=240&q=80',
  },
  {
    id: 'kevin',
    label: 'Kevin Thorne',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&h=240&q=80',
  },
  {
    id: 'chloe',
    label: 'Chloe Dubois',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=240&h=240&q=80',
  },
];

const ROLE_OPTIONS: { role: RoleName; label: string; desc: string; badgeClass: string }[] = [
  {
    role: 'Super Admin',
    label: 'Super Admin',
    desc: 'Unrestricted full access across all brands, integrations, and RBAC policies.',
    badgeClass: 'bg-[#EFF8FF] text-[#1336E8] border-[#B2DDFF]',
  },
  {
    role: 'Admin',
    label: 'Admin',
    desc: 'Manage workflows, social accounts, and team members within their assigned brands.',
    badgeClass: 'bg-[#F4EBFF] text-[#6941C6] border-[#D6BBFB]',
  },
  {
    role: 'Content Manager',
    label: 'Content Manager',
    desc: 'Draft, schedule, and submit content campaigns across authorized channels.',
    badgeClass: 'bg-[#ECFDF3] text-[#027A48] border-[#A6F4C5]',
  },
  {
    role: 'Approver',
    label: 'Approver',
    desc: 'Review, approve, request revisions, or reject queued multi-channel posts.',
    badgeClass: 'bg-[#FEF0C7] text-[#B54708] border-[#FEDF89]',
  },
  {
    role: 'Analyst',
    label: 'Analyst',
    desc: 'Read-only access to campaign analytics, execution metrics, and reporting.',
    badgeClass: 'bg-[#E0F2FE] text-[#0284C7] border-[#BAE6FD]',
  },
  {
    role: 'Client',
    label: 'Client',
    desc: 'View drafts and provide brand approval feedback for assigned brand accounts.',
    badgeClass: 'bg-[#F2F4F7] text-[#344054] border-[#EAECF0]',
  },
];

const TENANT_OPTIONS = [
  'Global (All Brands)',
  'Nexus & Starlight',
  'Nexus Enterprise Cloud Only',
  'Starlight Consumer Tech Only',
];

export const TeamPage: React.FC<TeamPageProps> = ({
  users,
  currentRole,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}) => {
  const permissions = getRolePermissions(currentRole);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  
  // Dedicated Avatar Edit Modal
  const [avatarModalUser, setAvatarModalUser] = useState<User | null>(null);
  const [avatarModalUrl, setAvatarModalUrl] = useState<string>('');
  const [avatarTab, setAvatarTab] = useState<'upload' | 'presets' | 'url'>('presets');
  const [avatarUploadError, setAvatarUploadError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'Content Manager' as RoleName,
    tenantScope: 'Global (All Brands)',
    isActive: true,
    avatarUrl: '',
    password: '',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Hidden File input refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formFileInputRef = useRef<HTMLInputElement>(null);

  // Client-side Canvas Image Compressor: converts any image to crisp ~30KB JPEG
  const compressImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
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
            resolve(canvas.toDataURL('image/jpeg', 0.85));
          } else {
            resolve(dataUrl);
          }
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Filtered users
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.tenantScope && user.tenantScope.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesRole =
      selectedRoleFilter === 'all' || user.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: RoleName) => {
    switch (role) {
      case 'Super Admin':
        return 'bg-[#EFF8FF] text-[#1336E8]';
      case 'Content Manager':
        return 'bg-[#ECFDF3] text-[#027A48]';
      case 'Approver':
        return 'bg-[#FEF0C7] text-[#B54708]';
      case 'Client':
        return 'bg-[#F2F4F7] text-[#344054]';
      case 'Admin':
        return 'bg-[#F4EBFF] text-[#6941C6]';
      case 'Analyst':
        return 'bg-[#E0F2FE] text-[#0284C7]';
      default:
        return 'bg-[#F2F4F7] text-[#475467]';
    }
  };

  const handleOpenAddModal = () => {
    setFormData({
      fullName: '',
      email: '',
      role: 'Content Manager',
      tenantScope: 'Global (All Brands)',
      isActive: true,
      avatarUrl: PRESET_AVATARS[0].url,
      password: 'Admin@123',
    });
    setShowPassword(false);
    setFormError('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      tenantScope: user.tenantScope || 'Global (All Brands)',
      isActive: user.isActive,
      avatarUrl: user.avatarUrl || '',
      password: '',
    });
    setShowPassword(false);
    setFormError('');
  };

  const handleOpenAvatarModal = (user: User) => {
    setAvatarModalUser(user);
    setAvatarModalUrl(user.avatarUrl || '');
    setAvatarTab('presets');
    setAvatarUploadError('');
  };

  // File upload reader for Avatar Modal
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarUploadError('Please select a valid image file (PNG, JPG, WebP, GIF)');
      return;
    }

    try {
      const compressed = await compressImageFile(file);
      setAvatarModalUrl(compressed);
      setAvatarUploadError('');
    } catch {
      setAvatarUploadError('Failed to process image file');
    }
  };

  // File upload reader for Form Modals (Add / Edit)
  const handleFormFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Please select a valid image file (PNG, JPG, WebP)');
      return;
    }

    try {
      const compressed = await compressImageFile(file);
      setFormData(prev => ({ ...prev, avatarUrl: compressed }));
      setFormError('');
    } catch {
      setFormError('Failed to process image file');
    }
  };

  const handleSaveAvatarModal = async () => {
    if (!avatarModalUser) return;
    setIsSubmitting(true);
    setAvatarUploadError('');
    try {
      await onUpdateUser(avatarModalUser.id, { avatarUrl: avatarModalUrl });
      setAvatarModalUser(null);
    } catch (err: any) {
      setAvatarUploadError(err.message || 'Failed to update user image.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim()) {
      setFormError('Please enter both full name and email address.');
      return;
    }
    if (!formData.email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      await onAddUser(formData);
      setIsAddModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to add team member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!formData.fullName.trim() || !formData.email.trim()) {
      setFormError('Please enter both full name and email address.');
      return;
    }
    if (!formData.email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      const payload: any = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role,
        tenantScope: formData.tenantScope,
        isActive: formData.isActive,
        avatarUrl: formData.avatarUrl,
      };
      if (formData.password && formData.password.trim()) {
        payload.password = formData.password.trim();
      }
      await onUpdateUser(editingUser.id, payload);
      setEditingUser(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update team member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingUser) return;
    setIsSubmitting(true);
    try {
      await onDeleteUser(deletingUser.id);
      setDeletingUser(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete member.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#101828] tracking-tight">
            Team &amp; Role-Based Access Control
          </h2>
          <p className="text-xs text-[#667085] mt-1 leading-relaxed">
            Manage members, edit profile images, and configure roles across Super Admin, Admin, Content Manager, Approver, Analyst, and Client.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          {permissions.canManageTeam ? (
            <button
              onClick={handleOpenAddModal}
              className="w-full sm:w-auto h-9 sm:h-10 px-4 bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all shadow-[#1336E8]/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Member</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium">
              View-Only ({currentRole})
            </span>
          )}
        </div>
      </div>

      {/* Overview Stat Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAECF0] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Total Members</div>
          <div className="text-lg sm:text-2xl font-bold text-[#101828] mt-1">{users.length}</div>
          <div className="text-[10px] text-[#12B76A] font-medium mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A]"></span>
            {users.filter(u => u.isActive).length} active now
          </div>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAECF0] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Configured Roles</div>
          <div className="text-lg sm:text-2xl font-bold text-[#101828] mt-1">6 Roles</div>
          <div className="text-[10px] text-[#475467] font-medium mt-0.5">Granular RBAC</div>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAECF0] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Tenant Scopes</div>
          <div className="text-lg sm:text-2xl font-bold text-[#1336E8] mt-1">Multi-Tenant</div>
          <div className="text-[10px] text-[#667085] mt-0.5">Brand-level isolation</div>
        </div>
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#EAECF0] shadow-sm">
          <div className="text-[11px] font-semibold text-[#667085]">Current Session</div>
          <div className="text-lg sm:text-2xl font-bold text-[#101828] truncate mt-1">
            {currentRole}
          </div>
          <div className="text-[10px] text-[#12B76A] font-medium mt-0.5">Full simulation</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-[#EAECF0] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, email, or tenant..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-[#101828] placeholder-[#667085] focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-[#667085] shrink-0" />
          <select
            value={selectedRoleFilter}
            onChange={e => setSelectedRoleFilter(e.target.value)}
            className="h-9 px-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs font-semibold text-[#344054] focus:outline-none focus:border-[#1336E8] cursor-pointer"
          >
            <option value="all">All Roles</option>
            {ROLE_OPTIONS.map(r => (
              <option key={r.role} value={r.role}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Desktop Table View (Hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F9FAFB] border-b border-[#EAECF0] text-[#475467] font-semibold">
            <tr>
              <th className="py-3 px-4">Member &amp; Photo</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Tenant Scope</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#EAECF0]">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-[#667085]">
                  No team members found matching your filter criteria.
                </td>
              </tr>
            ) : (
              filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-[#F9FAFB] transition-colors group">
                  <td className="py-3.5 px-4 font-bold text-[#101828]">
                    <div className="flex items-center gap-3">
                      {/* Interactive Editable Avatar Trigger */}
                      <div className="relative group/avatar shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenAvatarModal(u)}
                          className="relative w-9 h-9 rounded-full bg-[#1336E8]/10 text-[#1336E8] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden border border-[#EAECF0] hover:ring-2 hover:ring-[#1336E8] hover:shadow-md transition-all cursor-pointer focus:outline-none"
                          title={`Click to edit photo for ${u.fullName}`}
                        >
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt={u.fullName} className="w-full h-full object-cover" />
                          ) : (
                            u.fullName.substring(0, 2).toUpperCase()
                          )}
                          <div className="absolute inset-0 bg-black/45 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Camera className="w-3.5 h-3.5" />
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenAvatarModal(u)}
                          title="Edit photo"
                          className="absolute -bottom-1 -right-1 w-4 h-4 bg-white rounded-full border border-[#D0D5DD] flex items-center justify-center text-[#1336E8] shadow-xs hover:bg-[#EFF8FF] transition-colors cursor-pointer"
                        >
                          <Camera className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <div>
                        <div className="font-bold text-[#101828] flex items-center gap-1.5">
                          <span>{u.fullName}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenAvatarModal(u)}
                            className="opacity-0 group-hover:opacity-100 text-[10px] text-[#1336E8] hover:underline flex items-center gap-0.5 font-normal transition-opacity"
                            title="Change photo"
                          >
                            <Camera className="w-2.5 h-2.5" />
                            <span>Edit photo</span>
                          </button>
                        </div>
                        {u.id === 1 && (
                          <span className="text-[10px] text-[#667085] font-normal block">Master Account</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-[#667085] font-mono text-[11px]">{u.email}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getRoleBadge(u.role)}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#475467]">{u.tenantScope || 'Global (All Brands)'}</td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onUpdateUser(u.id, { isActive: !u.isActive })}
                      title="Click to toggle status"
                      className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
                    >
                      <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-[#12B76A]' : 'bg-[#98A2B3]'}`}></span>
                      <span className={`font-bold ${u.isActive ? 'text-[#12B76A]' : 'text-[#667085]'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {permissions.canManageTeam ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenAvatarModal(u)}
                          className="p-1.5 text-[#344054] hover:text-[#1336E8] hover:bg-[#EFF8FF] rounded-lg transition-colors cursor-pointer"
                          title="Edit member photo"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="p-1.5 text-[#344054] hover:text-[#1336E8] hover:bg-[#EFF8FF] rounded-lg transition-colors cursor-pointer"
                          title="Edit member details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingUser(u)}
                          disabled={u.id === 1}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.id === 1
                              ? 'text-[#D0D5DD] cursor-not-allowed'
                              : 'text-[#667085] hover:text-[#F04438] hover:bg-[#FEF3F2] cursor-pointer'
                          }`}
                          title={u.id === 1 ? 'Primary Super Admin cannot be deleted' : 'Delete team member'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-mono">Protected</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Visible only on mobile screens) */}
      <div className="md:hidden space-y-3">
        {filteredUsers.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-[#EAECF0] text-center text-xs text-[#667085]">
            No team members found matching your filter criteria.
          </div>
        ) : (
          filteredUsers.map(u => (
            <div
              key={u.id}
              className="bg-white p-4 rounded-2xl border border-[#EAECF0] shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Interactive Editable Avatar Trigger Mobile */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenAvatarModal(u)}
                      className="relative w-12 h-12 rounded-full bg-[#1336E8]/10 text-[#1336E8] font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden border border-[#EAECF0] active:scale-95 transition-transform cursor-pointer"
                      title="Tap to change photo"
                    >
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt={u.fullName} className="w-full h-full object-cover" />
                      ) : (
                        u.fullName.substring(0, 2).toUpperCase()
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 active:opacity-100 transition-opacity">
                        <Camera className="w-4 h-4" />
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAvatarModal(u)}
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full border border-[#D0D5DD] flex items-center justify-center text-[#1336E8] shadow-xs active:bg-[#EFF8FF]"
                    >
                      <Camera className="w-3 h-3" />
                    </button>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-[#101828] leading-tight flex items-center gap-1.5">
                      <span>{u.fullName}</span>
                      <button
                        type="button"
                        onClick={() => handleOpenAvatarModal(u)}
                        className="text-[10px] text-[#1336E8] font-normal underline"
                      >
                        Change photo
                      </button>
                    </h3>
                    <p className="text-[11px] text-[#667085] font-mono mt-0.5">{u.email}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${getRoleBadge(u.role)}`}>
                  {u.role}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-[#F2F4F7]">
                <div>
                  <span className="text-[#667085] block text-[10px]">Tenant Scope:</span>
                  <span className="font-medium text-[#344054] truncate block">
                    {u.tenantScope || 'Global (All Brands)'}
                  </span>
                </div>
                <div>
                  <span className="text-[#667085] block text-[10px]">Status:</span>
                  <button
                    onClick={() => onUpdateUser(u.id, { isActive: !u.isActive })}
                    className="flex items-center gap-1 font-bold mt-0.5"
                  >
                    <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-[#12B76A]' : 'bg-[#98A2B3]'}`}></span>
                    <span className={u.isActive ? 'text-[#12B76A]' : 'text-[#667085]'}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </button>
                </div>
              </div>

              {permissions.canManageTeam ? (
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F2F4F7]">
                  <button
                    onClick={() => handleOpenAvatarModal(u)}
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-xs font-semibold text-[#344054] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-[#1336E8]" />
                    <span>Photo</span>
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(u)}
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-xs font-semibold text-[#344054] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#1336E8]" />
                    <span>Edit Details</span>
                  </button>
                  <button
                    onClick={() => setDeletingUser(u)}
                    disabled={u.id === 1}
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      u.id === 1
                        ? 'border-[#EAECF0] text-[#D0D5DD] bg-[#F9FAFB] cursor-not-allowed'
                        : 'border-[#FECDCA] text-[#F04438] bg-[#FEF3F2] hover:bg-[#FEE4E2] cursor-pointer'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-[#F2F4F7] text-right">
                  <span className="text-[11px] text-slate-400 font-mono">Protected Member</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Role Permission Reference Card */}
      <div className="bg-[#F8F9FC] rounded-2xl border border-[#EAECF0] p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#1336E8]" />
          <h3 className="text-xs font-bold text-[#101828]">Role Permission Matrix (RBAC)</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {ROLE_OPTIONS.map(opt => (
            <div key={opt.role} className="bg-white p-2.5 rounded-xl border border-[#EAECF0] text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#101828] text-[11px]">{opt.label}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${opt.badgeClass}`}>
                  {opt.role}
                </span>
              </div>
              <p className="text-[11px] text-[#667085] leading-normal">{opt.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* --- DEDICATED QUICK AVATAR EDIT MODAL --- */}
      {avatarModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#EAECF0] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#EAECF0] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EFF8FF] text-[#1336E8] flex items-center justify-center font-bold">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#101828]">Edit Profile Photo</h3>
                  <p className="text-[11px] text-[#667085]">{avatarModalUser.fullName} ({avatarModalUser.role})</p>
                </div>
              </div>
              <button
                onClick={() => setAvatarModalUser(null)}
                className="p-1 rounded-lg text-[#667085] hover:bg-[#F2F4F7] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {avatarUploadError && (
                <div className="p-3 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{avatarUploadError}</span>
                </div>
              )}

              {/* Large Circular Avatar Preview */}
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="relative group/avatarPreview">
                  <div className="w-24 h-24 rounded-full ring-4 ring-[#EFF8FF] border-2 border-[#1336E8] overflow-hidden bg-[#F9FAFB] flex items-center justify-center shadow-md">
                    {avatarModalUrl ? (
                      <img src={avatarModalUrl} alt={avatarModalUser.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-[#1336E8]">
                        {avatarModalUser.fullName.substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-[#1336E8] hover:bg-[#0E27B3] text-white rounded-full shadow-md border-2 border-white transition-all cursor-pointer"
                    title="Upload new image"
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  {avatarModalUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarModalUrl('')}
                      className="text-[11px] text-[#F04438] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Use initials avatar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Tab Selector: Upload, Presets, Image URL */}
              <div className="flex rounded-xl bg-[#F2F4F7] p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setAvatarTab('presets')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    avatarTab === 'presets'
                      ? 'bg-white text-[#1336E8] shadow-xs'
                      : 'text-[#667085] hover:text-[#101828]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Presets</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab('upload')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    avatarTab === 'upload'
                      ? 'bg-white text-[#1336E8] shadow-xs'
                      : 'text-[#667085] hover:text-[#101828]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAvatarTab('url')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    avatarTab === 'url'
                      ? 'bg-white text-[#1336E8] shadow-xs'
                      : 'text-[#667085] hover:text-[#101828]'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Image URL</span>
                </button>
              </div>

              {/* Tab 1: Presets Grid */}
              {avatarTab === 'presets' && (
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-[#475467] block">
                    Choose from curated professional portraits:
                  </span>
                  <div className="grid grid-cols-4 gap-2.5">
                    {PRESET_AVATARS.map(preset => {
                      const isSelected = avatarModalUrl === preset.url;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setAvatarModalUrl(preset.url)}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all p-0.5 cursor-pointer ${
                            isSelected
                              ? 'border-[#1336E8] ring-2 ring-[#1336E8]/30 scale-105'
                              : 'border-[#EAECF0] hover:border-[#D0D5DD] hover:scale-102'
                          }`}
                          title={preset.label}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-full h-full object-cover rounded-lg"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#1336E8]/20 flex items-center justify-center">
                              <div className="w-5 h-5 rounded-full bg-[#1336E8] text-white flex items-center justify-center shadow-xs">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 2: Upload File Area */}
              {avatarTab === 'upload' && (
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#D0D5DD] hover:border-[#1336E8] rounded-xl p-6 text-center cursor-pointer transition-colors bg-[#F9FAFB] hover:bg-[#EFF8FF]/30 flex flex-col items-center justify-center gap-2"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#EFF8FF] text-[#1336E8] flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-xs text-[#1336E8] hover:underline">
                        Click to upload an image
                      </span>{' '}
                      <span className="text-[#667085]">from your device</span>
                    </div>
                    <p className="text-[10px] text-[#667085]">Supports PNG, JPG, WebP or GIF (up to 5MB)</p>
                  </div>
                </div>
              )}

              {/* Tab 3: Direct URL Input */}
              {avatarTab === 'url' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#344054]">
                    Paste Web Image URL
                  </label>
                  <div className="relative">
                    <LinkIcon className="w-4 h-4 text-[#667085] absolute left-3 top-2.5" />
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={avatarModalUrl}
                      onChange={e => setAvatarModalUrl(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] placeholder-[#667085] focus:outline-none focus:border-[#1336E8] focus:bg-white transition-colors"
                    />
                  </div>
                  <p className="text-[10px] text-[#667085]">
                    Enter any HTTPS image link to preview and apply.
                  </p>
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EAECF0]">
                <button
                  type="button"
                  onClick={() => setAvatarModalUser(null)}
                  className="px-4 py-2 rounded-xl border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F2F4F7] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAvatarModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Saving Image...' : 'Save Photo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ADD MEMBER MODAL --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#EAECF0] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#EAECF0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EFF8FF] text-[#1336E8] flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#101828]">Add Team Member</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-[#667085] hover:bg-[#F2F4F7] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="p-6 space-y-4 text-xs overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Avatar Selector in Add Member Modal */}
              <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#EAECF0] space-y-3">
                <label className="block text-xs font-semibold text-[#344054]">
                  Profile Avatar / Image
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full ring-2 ring-[#1336E8] overflow-hidden bg-white shrink-0 border border-[#EAECF0] flex items-center justify-center shadow-xs">
                    {formData.avatarUrl ? (
                      <img src={formData.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-[#1336E8] text-sm">
                        {formData.fullName ? formData.fullName.substring(0, 2).toUpperCase() : 'NEW'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={formFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFormFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => formFileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-lg border border-[#D0D5DD] bg-white hover:bg-[#F2F4F7] text-xs font-semibold text-[#344054] flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#1336E8]" />
                        <span>Upload photo</span>
                      </button>
                      {formData.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, avatarUrl: '' }))}
                          className="text-[11px] text-[#667085] hover:text-[#F04438] hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {/* Preset Avatars Row */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      {PRESET_AVATARS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, avatarUrl: preset.url }))}
                          className={`w-7 h-7 rounded-full overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                            formData.avatarUrl === preset.url
                              ? 'border-[#1336E8] ring-2 ring-[#1336E8]/30 scale-105'
                              : 'border-[#EAECF0] hover:scale-105'
                          }`}
                          title={preset.label}
                        >
                          <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rachel Adams"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="e.g. rachel@ci360.internal"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Login Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="e.g. Admin@123"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-10 pl-3 pr-10 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#667085] hover:text-[#101828]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-[#667085] mt-1 block">
                  Default credential for new member login: <code className="font-mono font-bold text-[#1336E8]">Admin@123</code>
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Assigned Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as RoleName })}
                  className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8] cursor-pointer"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.role} value={r.role}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-[#667085] mt-1 block">
                  {ROLE_OPTIONS.find(r => r.role === formData.role)?.desc}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Tenant Scope</label>
                <select
                  value={formData.tenantScope}
                  onChange={e => setFormData({ ...formData, tenantScope: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8] cursor-pointer"
                >
                  {TENANT_OPTIONS.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="add-is-active"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1336E8] focus:ring-[#1336E8]"
                />
                <label htmlFor="add-is-active" className="text-xs font-medium text-[#344054] cursor-pointer">
                  Activate account immediately (send invite credential email)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EAECF0]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F2F4F7] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : 'Create Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT MEMBER MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-[#EAECF0] overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-[#EAECF0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#EFF8FF] text-[#1336E8] flex items-center justify-center font-bold">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-[#101828]">Edit Member: {editingUser.fullName}</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-[#667085] hover:bg-[#F2F4F7] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4 text-xs overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] flex items-center gap-2">
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Avatar Selector in Edit Member Modal */}
              <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#EAECF0] space-y-3">
                <label className="block text-xs font-semibold text-[#344054]">
                  Profile Avatar / Image
                </label>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full ring-2 ring-[#1336E8] overflow-hidden bg-white shrink-0 border border-[#EAECF0] flex items-center justify-center shadow-xs">
                    {formData.avatarUrl ? (
                      <img src={formData.avatarUrl} alt={formData.fullName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-[#1336E8] text-sm">
                        {formData.fullName ? formData.fullName.substring(0, 2).toUpperCase() : 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        ref={formFileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFormFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => formFileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-lg border border-[#D0D5DD] bg-white hover:bg-[#F2F4F7] text-xs font-semibold text-[#344054] flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#1336E8]" />
                        <span>Upload photo</span>
                      </button>
                      {formData.avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, avatarUrl: '' }))}
                          className="text-[11px] text-[#667085] hover:text-[#F04438] hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {/* Preset Avatars Row */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      {PRESET_AVATARS.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, avatarUrl: preset.url }))}
                          className={`w-7 h-7 rounded-full overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                            formData.avatarUrl === preset.url
                              ? 'border-[#1336E8] ring-2 ring-[#1336E8]/30 scale-105'
                              : 'border-[#EAECF0] hover:scale-105'
                          }`}
                          title={preset.label}
                        >
                          <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8] focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Change Login Password <span className="font-normal text-[#667085]">(leave empty to keep current)</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter new password (optional)"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-10 pl-3 pr-10 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-[#667085] hover:text-[#101828]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Assigned Role</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as RoleName })}
                  className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8] cursor-pointer"
                >
                  {ROLE_OPTIONS.map(r => (
                    <option key={r.role} value={r.role}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-[#667085] mt-1 block">
                  {ROLE_OPTIONS.find(r => r.role === formData.role)?.desc}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Tenant Scope</label>
                <select
                  value={formData.tenantScope}
                  onChange={e => setFormData({ ...formData, tenantScope: e.target.value })}
                  className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8] cursor-pointer"
                >
                  {TENANT_OPTIONS.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded text-[#1336E8] focus:ring-[#1336E8]"
                />
                <label htmlFor="edit-is-active" className="text-xs font-medium text-[#344054] cursor-pointer">
                  User Account Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EAECF0]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F2F4F7] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION DIALOG --- */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-[#EAECF0] p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-[#FEF3F2] text-[#F04438] flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-[#101828]">Remove Team Member</h3>
              <p className="text-xs text-[#667085] leading-relaxed">
                Are you sure you want to remove <strong className="text-[#101828]">{deletingUser.fullName}</strong> ({deletingUser.email})?
                This will immediately revoke their access and permissions across all tenant brands.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="flex-1 py-2 rounded-xl border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F2F4F7] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="flex-1 py-2 rounded-xl bg-[#F04438] hover:bg-[#D92D20] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                {isSubmitting ? 'Removing...' : 'Confirm Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
