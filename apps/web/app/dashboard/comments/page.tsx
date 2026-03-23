'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  MdSearch,
  MdFilterList,
  MdCheck,
  MdDeleteOutline,
  MdOutlineChatBubbleOutline,
  MdReply,
  MdClose,
  MdSend,
  MdEdit,
  MdChevronLeft,
  MdChevronRight,
} from 'react-icons/md';
import { useAdminApi } from '../../components/dashboard/use-admin-api';
import { formatRelativeTimeOrDash, titleCase } from '../../../lib/utils/format';

type CommentStatus = 'PENDING' | 'APPROVED' | 'TRASH';

type Comment = {
  id: string;
  authorName: string;
  authorEmail?: string | null;
  avatarInitials: string;
  targetTitle: string;
  content: string;
  status: CommentStatus;
  createdAt: string;
  parentId?: string | null;
};

type CommentResponse = {
  items: Array<{
    id: string;
    content: string;
    status: CommentStatus;
    createdAt: string;
    parentId?: string | null;
    targetTitle?: string | null;
    author?: { id: string; name?: string | null; email?: string | null } | null;
  }>;
  total: number;
};

const STATUS_TABS = ['All', 'Pending', 'Approved', 'Trash'] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const BULK_OPTIONS = ['Approve selected', 'Move to Trash', 'Delete permanently'];

function statusStyles(status: CommentStatus) {
  if (status === 'APPROVED') return 'bg-green-50 text-green-600 border-green-100';
  if (status === 'TRASH') return 'bg-red-50 text-red-600 border-red-100';
  return 'bg-amber-50 text-amber-700 border-amber-100';
}

