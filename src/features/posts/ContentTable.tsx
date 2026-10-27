import React, { useState } from 'react';
import {
  Search,
  Filter,
  MoreVertical,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Trash2,
  Copy,
  ExternalLink,
  Send,
  AlertCircle
} from 'lucide-react';
import { Post, ApprovalStatus, PublishingStatus, Brand, RoleName } from '../../../server/src/types';
import { formatISTDateTime } from '../../utils/timezone';
import { getRolePermissions } from '../../utils/rbac';
import { MediaThumbnail } from '../../components/media/MediaThumbnail';

interface ContentTableProps {
  posts: Post[];
  brands: Brand[];
  onSelectPost: (post: Post) => void;
  onCreateNew: () => void;
  onApprovePost: (postId: number) => void;
  onRejectPost: (postId: number, reason: string) => void;
  onRequestRevision: (postId: number, comments: string) => void;
  onSubmitPost: (postId: number) => void;
  onPublishNow: (postId: number) => void;
  onDeletePost: (postId: number) => void;
  currentRole?: RoleName;
}

export const ContentTable: React.FC<ContentTableProps> = ({
  posts,
  brands,
  onSelectPost,
  onCreateNew,
  onApprovePost,
  onRejectPost,
  onRequestRevision,
  onSubmitPost,
  onPublishNow,
  onDeletePost,
  currentRole = 'Super Admin',
}) => {
  const permissions = getRolePermissions(currentRole);
  const [search, setSearch] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');
  const [selectedPostIds, setSelectedPostIds] = useState<number[]>([]);
  const [actionMenuPostId, setActionMenuPostId] = useState<number | null>(null);

  const availableBrands: Brand[] = brands && brands.length > 0 ? brands : [
    {
      id: 1,
      name: 'Flower Plant (Asia/Kolkata)',
      slug: 'flower-plant',
      primaryColor: '#12B76A',
      secondaryColor: '#E6F9F0',
      timezone: 'Asia/Kolkata',
      country: 'IN',
      isActive: true,
    },
    {
      id: 2,
      name: 'Nexus Cloud Global',
      slug: 'nexus-cloud',
      primaryColor: '#1336E8',
      secondaryColor: '#EFF8FF',
      timezone: 'Asia/Kolkata',
      country: 'IN',
      isActive: true,
    },
    {
      id: 3,
      name: 'Apex Automation Labs',
      slug: 'apex-labs',
      primaryColor: '#7F56D9',
      secondaryColor: '#F9F5FF',
      timezone: 'Asia/Kolkata',
      country: 'IN',
      isActive: true,
    },
  ];

  // Filter posts
  const filteredPosts = posts.filter(post => {
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      post.masterCaption.toLowerCase().includes(search.toLowerCase()) ||
      (post.brandName || '').toLowerCase().includes(search.toLowerCase());

    const matchesBrand =
      selectedBrandFilter === 'all' || post.brandId === Number(selectedBrandFilter);

    const matchesStatus =
      selectedStatusFilter === 'all' || post.approvalStatus === selectedStatusFilter;

    const matchesPlatform =
      selectedPlatformFilter === 'all' || (post.platforms || []).some(p => p.platform === selectedPlatformFilter);

    return matchesSearch && matchesBrand && matchesStatus && matchesPlatform;
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPostIds(filteredPosts.map(p => p.id));
    } else {
      setSelectedPostIds([]);
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedPostIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const getApprovalBadge = (status: ApprovalStatus) => {
    switch (status) {
      case 'approved':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#ECFDF3] text-[#027A48]">Approved</span>;
      case 'in_review':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#EFF8FF] text-[#1336E8]">In Review</span>;
      case 'revision_requested':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF0C7] text-[#B54708]">Revision Req.</span>;
      case 'rejected':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEF3F2] text-[#B42318]">Rejected</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#F2F4F7] text-[#344054]">Draft</span>;
    }
  };

  const getPublishingBadge = (status: PublishingStatus) => {
    switch (status) {
      case 'published':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF3] text-[#12B76A]">Published</span>;
      case 'scheduled':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EFF8FF] text-[#1336E8]">Scheduled</span>;
      case 'processing':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF0C7] text-[#F79009]">Publishing...</span>;
      case 'failed':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF3F2] text-[#F04438]">Failed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F2F4F7] text-[#667085]">Idle</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Primary Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#101828]">Content Management</h2>
          <p className="text-xs text-[#667085] mt-1">
            Create, inspect, approve, and schedule multi-platform posts across your brands.
          </p>
        </div>
        {permissions.canCreatePost ? (
          <button
            onClick={onCreateNew}
            className="px-4 py-2.5 bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold rounded-xl shadow-md shadow-[#1336E8]/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Post</span>
          </button>
        ) : (
          <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium">
            View-Only Mode ({currentRole})
          </span>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#EAECF0] shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#667085] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, caption, or brand..."
            className="w-full h-9 pl-9 pr-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] placeholder-[#667085] focus:outline-none focus:border-[#1336E8]"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Brand Filter */}
          <select
            value={selectedBrandFilter}
            onChange={e => setSelectedBrandFilter(e.target.value)}
            className="h-9 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#344054] focus:outline-none focus:border-[#1336E8]"
          >
            <option value="all">All Brands</option>
            {availableBrands.map(b => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Platform Filter */}
          <select
            value={selectedPlatformFilter}
            onChange={e => setSelectedPlatformFilter(e.target.value)}
            className="h-9 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#344054] focus:outline-none focus:border-[#1336E8]"
          >
            <option value="all">All Platforms</option>
            <option value="youtube">YouTube (Community &amp; Shorts)</option>
            <option value="whatsapp">WhatsApp (Status &amp; Channels)</option>
            <option value="facebook">Facebook Page</option>
            <option value="instagram">Instagram</option>
            <option value="linkedin">LinkedIn</option>
            <option value="x">X (Twitter v2)</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={e => setSelectedStatusFilter(e.target.value)}
            className="h-9 px-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#344054] focus:outline-none focus:border-[#1336E8]"
          >
            <option value="all">All Approval States</option>
            <option value="draft">Draft</option>
            <option value="in_review">In Review</option>
            <option value="approved">Approved</option>
            <option value="revision_requested">Revision Requested</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Strip */}
      {selectedPostIds.length > 0 && (
        <div className="p-3 bg-[#EFF8FF] border border-[#B2DDFF] rounded-xl flex items-center justify-between text-xs text-[#1336E8]">
          <span className="font-semibold">{selectedPostIds.length} post(s) selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                selectedPostIds.forEach(id => onApprovePost(id));
                setSelectedPostIds([]);
              }}
              className="px-3 py-1 bg-[#1336E8] text-white rounded-lg font-medium hover:bg-[#0E27B3]"
            >
              Approve Selected
            </button>
            <button
              onClick={() => setSelectedPostIds([])}
              className="px-3 py-1 bg-white border border-[#B2DDFF] rounded-lg font-medium hover:bg-[#F2F4F7]"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Central Content Table (Desktop View) */}
      <div className="hidden md:block bg-white border border-[#EAECF0] rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F9FAFB] border-b border-[#EAECF0] text-[#475467] font-semibold">
              <tr>
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredPosts.length > 0 &&
                      selectedPostIds.length === filteredPosts.length
                    }
                    onChange={e => handleSelectAll(e.target.checked)}
                    className="rounded border-[#D0D5DD] text-[#1336E8] focus:ring-0"
                  />
                </th>
                <th className="py-3 px-4 min-w-[240px]">Post Title &amp; Media</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Platforms</th>
                <th className="py-3 px-4">Scheduled Date (IST)</th>
                <th className="py-3 px-4">Approval</th>
                <th className="py-3 px-4">Publishing</th>
                <th className="py-3 px-4">Approver</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {filteredPosts.map(post => {
                const isSelected = selectedPostIds.includes(post.id);
                const mediaUrl = post.media?.[0]?.fileUrl;

                return (
                  <tr
                    key={post.id}
                    className={`hover:bg-[#F9FAFB] transition-colors ${
                      isSelected ? 'bg-[#F9FBFF]' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(post.id)}
                        className="rounded border-[#D0D5DD] text-[#1336E8] focus:ring-0"
                      />
                    </td>

                    {/* Title & Media */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <MediaThumbnail
                          src={mediaUrl}
                          alt={post.title}
                          mediaType={post.media?.[0]?.mediaType}
                          containerClassName="relative w-12 h-12 rounded-lg overflow-hidden bg-[#F2F4F7] border border-[#EAECF0] shrink-0 cursor-pointer group"
                        />
                        <div className="min-w-0 space-y-0.5">
                          <button
                            onClick={() => onSelectPost(post)}
                            className="font-bold text-[#101828] hover:text-[#1336E8] transition-colors text-left block truncate max-w-sm"
                          >
                            {post.title}
                          </button>
                          <p className="text-[11px] text-[#667085] line-clamp-1">
                            {post.masterCaption}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Brand */}
                    <td className="py-3.5 px-4 font-semibold text-[#344054]">
                      <span className="px-2 py-0.5 rounded-md bg-[#F2F4F7] text-[#344054] text-[10px] font-bold">
                        {post.brandName}
                      </span>
                    </td>

                    {/* Platforms */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1 flex-wrap">
                        {(post.platforms || []).map((p, i) => {
                          const plat = (p.platform || '').toLowerCase();
                          let badgeStyle = 'bg-[#F2F4F7] text-[#667085] border border-[#EAECF0]';
                          if (plat === 'youtube') badgeStyle = 'bg-[#FEF3F2] text-[#F04438] border border-[#FECDCA]';
                          else if (plat === 'whatsapp') badgeStyle = 'bg-[#DCFCE7] text-[#16A34A] border border-[#86EFAC]';
                          else if (plat === 'facebook') badgeStyle = 'bg-[#EFF8FF] text-[#1336E8] border border-[#B2DDFF]';
                          else if (plat === 'instagram') badgeStyle = 'bg-[#FEF0C7] text-[#D97706] border border-[#FEDF89]';
                          else if (plat === 'linkedin') badgeStyle = 'bg-[#EFF8FF] text-[#0A66C2] border border-[#B2DDFF]';
                          else if (plat === 'x') badgeStyle = 'bg-[#F2F4F7] text-[#101828] border border-[#D0D5DD]';

                          return p.platformPostUrl ? (
                            <a
                              key={i}
                              href={p.platformPostUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={`px-1.5 py-0.5 rounded-md font-bold uppercase text-[9px] transition-colors ${badgeStyle} hover:opacity-80`}
                              title={`View published post on ${p.platform}`}
                            >
                              {p.platform.substring(0, 2)}
                            </a>
                          ) : (
                            <span
                              key={i}
                              className={`px-1.5 py-0.5 rounded-md font-bold uppercase text-[9px] ${badgeStyle}`}
                              title={p.platform}
                            >
                              {p.platform.substring(0, 2)}
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    {/* Scheduled Date */}
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#475467]">
                      {post.scheduledAt ? (
                        <span>{formatISTDateTime(post.scheduledAt, false)}</span>
                      ) : (
                        <span className="text-[#98A2B3]">—</span>
                      )}
                    </td>

                    {/* Approval Status */}
                    <td className="py-3.5 px-4">{getApprovalBadge(post.approvalStatus)}</td>

                    {/* Publishing Status */}
                    <td className="py-3.5 px-4">{getPublishingBadge(post.publishingStatus)}</td>

                    {/* Approver */}
                    <td className="py-3.5 px-4 text-[#475467]">
                      {post.assignedApproverName || 'Marcus Sterling'}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectPost(post)}
                          className="p-1.5 rounded-lg text-[#667085] hover:text-[#1336E8] hover:bg-[#EFF8FF] transition-colors"
                          title="View Details & Comments"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {(post.platforms?.[0]?.platformPostUrl || (post.platforms?.[0] as any)?.publishedUrl) && (
                          <a
                            href={(post.platforms[0]?.platformPostUrl || (post.platforms[0] as any)?.publishedUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-[#12B76A] hover:bg-[#ECFDF3] transition-colors"
                            title="View Live Post on Meta"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        {permissions.canApprovePost && post.approvalStatus === 'in_review' && (
                          <button
                            onClick={() => onApprovePost(post.id)}
                            className="p-1.5 rounded-lg text-[#12B76A] hover:bg-[#ECFDF3] transition-colors cursor-pointer"
                            title="Approve Post"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {permissions.canPublishPost && post.approvalStatus === 'approved' && post.publishingStatus !== 'published' && (
                          <button
                            onClick={() => onPublishNow(post.id)}
                            className="p-1.5 rounded-lg text-[#1336E8] hover:bg-[#EFF8FF] transition-colors cursor-pointer"
                            title="Publish to n8n Webhook Now"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        )}

                        {permissions.canDeletePost && (
                          <button
                            onClick={() => onDeletePost(post.id)}
                            className="p-1.5 rounded-lg text-[#667085] hover:text-[#F04438] hover:bg-[#FEF3F2] transition-colors cursor-pointer"
                            title="Delete Post"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredPosts.length === 0 && (
            <div className="p-12 text-center text-xs text-[#667085]">
              No posts match your filters. Click "+ Create Post" to draft a new post!
            </div>
          )}
        </div>
      </div>

      {/* Mobile Card Feed (Small Screens) */}
      <div className="md:hidden space-y-3">
        {filteredPosts.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-[#EAECF0] text-center text-xs text-[#667085]">
            No posts match your filters. Click "+ Create Post" to draft a new post!
          </div>
        ) : (
          filteredPosts.map(post => {
            const mediaUrl = post.media?.[0]?.fileUrl;
            return (
              <div
                key={post.id}
                className="bg-white p-4 rounded-2xl border border-[#EAECF0] shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MediaThumbnail
                      src={mediaUrl}
                      alt={post.title}
                      mediaType={post.media?.[0]?.mediaType}
                      containerClassName="relative w-12 h-12 rounded-xl overflow-hidden bg-[#F2F4F7] border border-[#EAECF0] shrink-0 cursor-pointer group"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono font-bold text-[#1336E8] uppercase block truncate">
                        {post.brandName}
                      </span>
                      <h4
                        onClick={() => onSelectPost(post)}
                        className="text-xs font-bold text-[#101828] truncate cursor-pointer hover:text-[#1336E8]"
                      >
                        {post.title}
                      </h4>
                    </div>
                  </div>
                  <div className="shrink-0">{getApprovalBadge(post.approvalStatus)}</div>
                </div>

                <p className="text-[11px] text-[#475467] line-clamp-2 leading-relaxed">
                  {post.masterCaption}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-[#F2F4F7] text-[11px]">
                  <div className="flex items-center gap-1">
                    {post.platforms.map(p => (
                      <span
                        key={p.platform}
                        className="px-1.5 py-0.5 rounded bg-[#F2F4F7] text-[9px] font-mono text-[#344054] uppercase font-bold"
                      >
                        {p.platform[0]}
                      </span>
                    ))}
                  </div>

                  <span className="text-[#667085] font-mono text-[10px]">
                    {post.scheduledAt
                      ? formatISTDateTime(post.scheduledAt, false)
                      : 'Unscheduled'}
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-[#F2F4F7]">
                  <button
                    onClick={() => onSelectPost(post)}
                    className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-[#D0D5DD] bg-white hover:bg-[#F9FAFB] text-xs font-semibold text-[#344054] flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#1336E8]" />
                    <span>View / Chat</span>
                  </button>

                  {permissions.canApprovePost && post.approvalStatus === 'in_review' && (
                    <button
                      onClick={() => onApprovePost(post.id)}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#12B76A] hover:bg-[#027A48] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                  )}

                  {permissions.canPublishPost && post.approvalStatus === 'approved' && post.publishingStatus !== 'published' && (
                    <button
                      onClick={() => onPublishNow(post.id)}
                      className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Publish</span>
                    </button>
                  )}

                  {permissions.canDeletePost && (
                    <button
                      onClick={() => onDeletePost(post.id)}
                      className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-[#FECDCA] text-[#F04438] hover:bg-[#FEF3F2] flex items-center justify-center cursor-pointer"
                      title="Delete Post"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
