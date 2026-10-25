import React, { useState } from 'react';
import {
  CheckSquare,
  Clock,
  XCircle,
  AlertCircle,
  CheckCircle2,
  Send,
  MessageSquare,
  Check,
  CheckCheck,
  Paperclip,
  Smile,
  Reply,
  Shield,
  Eye,
  Calendar,
  Layers,
  ChevronRight,
  Video,
  Maximize2,
  Play
} from 'lucide-react';
import { Post, PostComment, ApprovalStatus, RoleName } from '../../../server/src/types';
import { formatISTDate, formatISTTime } from '../../utils/timezone';
import { getRolePermissions } from '../../utils/rbac';
import { MediaThumbnail } from '../../components/media/MediaThumbnail';
import { MediaViewerModal } from '../../components/media/MediaViewerModal';

interface ApprovalQueueProps {
  posts: Post[];
  commentsMap: Record<number, PostComment[]>;
  onApprove: (postId: number) => void;
  onReject: (postId: number, reason: string) => void;
  onRequestRevision: (postId: number, comments: string) => void;
  onAddComment: (postId: number, text: string) => void;
  onPublishNow: (postId: number) => void;
  currentRole?: RoleName;
}

export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  posts,
  commentsMap,
  onApprove,
  onReject,
  onRequestRevision,
  onAddComment,
  onPublishNow,
  currentRole = 'Super Admin',
}) => {
  const permissions = getRolePermissions(currentRole);
  const [activeTab, setActiveTab] = useState<'pending' | 'revision' | 'approved' | 'rejected'>('pending');
  const [selectedPostId, setSelectedPostId] = useState<number | string>(posts[0]?.id || 101);
  const [newCommentText, setNewCommentText] = useState('');
  const [rejectReasonModalOpen, setRejectReasonModalOpen] = useState(false);
  const [revisionModalOpen, setRevisionModalOpen] = useState(false);
  const [modalInputText, setModalInputText] = useState('');

  // Lightbox & Video Player Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalUrl, setModalUrl] = useState('');
  const [modalType, setModalType] = useState<'image' | 'video'>('image');

  const filteredPosts = posts.filter(p => {
    if (activeTab === 'pending') return p.approvalStatus === 'in_review';
    if (activeTab === 'revision') return p.approvalStatus === 'revision_requested';
    if (activeTab === 'approved') return p.approvalStatus === 'approved';
    if (activeTab === 'rejected') return p.approvalStatus === 'rejected';
    return true;
  });

  const selectedPost = filteredPosts.find(p => String(p.id) === String(selectedPostId)) || (filteredPosts.length > 0 ? filteredPosts[0] : null);
  const postComments = selectedPost ? commentsMap[selectedPost.id as any] || [] : [];

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedPost) return;
    onAddComment(selectedPost.id, newCommentText.trim());
    setNewCommentText('');
  };

  const handleConfirmReject = () => {
    if (!selectedPost || !modalInputText.trim()) return;
    onReject(selectedPost.id, modalInputText.trim());
    setRejectReasonModalOpen(false);
    setModalInputText('');
  };

  const handleConfirmRevision = () => {
    if (!selectedPost || !modalInputText.trim()) return;
    onRequestRevision(selectedPost.id, modalInputText.trim());
    setRevisionModalOpen(false);
    setModalInputText('');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#101828]">Approval Queue &amp; Review Chat</h2>
          <p className="text-xs text-[#667085] mt-1">
            Collaborative review workspace with WhatsApp/Instagram-style internal discussion.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#EAECF0] pb-2.5 overflow-x-auto no-scrollbar">
        {(
          [
            { id: 'pending', label: 'Pending Review', count: posts.filter(p => p.approvalStatus === 'in_review').length },
            { id: 'revision', label: 'Revision Requested', count: posts.filter(p => p.approvalStatus === 'revision_requested').length },
            { id: 'approved', label: 'Approved & Scheduled', count: posts.filter(p => p.approvalStatus === 'approved').length },
            { id: 'rejected', label: 'Rejected', count: posts.filter(p => p.approvalStatus === 'rejected').length },
          ] as const
        ).map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              const nextFiltered = posts.filter(p => {
                if (tab.id === 'pending') return p.approvalStatus === 'in_review';
                if (tab.id === 'revision') return p.approvalStatus === 'revision_requested';
                if (tab.id === 'approved') return p.approvalStatus === 'approved';
                if (tab.id === 'rejected') return p.approvalStatus === 'rejected';
                return true;
              });
              if (nextFiltered.length > 0) {
                setSelectedPostId(nextFiltered[0].id);
              }
            }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
              activeTab === tab.id
                ? 'bg-[#1336E8] text-white shadow-sm'
                : 'text-[#344054] hover:bg-[#F2F4F7]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === tab.id ? 'bg-white text-[#1336E8]' : 'bg-[#F2F4F7] text-[#667085]'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Main Split Grid: Posts List (Left) + Detail & Chat Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Queue Items */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-semibold text-[#667085] block">
            {filteredPosts.length} Items in this queue:
          </span>

          {filteredPosts.map(post => {
            const isSelected = selectedPost?.id === post.id;
            return (
              <div
                key={post.id}
                onClick={() => setSelectedPostId(post.id)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#1336E8] bg-white shadow-md ring-2 ring-[#1336E8]/10'
                    : 'border-[#EAECF0] bg-white hover:bg-[#F9FAFB] shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[#EFF8FF] text-[#1336E8] text-[10px] font-bold uppercase truncate max-w-[200px]">
                    {post.brandName}
                  </span>
                  <span className="text-[10px] font-mono text-[#667085] whitespace-nowrap shrink-0">
                    v{post.versionNumber} · {formatISTDate(post.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {post.media?.[0]?.fileUrl && (
                    <MediaThumbnail
                      src={post.media[0].fileUrl}
                      alt={post.title}
                      mediaType={post.media[0].mediaType}
                      containerClassName="relative w-12 h-12 rounded-xl overflow-hidden bg-slate-800 border border-slate-700/60 shrink-0 cursor-pointer group"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-[#101828] line-clamp-1">{post.title}</h4>
                    <p className="text-[11px] text-[#475467] line-clamp-1 mt-0.5 leading-relaxed">
                      {post.masterCaption}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#F2F4F7] text-[11px] text-[#667085]">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{post.commentsCount || 0} notes</span>
                  </span>
                  <span className="capitalize font-semibold text-[#101828]">
                    {post.approvalStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredPosts.length === 0 && (
            <div className="p-8 text-center border border-dashed border-[#EAECF0] rounded-2xl text-xs text-[#667085] bg-white">
              No items in this queue.
            </div>
          )}
        </div>

        {/* Right: Detailed Post Preview + WhatsApp-Style Review Discussion */}
        {selectedPost ? (
          <div className="lg:col-span-7 space-y-6" id="review-detail-panel">
            {/* Post Detail Header & Actions */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#EAECF0] shadow-sm space-y-4">
              <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-3 border-b border-[#EAECF0] pb-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#EFF8FF] text-[#1336E8] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      {selectedPost.brandName}
                    </span>
                    <span className="text-xs text-[#98A2B3]">·</span>
                    <span className="text-xs font-medium text-[#475467] whitespace-nowrap">
                      Created by <strong className="text-[#101828] font-semibold">{selectedPost.createdByName || 'David Vance (Super Admin)'}</strong>
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-[#101828] leading-snug">{selectedPost.title}</h3>
                </div>

                {/* Primary Approval Actions */}
                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto shrink-0 pt-1 xl:pt-0">
                  {permissions.canApprovePost && selectedPost.approvalStatus !== 'approved' && (
                    <>
                      <button
                        onClick={() => {
                          setModalInputText('');
                          setRevisionModalOpen(true);
                        }}
                        className="flex-1 sm:flex-initial min-h-[38px] px-3.5 py-2 bg-[#FEF0C7] hover:bg-[#FEDF89] text-[#B54708] text-xs font-semibold rounded-xl transition-colors text-center cursor-pointer"
                      >
                        Request Revision
                      </button>
                      <button
                        onClick={() => {
                          setModalInputText('');
                          setRejectReasonModalOpen(true);
                        }}
                        className="flex-1 sm:flex-initial min-h-[38px] px-3.5 py-2 bg-[#FEF3F2] hover:bg-[#FECDCA] text-[#B42318] text-xs font-semibold rounded-xl transition-colors text-center cursor-pointer"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => onApprove(selectedPost.id)}
                        className="w-full sm:w-auto min-h-[38px] px-4 py-2 bg-[#12B76A] hover:bg-[#027A48] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{currentRole === 'Client' ? 'Client Approve' : 'Approve Content'}</span>
                      </button>
                    </>
                  )}

                  {!permissions.canApprovePost && selectedPost.approvalStatus !== 'approved' && (
                    <span className="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl font-medium">
                      {currentRole === 'Content Manager'
                        ? 'Submitted • Awaiting Review by Approver / Admin'
                        : 'Read-Only Review Mode'}
                    </span>
                  )}

                  {permissions.canPublishPost && selectedPost.approvalStatus === 'approved' && selectedPost.publishingStatus !== 'published' && (
                    <button
                      onClick={() => onPublishNow(selectedPost.id)}
                      className="w-full sm:w-auto min-h-[38px] px-4 py-2 bg-[#1336E8] hover:bg-[#0E27B3] text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Trigger n8n Publish Now</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Master Caption & Overrides */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="font-semibold text-[#344054] block mb-1">Master Caption:</span>
                  <div className="p-3.5 rounded-xl bg-[#F6F8FC] border border-[#EAECF0] text-[#101828] leading-relaxed">
                    {selectedPost.masterCaption}
                  </div>
                </div>

                {selectedPost.firstComment && (
                  <div>
                    <span className="font-semibold text-[#344054] block mb-1">First Comment:</span>
                    <div className="p-2.5 rounded-lg bg-[#F6F8FC] border border-[#EAECF0] text-[#475467] font-mono text-[11px]">
                      {selectedPost.firstComment}
                    </div>
                  </div>
                )}

                {selectedPost.media?.[0]?.fileUrl && (() => {
                  const mediaItem = selectedPost.media[0];
                  const url = mediaItem.fileUrl;
                  const isVideo =
                    mediaItem.mediaType === 'video' ||
                    /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(url) ||
                    (url.includes('/uploads/') && /\.(mp4|webm|mov)/i.test(url)) ||
                    /(?:youtube\.com|youtu\.be)/i.test(url);

                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-[#344054] flex items-center gap-1.5">
                          {isVideo ? <Video className="w-4 h-4 text-indigo-600" /> : <Layers className="w-4 h-4 text-emerald-600" />}
                          <span>Attached {isVideo ? 'Video Asset' : 'Image Asset'}:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setModalUrl(url);
                            setModalType(isVideo ? 'video' : 'image');
                            setIsModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1336E8] hover:underline"
                        >
                          <Maximize2 className="w-3 h-3" />
                          <span>{isVideo ? 'Watch in Video Player' : 'View Lightbox'}</span>
                        </button>
                      </div>

                      <div className="rounded-xl overflow-hidden border border-[#EAECF0] bg-slate-950 flex items-center justify-center p-1 relative shadow-inner">
                        {isVideo ? (
                          <video
                            src={url}
                            controls
                            playsInline
                            className="w-full max-h-72 object-contain bg-black rounded-lg"
                          >
                            Your browser does not support HTML5 video playback.
                          </video>
                        ) : (
                          <img
                            src={url}
                            alt={selectedPost.title}
                            className="w-full max-h-72 object-contain bg-slate-900 rounded-lg cursor-pointer"
                            onClick={() => {
                              setModalUrl(url);
                              setModalType('image');
                              setIsModalOpen(true);
                            }}
                            onError={e => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* WhatsApp/Instagram-style Internal Discussion Chat */}
            <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden flex flex-col h-[480px]">
              {/* Chat Header */}
              <div className="p-4 bg-[#F8F9FA] border-b border-[#EAECF0] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#1336E8] text-white flex items-center justify-center font-bold text-xs">
                    💬
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#101828]">Internal Review Discussion</div>
                    <div className="text-[10px] text-[#667085]">End-to-end encrypted approval log</div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-[#12B76A] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#12B76A]"></span>
                  <span>Active Channel</span>
                </span>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#EFEAE2]/30">
                {postComments.map(comment => {
                  if (comment.isSystemMessage) {
                    return (
                      <div key={comment.id} className="flex justify-center my-2">
                        <span className="px-3 py-1 rounded-full bg-[#E4E7EC] text-[#475467] text-[10px] font-semibold text-center">
                          ⚙️ {comment.commentText}
                        </span>
                      </div>
                    );
                  }

                  const isMe = comment.userId === 1; // David
                  return (
                    <div
                      key={comment.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-[#667085] mb-0.5 px-1">
                        <span className="font-semibold text-[#101828]">{comment.userFullName}</span>
                        <span>·</span>
                        <span className="text-[#1336E8]">{comment.userRole}</span>
                      </div>

                      <div
                        className={`max-w-md p-3 rounded-2xl text-xs shadow-sm leading-relaxed ${
                          isMe
                            ? 'bg-[#1336E8] text-white rounded-tr-none'
                            : 'bg-white text-[#101828] border border-[#EAECF0] rounded-tl-none'
                        }`}
                      >
                        <p>{comment.commentText}</p>
                        <div
                          className={`flex items-center justify-end gap-1 mt-1 text-[9px] font-mono ${
                            isMe ? 'text-white/80' : 'text-[#98A2B3]'
                          }`}
                        >
                          <span>{formatISTTime(comment.createdAt, false)}</span>
                          <CheckCheck className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {postComments.length === 0 && (
                  <div className="text-center py-12 text-xs text-[#667085]">
                    No comments yet. Leave feedback, request revisions, or ask the content lead questions here.
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <form
                onSubmit={handleSendComment}
                className="p-3 bg-white border-t border-[#EAECF0] flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  placeholder="Type an internal review comment..."
                  className="flex-1 h-10 px-3.5 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#1336E8]"
                />
                <button
                  type="submit"
                  disabled={!newCommentText.trim()}
                  className="w-10 h-10 rounded-xl bg-[#1336E8] hover:bg-[#0E27B3] disabled:opacity-50 text-white flex items-center justify-center transition-colors shadow-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-7 bg-white p-12 rounded-2xl border border-[#EAECF0] text-center shadow-sm flex flex-col items-center justify-center min-h-[460px]">
            <div className="w-16 h-16 rounded-2xl bg-[#F0FDF4] text-[#12B76A] flex items-center justify-center mb-4 text-3xl shadow-xs">
              ✓
            </div>
            <h3 className="text-base font-bold text-[#101828]">Queue is All Caught Up</h3>
            <p className="text-xs text-[#667085] mt-1.5 max-w-sm leading-relaxed">
              There are currently no items in the <strong className="capitalize text-[#101828] font-semibold">{activeTab.replace('_', ' ')}</strong> queue.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveTab('approved');
                  const approvedPosts = posts.filter(p => p.approvalStatus === 'approved');
                  if (approvedPosts.length > 0) setSelectedPostId(approvedPosts[0].id);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#F2F4F7] text-[#344054] hover:bg-[#E4E7EC] transition-colors"
              >
                View Approved Posts ({posts.filter(p => p.approvalStatus === 'approved').length})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject Reason Modal */}
      {rejectReasonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#101828]">Reject Post</h3>
            <p className="text-xs text-[#667085]">
              Please provide an explicit business or compliance reason for rejecting this content. This will be recorded in the audit log.
            </p>
            <textarea
              rows={3}
              value={modalInputText}
              onChange={e => setModalInputText(e.target.value)}
              placeholder="e.g. Messaging conflicts with updated enterprise PR guidelines..."
              className="w-full p-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#F04438]"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectReasonModalOpen(false)}
                className="px-4 py-2 border border-[#D0D5DD] text-xs font-semibold rounded-xl text-[#344054] hover:bg-[#F2F4F7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={!modalInputText.trim()}
                className="px-4 py-2 bg-[#F04438] hover:bg-[#D92D20] disabled:opacity-50 text-white text-xs font-semibold rounded-xl"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revision Comments Modal */}
      {revisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#101828]">Request Revision</h3>
            <p className="text-xs text-[#667085]">
              Specify what edits, captions, or asset changes the content creator should apply before resubmitting.
            </p>
            <textarea
              rows={3}
              value={modalInputText}
              onChange={e => setModalInputText(e.target.value)}
              placeholder="e.g. Please shorten the second sentence and add the link in the first comment..."
              className="w-full p-3 bg-[#F6F8FC] border border-[#D0D5DD] rounded-xl text-xs text-[#101828] focus:outline-none focus:border-[#F79009]"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevisionModalOpen(false)}
                className="px-4 py-2 border border-[#D0D5DD] text-xs font-semibold rounded-xl text-[#344054] hover:bg-[#F2F4F7]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevision}
                disabled={!modalInputText.trim()}
                className="px-4 py-2 bg-[#F79009] hover:bg-[#DC6803] disabled:opacity-50 text-white text-xs font-semibold rounded-xl"
              >
                Send Revision Request
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Video & Media Lightbox Modal */}
      <MediaViewerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mediaUrl={modalUrl}
        mediaType={modalType}
        title={selectedPost?.title}
      />
    </div>
  );
};
