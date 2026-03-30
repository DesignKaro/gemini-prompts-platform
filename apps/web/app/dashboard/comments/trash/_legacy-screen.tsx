'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { MdRestoreFromTrash, MdDeleteOutline, MdOutlineChatBubbleOutline } from 'react-icons/md';
import { useAdminApi } from '../../../components/dashboard/use-admin-api';
import { ActionError } from '../../../components/dashboard/action-error';
import { bulkActionMessage, runBulkAction } from '../../../components/dashboard/bulk-action';
import { LoadingButton } from '../../../components/ui/loading-button';
import { formatRelativeTimeOrDash } from '../../../lib/utils/format';

type TrashedComment = {
  id: string;
  author: string;
  avatarInitials: string;
  content: string;
  targetTitle: string;
  trashedAt: string;
  trashedAtISO: string;
};

type CommentResponse = {
  items: Array<{
    id: string;
    content: string;
    status: 'PENDING' | 'APPROVED' | 'TRASH';
    createdAt: string;
    updatedAt?: string;
    parentId?: string | null;
    targetTitle?: string | null;
    author?: { id: string; name?: string | null; email?: string | null } | null;
  }>;
  total: number;
};

const TRASH_PENDING_KEY = {
  restore: (id: string) => `dashboard.comments.trash.restore:${id}`,
  delete: (id: string) => `dashboard.comments.trash.delete:${id}`,
  bulkRestore: 'dashboard.comments.trash.bulk.restore',
  bulkDelete: 'dashboard.comments.trash.bulk.delete',
};