export default function CommentsPage() {
  const { request, status: authStatus } = useAdminApi();
  const [comments, setComments] = useState<Comment[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<StatusTab>('All');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [replyIndexByCommentId, setReplyIndexByCommentId] = useState<Record<string, number>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  // Edit Comment State
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsLoading(true);
      setLoadError(null);
      const params = new URLSearchParams();
      params.set('take', '200');
      params.set('skip', '0');
      const trimmedSearch = search.trim();
      if (trimmedSearch) params.set('search', trimmedSearch);

      request<CommentResponse>(`/api/admin/comments?${params.toString()}`, {
        signal: controller.signal,
      })
        .then((payload) => {
          if (requestIdRef.current !== requestId) return;
          const mapped = (payload.items ?? []).map((item) => {
            const authorName = item.author?.name || item.author?.email || 'Anonymous';
            const emailFallback = item.author?.email?.trim() || '';
            const initialsSource = authorName !== 'Anonymous' ? authorName : emailFallback;
            const initials = initialsSource
              ? initialsSource
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0]?.toUpperCase() ?? '')
                  .join('')
              : 'NA';
            return {
              id: item.id,
              authorName,
              authorEmail: item.author?.email ?? null,
              avatarInitials: initials || 'NA',
              targetTitle: item.targetTitle ?? 'Untitled',
              content: item.content,
              status: item.status,
              createdAt: item.createdAt,
              parentId: item.parentId ?? null,
            };
          });
          setComments(mapped);
        })
        .catch((err: Error) => {
          if (requestIdRef.current !== requestId) return;
          if (err?.name === 'AbortError') return;
          setLoadError(err.message || 'Unable to load comments.');
        })
        .finally(() => {
          if (requestIdRef.current !== requestId) return;
          setIsLoading(false);
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [authStatus, request, search]);

  const approveComment = async (id: string) => {
    try {
      await request(`/api/admin/comments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'APPROVED' }),
      });
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'APPROVED' } : c)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to approve comment.';
      setLoadError(message);
    }
  };

  const trashComment = async (id: string) => {
    try {
      await request(`/api/admin/comments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'TRASH' }),
      });
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, status: 'TRASH' } : c)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to move comment to trash.';
      setLoadError(message);
    }
  };

  const sendReply = async (id: string) => {
    if (!replyText.trim()) return;
    try {
      const created = await request<CommentResponse['items'][number]>(
        `/api/admin/comments/${id}/reply`,
        {
          method: 'POST',
          body: JSON.stringify({ content: replyText.trim() }),
        },
      );
      const authorName = created.author?.name || created.author?.email || 'You';
      const initialsSource = authorName || created.author?.email || 'You';
      const initials = initialsSource
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
      setComments((prev) => [
        ...prev,
        {
          id: created.id,
          authorName,
          authorEmail: created.author?.email ?? null,
          avatarInitials: initials || 'YOU',
          targetTitle: created.targetTitle ?? 'Untitled',
          content: created.content,
          status: created.status,
          createdAt: created.createdAt,
          parentId: created.parentId ?? id,
        },
      ]);
      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to send reply.';
      setLoadError(message);
    }
  };

  const saveEdit = async (id: string) => {
    if (!editCommentText.trim()) return;
    try {
      await request(`/api/admin/comments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: editCommentText.trim() }),
      });
      setComments((prev) =>
        prev.map((c) => (c.id === id ? { ...c, content: editCommentText.trim() } : c)),
      );
      setEditingCommentId(null);
      setEditCommentText('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update comment.';
      setLoadError(message);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((p) => {
      const n = new Set(p);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  };

  const handleBulk = async (action: string) => {
    try {
      if (action === 'Approve selected') {
        await Promise.all(
          Array.from(selectedIds).map((id) =>
            request(`/api/admin/comments/${id}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'APPROVED' }),
            }),
          ),
        );
        setComments((prev) =>
          prev.map((c) => (selectedIds.has(c.id) ? { ...c, status: 'APPROVED' } : c)),
        );
      } else if (action === 'Move to Trash') {
        await Promise.all(
          Array.from(selectedIds).map((id) =>
            request(`/api/admin/comments/${id}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'TRASH' }),
            }),
          ),
        );
        setComments((prev) =>
          prev.map((c) => (selectedIds.has(c.id) ? { ...c, status: 'TRASH' } : c)),
        );
      } else if (action === 'Delete permanently') {
        await Promise.all(
          Array.from(selectedIds).map((id) =>
            request(`/api/admin/comments/${id}`, {
              method: 'DELETE',
            }),
          ),
        );
        setComments((prev) =>
          prev.filter(
            (c) => !selectedIds.has(c.id) && !(c.parentId && selectedIds.has(c.parentId)),
          ),
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update selected comments.';
      setLoadError(message);
    } finally {
      setSelectedIds(new Set());
      setIsBulkOpen(false);
      setIsSelectMode(false);
    }
  };

  const replyMap = useMemo(() => {
    const map = new Map<string, Comment[]>();
    comments.forEach((comment) => {
      if (!comment.parentId) return;
      const existing = map.get(comment.parentId) ?? [];
      existing.push(comment);
      map.set(comment.parentId, existing);
    });
    return map;
  }, [comments]);

  const rootComments = useMemo(() => comments.filter((comment) => !comment.parentId), [comments]);

  const filtered = rootComments.filter((c) => {
    const replies = replyMap.get(c.id) ?? [];
    const matchesStatus = (status: CommentStatus) =>
      (activeTab === 'Pending' && status === 'PENDING') ||
      (activeTab === 'Approved' && status === 'APPROVED') ||
      (activeTab === 'Trash' && status === 'TRASH');
    const matchesTab =
      activeTab === 'All' ||
      matchesStatus(c.status) ||
      replies.some((reply) => matchesStatus(reply.status));
    const term = search.toLowerCase();
    const matchesSearch =
      c.authorName.toLowerCase().includes(term) ||
      c.content.toLowerCase().includes(term) ||
      c.targetTitle.toLowerCase().includes(term);
    return matchesTab && matchesSearch;
  });

  const pendingCount = comments.filter((c) => c.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">
            Comments
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[0.72rem] font-semibold text-amber-700">
                {pendingCount} pending
              </span>
            )}
          </h1>
          <p className="text-[0.95rem] text-gray-500">
            Review, moderate, and respond to feedback on your prompts and posts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3">
          {/* Filters */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-3 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:bg-gray-50 transition-colors"
            >
              <MdFilterList size={18} />
              Filters
            </button>
            {isFilterOpen && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-52 rounded-[14px] border border-[#e2e6ee] bg-white p-3 shadow-xl">
                <p className="mb-2 text-[0.75rem] font-medium uppercase tracking-wide text-gray-400">
                  Sort by
                </p>
                {['Newest first', 'Oldest first', 'By prompt'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="flex w-full rounded-[8px] px-3 py-2 text-[0.82rem] text-[#0f1116] hover:bg-gray-50 transition-colors text-left"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {isSelectMode ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedIds(new Set());
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsBulkOpen((v) => !v)}
                  disabled={selectedIds.size === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0f1116] px-4 py-2 text-[0.85rem] font-medium text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  Bulk actions {selectedIds.size > 0 && `(${selectedIds.size})`}
                </button>
                {isBulkOpen && selectedIds.size > 0 && (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-52 rounded-[14px] border border-[#e2e6ee] bg-white p-1.5 shadow-xl">
                    {BULK_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleBulk(opt)}
                        className={`flex w-full items-center rounded-[10px] px-3 py-2 text-[0.82rem] hover:bg-gray-50 transition-colors text-left ${
                          opt === 'Delete permanently' ? 'text-[#b94a4a]' : 'text-[#0f1116]'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setIsSelectMode(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:bg-gray-50 transition-colors"
            >
              Select
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[0.85rem] text-red-700">
          {loadError}
        </div>
      )}

      <div className="rounded-[24px] border border-[#e2e6ee] bg-white p-4 sm:p-5">
        {/* Search + tabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search comments, authors, or prompts…"
              className="w-full rounded-[999px] border border-[#e1e5ee] bg-white py-2.5 pl-9 pr-3 text-[0.85rem] text-[#0f1116] placeholder:text-gray-400 focus:border-[#0f1116] focus:outline-none focus:ring-1 focus:ring-[#0f1116]/10"
            />
          </div>

          <div className="flex flex-wrap gap-2 text-[0.8rem]">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-3 py-1.5 transition-colors ${
                  activeTab === tab
                    ? 'bg-[#0f1116] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab}
                {tab === 'Pending' && pendingCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-400/30 px-1.5 py-0.5 text-[0.7rem] text-amber-900">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Comments list */}
        {filtered.length > 0 ? (
          <div className="mt-5 space-y-4">
            {filtered.map((comment) => {
              const replies = replyMap.get(comment.id) ?? [];
              const orderedReplies = [...replies].sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
              );
              const defaultReplyIndex = (() => {
                const pendingIndex = orderedReplies.findIndex(
                  (reply) => reply.status === 'PENDING',
                );
                return pendingIndex >= 0 ? pendingIndex : 0;
              })();
              const requestedReplyIndex = replyIndexByCommentId[comment.id] ?? defaultReplyIndex;
              const activeReplyIndex = Math.max(
                0,
                Math.min(requestedReplyIndex, Math.max(orderedReplies.length - 1, 0)),
              );
              const activeReply = orderedReplies[activeReplyIndex] ?? null;
              return (
                <article
                  key={comment.id}
                  className={`rounded-[20px] border p-4 sm:p-5 transition-colors ${
                    selectedIds.has(comment.id)
                      ? 'border-[#0f1116]/20 bg-[#f7f8fb]'
                      : 'border-[#eef1f6] bg-[#fbfcff]'
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    {/* Checkbox + avatar + content */}
                    <div className="flex gap-3 flex-1">
                      {isSelectMode && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(comment.id)}
                          onChange={() => toggleSelect(comment.id)}
                          className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded accent-[#0f1116]"
                        />
                      )}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f0f2f7] text-[0.8rem] font-medium text-[#0f1116]">
                        {comment.avatarInitials}
                      </div>
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-[0.9rem] font-medium text-[#0f1116]">
                            {comment.authorName}
                          </p>
                          <span className="text-[0.78rem] text-gray-500">
                            {formatRelativeTimeOrDash(comment.createdAt)}
                          </span>
                        </div>

                        {editingCommentId === comment.id ? (
                          <div className="mt-2 flex items-end gap-2">
                            <textarea
                              rows={3}
                              value={editCommentText}
                              onChange={(e) => setEditCommentText(e.target.value)}
                              className="flex-1 rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.85rem] text-[#0f1116] outline-none focus:border-[#0f1116] resize-none"
                              autoFocus
                            />
                            <div className="flex flex-col gap-1.5 min-w-[80px]">
                              <button
                                type="button"
                                onClick={() => saveEdit(comment.id)}
                                className="flex items-center justify-center gap-1.5 rounded-xl bg-[#0f1116] px-3 py-2 text-[0.78rem] font-medium text-white hover:opacity-90 transition-opacity"
                              >
                                <MdCheck size={14} />
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCommentId(null);
                                  setEditCommentText('');
                                }}
                                className="flex items-center justify-center gap-1 rounded-xl border border-[#e1e5ee] px-3 py-2 text-[0.78rem] text-gray-500 hover:bg-gray-50 transition-colors"
                              >
                                <MdClose size={14} />
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[0.85rem] text-[#4b5563]">{comment.content}</p>
                        )}

                        <p className="text-[0.8rem] text-[#6b7280]">
                          On{' '}
                          <span className="font-medium text-[#0f1116]">{comment.targetTitle}</span>
                        </p>

                        {/* Replies slider */}
                        {activeReply && (
                          <div className="mt-2 rounded-[12px] bg-gray-50 border border-[#e8eaf0] px-3 py-2.5">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              <p className="text-[0.75rem] font-medium text-gray-400">
                                Reply from {activeReply.authorName}
                              </p>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.62rem] font-medium uppercase tracking-wide ${statusStyles(activeReply.status)}`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                {titleCase(activeReply.status)}
                              </span>
                            </div>
                            <p className="text-[0.85rem] text-[#0f1116]">{activeReply.content}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {orderedReplies.length > 1 ? (
                                <div className="inline-flex items-center rounded-full border border-[#dbe0ea] bg-white">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReplyIndexByCommentId((prev) => ({
                                        ...prev,
                                        [comment.id]: Math.max(0, activeReplyIndex - 1),
                                      }))
                                    }
                                    disabled={activeReplyIndex <= 0}
                                    className="inline-flex h-7 w-7 items-center justify-center text-[#4b5563] transition-colors hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-35"
                                    aria-label="Show previous reply"
                                  >
                                    <MdChevronLeft size={16} />
                                  </button>
                                  <span className="px-1 text-[0.72rem] font-medium text-[#6b7280]">
                                    {activeReplyIndex + 1}/{orderedReplies.length}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReplyIndexByCommentId((prev) => ({
                                        ...prev,
                                        [comment.id]: Math.min(
                                          orderedReplies.length - 1,
                                          activeReplyIndex + 1,
                                        ),
                                      }))
                                    }
                                    disabled={activeReplyIndex >= orderedReplies.length - 1}
                                    className="inline-flex h-7 w-7 items-center justify-center text-[#4b5563] transition-colors hover:text-[#111827] disabled:cursor-not-allowed disabled:opacity-35"
                                    aria-label="Show next reply"
                                  >
                                    <MdChevronRight size={16} />
                                  </button>
                                </div>
                              ) : null}
                              {activeReply.status !== 'APPROVED' && (
                                <button
                                  type="button"
                                  onClick={() => approveComment(activeReply.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-[0.72rem] font-medium text-green-700 hover:bg-green-100 transition-colors"
                                >
                                  <MdCheck size={13} />
                                  Approve reply
                                </button>
                              )}
                              {activeReply.status !== 'TRASH' && (
                                <button
                                  type="button"
                                  onClick={() => trashComment(activeReply.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[0.72rem] font-medium text-red-700 hover:bg-red-100 transition-colors"
                                >
                                  <MdDeleteOutline size={13} />
                                  Trash reply
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Inline reply box */}
                        {replyingTo === comment.id && (
                          <div className="mt-3 flex items-end gap-2">
                            <textarea
                              rows={2}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Write your reply…"
                              className="flex-1 rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.85rem] text-[#0f1116] outline-none focus:border-[#0f1116] resize-none"
                              autoFocus
                            />
                            <div className="flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={() => sendReply(comment.id)}
                                className="flex items-center gap-1.5 rounded-xl bg-[#0f1116] px-3 py-2 text-[0.78rem] font-medium text-white hover:opacity-90 transition-opacity"
                              >
                                <MdSend size={14} />
                                Send
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReplyText('');
                                }}
                                className="flex items-center gap-1 rounded-xl border border-[#e1e5ee] px-3 py-2 text-[0.78rem] text-gray-500 hover:bg-gray-50 transition-colors"
                              >
                                <MdClose size={14} />
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-row items-center gap-2 sm:flex-col sm:items-end sm:gap-2.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-medium uppercase tracking-wide ${statusStyles(comment.status)}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {titleCase(comment.status)}
                      </span>
                      <div className="flex items-center gap-2 text-[0.8rem]">
                        {comment.status !== 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => approveComment(comment.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1.5 text-[0.78rem] font-medium text-green-700 hover:bg-green-100 transition-colors"
                          >
                            <MdCheck size={14} />
                            Approve
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (replyingTo === comment.id) {
                              setReplyingTo(null);
                              setReplyText('');
                            } else {
                              setReplyingTo(comment.id);
                              setReplyText('');
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-[0.78rem] font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <MdReply size={14} />
                          Reply
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(comment.id);
                            setEditCommentText(comment.content);
                            setReplyingTo(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1.5 text-[0.78rem] font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                        >
                          <MdEdit size={14} />
                          Edit
                        </button>
                        {comment.status !== 'TRASH' && (
                          <button
                            type="button"
                            onClick={() => trashComment(comment.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-[0.78rem] font-medium text-red-700 hover:bg-red-100 transition-colors"
                          >
                            <MdDeleteOutline size={14} />
                            Trash
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-[#d8dde6] bg-[#fafbff] px-6 py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400">
              <MdOutlineChatBubbleOutline size={26} />
            </div>
            <div className="max-w-sm">
              <h2 className="text-[1.1rem] font-medium text-[#0f1116]">
                {isLoading
                  ? 'Loading comments…'
                  : search
                    ? `No comments match "${search}"`
                    : `No ${activeTab === 'All' ? '' : activeTab.toLowerCase()} comments`}
              </h2>
              <p className="mt-1 text-[0.85rem] text-gray-500">
                {search ? 'Try adjusting your search.' : 'Comments will appear here once posted.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