export default function CommentsTrashPage() {
  const { request, status: authStatus, isPending } = useAdminApi();
  const [items, setItems] = useState<TrashedComment[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const isBulkRestorePending = isPending(TRASH_PENDING_KEY.bulkRestore);
  const isBulkDeletePending = isPending(TRASH_PENDING_KEY.bulkDelete);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let isActive = true;
    setIsLoading(true);
    setLoadError(null);

    request<CommentResponse>('/api/admin/comments?status=TRASH&take=200', {
      actionName: 'dashboard.comments.trash.list',
    })
      .then((payload) => {
        if (!isActive) return;
        const mapped = (payload.items ?? [])
          .filter((item) => !item.parentId)
          .map((item) => {
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
            const trashedAtValue = item.updatedAt || item.createdAt || '';
            return {
              id: item.id,
              author: authorName,
              avatarInitials: initials || 'NA',
              content: item.content,
              targetTitle: item.targetTitle ?? 'Untitled',
              trashedAt: formatRelativeTimeOrDash(trashedAtValue),
              trashedAtISO: trashedAtValue,
            };
          });
        setItems(mapped);
      })
      .catch((err: Error) => {
        if (!isActive) return;
        setLoadError(err.message || 'Unable to load trashed comments.');
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [authStatus, request]);

  const toggle = (id: string) => {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
      }
      return n;
    });
  };

  const restore = async (id: string) => {
    if (isPending(TRASH_PENDING_KEY.restore(id))) return;
    try {
      await request(`/api/admin/comments/${id}`, {
        method: 'PATCH',
        actionName: 'dashboard.comments.restore',
        pendingKey: TRASH_PENDING_KEY.restore(id),
        body: JSON.stringify({ status: 'PENDING' }),
      });
      setItems((p) => p.filter((i) => i.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to restore comment.';
      setLoadError(message);
    } finally {
      setSelected((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
    }
  };

  const deletePerm = async (id: string) => {
    if (isPending(TRASH_PENDING_KEY.delete(id))) return;
    try {
      await request(`/api/admin/comments/${id}`, {
        method: 'DELETE',
        actionName: 'dashboard.comments.delete-permanent',
        pendingKey: TRASH_PENDING_KEY.delete(id),
      });
      setItems((p) => p.filter((i) => i.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete comment.';
      setLoadError(message);
    } finally {
      setSelected((p) => {
        const n = new Set(p);
        n.delete(id);
        return n;
      });
      setConfirmId(null);
    }
  };

  const allSelected = items.length > 0 && selected.size === items.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));

  const restoreSelected = async () => {
    if (isBulkRestorePending) return;
    try {
      const selectedIds = Array.from(selected);
      const result = await runBulkAction({
        ids: selectedIds,
        actionLabel: 'Restore',
        run: (id) =>
          request(`/api/admin/comments/${id}`, {
            method: 'PATCH',
            actionName: 'dashboard.comments.restore',
            pendingKey: TRASH_PENDING_KEY.bulkRestore,
            body: JSON.stringify({ status: 'PENDING' }),
          }).then(() => undefined),
      });
      const failedIds = new Set(result.failures.map((entry) => entry.id));
      setItems((p) => p.filter((item) => !selectedIds.includes(item.id) || failedIds.has(item.id)));
      setSelected(failedIds);
      setLoadError(bulkActionMessage(result, 'Restore'));
      if (result.failureCount === 0) {
        setIsSelectMode(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to restore selected comments.';
      setLoadError(message);
    }
  };

  const deleteSelected = async () => {
    if (isBulkDeletePending) return;
    try {
      const selectedIds = Array.from(selected);
      const result = await runBulkAction({
        ids: selectedIds,
        actionLabel: 'Delete',
        run: (id) =>
          request(`/api/admin/comments/${id}`, {
            method: 'DELETE',
            actionName: 'dashboard.comments.delete-permanent',
            pendingKey: TRASH_PENDING_KEY.bulkDelete,
          }).then(() => undefined),
      });
      const failedIds = new Set(result.failures.map((entry) => entry.id));
      setItems((p) => p.filter((item) => !selectedIds.includes(item.id) || failedIds.has(item.id)));
      setSelected(failedIds);
      setLoadError(bulkActionMessage(result, 'Delete'));
      if (result.failureCount === 0) {
        setIsSelectMode(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete selected comments.';
      setLoadError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">Comment Trash</h1>
          <p className="text-[0.95rem] text-gray-500">
            Recover or permanently delete trashed comments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSelectMode ? (
            <button
              type="button"
              onClick={() => {
                setIsSelectMode(false);
                setSelected(new Set());
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsSelectMode(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] hover:bg-gray-50 transition-colors"
            >
              Select
            </button>
          )}
          <Link
            href="/dashboard/comments"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] hover:bg-gray-50 transition-colors"
          >
            Back to Comments
          </Link>
        </div>
      </div>

      {loadError && <ActionError error={loadError} />}

      {isSelectMode && items.length > 0 && (
        <div className="rounded-[20px] border border-[#e2e6ee] bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[0.85rem] text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded accent-[#0f1116]"
            />
            Select all ({items.length})
          </label>
          <div className="flex gap-2">
            <LoadingButton
              type="button"
              onClick={restoreSelected}
              pending={isBulkRestorePending}
              pendingLabel="Restoring…"
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 rounded-xl border border-[#e1e5ee] px-3 py-2 text-[0.8rem] text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <MdRestoreFromTrash size={15} /> Restore selected
            </LoadingButton>
            <LoadingButton
              type="button"
              onClick={deleteSelected}
              pending={isBulkDeletePending}
              pendingLabel="Deleting…"
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-[0.8rem] text-white hover:bg-red-700 disabled:opacity-40"
            >
              <MdDeleteOutline size={15} /> Delete selected
            </LoadingButton>
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-[20px] border p-4 sm:p-5 transition-colors ${selected.has(item.id) ? 'border-[#0f1116]/20 bg-[#f7f8fb]' : 'border-[#eef1f6] bg-[#fbfcff]'}`}
            >
              <div className="flex gap-3">
                {isSelectMode && (
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                    className="mt-1 h-4 w-4 rounded accent-[#0f1116]"
                  />
                )}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0f1116] text-[0.8rem] font-medium text-[#d5ea52]">
                  {item.avatarInitials}
                </div>
                <div className="flex-1">
                  <p className="text-[0.9rem] font-medium text-gray-400 line-through">
                    {item.author}
                  </p>
                  <p className="text-[0.85rem] text-gray-400 mt-0.5">{item.content}</p>
                  <p className="text-[0.78rem] text-gray-400 mt-0.5">
                    On <span className="font-medium">{item.targetTitle}</span> · Trashed{' '}
                    {item.trashedAt}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <LoadingButton
                      type="button"
                      onClick={() => restore(item.id)}
                      pending={isPending(TRASH_PENDING_KEY.restore(item.id))}
                      pendingLabel="Restoring…"
                      spinnerSize="xs"
                      className="flex items-center gap-1.5 rounded-xl bg-[#0f1116] px-3 py-2 text-[0.78rem] font-medium text-white hover:opacity-90 transition-opacity"
                    >
                      <MdRestoreFromTrash size={14} /> Restore
                    </LoadingButton>
                    {confirmId === item.id ? (
                      <>
                        <LoadingButton
                          type="button"
                          onClick={() => deletePerm(item.id)}
                          pending={isPending(TRASH_PENDING_KEY.delete(item.id))}
                          pendingLabel="Deleting…"
                          spinnerSize="xs"
                          className="rounded-xl bg-red-600 px-3 py-2 text-[0.78rem] font-medium text-white hover:bg-red-700"
                        >
                          Confirm
                        </LoadingButton>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="rounded-xl border border-[#e1e5ee] px-3 py-2 text-[0.78rem] text-gray-500 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(item.id)}
                        className="flex items-center gap-1.5 rounded-xl border border-red-100 px-3 py-2 text-[0.78rem] text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <MdDeleteOutline size={14} /> Delete forever
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[24px] border border-dashed border-[#d8dde6] bg-[#fafbff] py-20 text-center">
          <MdOutlineChatBubbleOutline size={36} className="text-gray-300" />
          <p className="text-[1rem] font-medium text-gray-400">
            {isLoading ? 'Loading comments…' : 'Comment trash is empty'}
          </p>
          <Link
            href="/dashboard/comments"
            className="text-[0.85rem] text-[#1e4fd2] hover:underline"
          >
            Back to comments
          </Link>
        </div>
      )}
    </div>
  );
}
