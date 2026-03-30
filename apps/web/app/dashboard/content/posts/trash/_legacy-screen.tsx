'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MdRestoreFromTrash, MdDeleteOutline, MdArticle } from 'react-icons/md';
import { useAdminApi } from '../../../../components/dashboard/use-admin-api';
import { ActionError } from '../../../../components/dashboard/action-error';
import { bulkActionMessage, runBulkAction } from '../../../../components/dashboard/bulk-action';
import { formatRelativeTimeOrDash, titleCase } from '../../../../../lib/utils/format';
import { LoadingButton } from '../../../../components/ui/loading-button';

type TrashedPost = {
  id: string;
  title: string;
  type: string;
  trashedAt: string;
  trashedAtISO: string;
};

type PostResponse = {
  items: Array<{
    id: string;
    title: string;
    deletedAt?: string | null;
    updatedAt?: string;
    createdAt?: string;
    postType?: string | null;
    postFormat?: string | null;
  }>;
  total: number;
};

const POST_TRASH_PENDING_KEY = {
  restore: (id: string) => `dashboard.posts.trash.restore:${id}`,
  delete: (id: string) => `dashboard.posts.trash.delete:${id}`,
  bulkRestore: 'dashboard.posts.trash.bulk.restore',
  bulkDelete: 'dashboard.posts.trash.bulk.delete',
};

export default function PostsTrashPage() {
  const { request, status: authStatus, isPending } = useAdminApi();
  const [items, setItems] = useState<TrashedPost[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let isActive = true;
    setIsLoading(true);
    setLoadError(null);
    request<PostResponse>('/api/admin/posts?take=200&trash=true', {
      actionName: 'dashboard.posts.trash.list',
    })
      .then((payload) => {
        if (!isActive) return;
        const mapped = (payload.items ?? []).map((item) => {
          const deletedAtValue = item.deletedAt || item.updatedAt || item.createdAt || '';
          return {
            id: item.id,
            title: item.title,
            type: titleCase(item.postFormat ?? item.postType ?? 'Post'),
            trashedAt: formatRelativeTimeOrDash(deletedAtValue),
            trashedAtISO: deletedAtValue,
          };
        });
        setItems(mapped);
      })
      .catch((err: Error) => {
        if (!isActive) return;
        setLoadError(err.message || 'Unable to load trashed posts.');
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
    const pendingKey = POST_TRASH_PENDING_KEY.restore(id);
    if (isPending(pendingKey)) return;
    try {
      await request(`/api/admin/posts/${id}/restore`, {
        method: 'PATCH',
        actionName: 'dashboard.posts.restore',
        pendingKey,
      });
      setItems((p) => p.filter((i) => i.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to restore post.';
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
    const pendingKey = POST_TRASH_PENDING_KEY.delete(id);
    if (isPending(pendingKey)) return;
    try {
      await request(`/api/admin/posts/${id}`, {
        method: 'DELETE',
        actionName: 'dashboard.posts.delete-permanent',
        pendingKey,
      });
      setItems((p) => p.filter((i) => i.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete post.';
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
  const restoreSelected = async () => {
    if (isPending(POST_TRASH_PENDING_KEY.bulkRestore)) return;
    try {
      const selectedIds = Array.from(selected);
      const result = await runBulkAction({
        ids: selectedIds,
        actionLabel: 'Restore',
        run: (id) =>
          request(`/api/admin/posts/${id}/restore`, {
            method: 'PATCH',
            actionName: 'dashboard.posts.restore',
            pendingKey: POST_TRASH_PENDING_KEY.bulkRestore,
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
      const message = err instanceof Error ? err.message : 'Unable to restore selected posts.';
      setLoadError(message);
    }
  };
  const deleteSelected = async () => {
    if (isPending(POST_TRASH_PENDING_KEY.bulkDelete)) return;
    try {
      const selectedIds = Array.from(selected);
      const result = await runBulkAction({
        ids: selectedIds,
        actionLabel: 'Delete',
        run: (id) =>
          request(`/api/admin/posts/${id}`, {
            method: 'DELETE',
            actionName: 'dashboard.posts.delete-permanent',
            pendingKey: POST_TRASH_PENDING_KEY.bulkDelete,
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
      const message = err instanceof Error ? err.message : 'Unable to delete selected posts.';
      setLoadError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">Post Trash</h1>
          <p className="text-[0.95rem] text-gray-500">
            Recover or permanently delete trashed posts.
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
            href="/dashboard/content/posts"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] hover:bg-gray-50 transition-colors"
          >
            Back to Posts
          </Link>
        </div>
      </div>

      {loadError && <ActionError error={loadError} />}

      {isSelectMode && items.length > 0 && (
        <div className="rounded-[20px] border border-[#e2e6ee] bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[0.85rem] text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={items.length > 0 && selected.size === items.length}
              onChange={() =>
                setSelected(
                  selected.size === items.length ? new Set() : new Set(items.map((i) => i.id)),
                )
              }
              className="h-4 w-4 accent-[#0f1116]"
            />
            Select all
          </label>
          <div className="flex gap-2">
            <LoadingButton
              type="button"
              onClick={restoreSelected}
              pending={isPending(POST_TRASH_PENDING_KEY.bulkRestore)}
              pendingLabel="Restoring..."
              spinnerSize="xs"
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 rounded-xl border border-[#e1e5ee] px-3 py-2 text-[0.8rem] text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <MdRestoreFromTrash size={15} /> Restore selected
            </LoadingButton>
            <LoadingButton
              type="button"
              onClick={deleteSelected}
              pending={isPending(POST_TRASH_PENDING_KEY.bulkDelete)}
              pendingLabel="Deleting..."
              spinnerSize="xs"
              spinnerClassName="text-white"
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-[0.8rem] text-white hover:bg-red-700 disabled:opacity-40"
            >
              <MdDeleteOutline size={15} /> Delete selected
            </LoadingButton>
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="overflow-hidden rounded-[24px] border border-[#e2e6ee] bg-white shadow-sm">
          <table className="w-full min-w-[480px] text-left">
            <thead>
              <tr className="text-[0.78rem] font-medium uppercase tracking-wide text-gray-400 border-b border-gray-50">
                {isSelectMode && <th className="px-5 py-3 w-8"></th>}
                <th className="px-5 py-3">Title</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Deleted</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`transition-colors ${selected.has(item.id) ? 'bg-[#f7f8fb]' : 'hover:bg-gray-50'}`}
                >
                  {isSelectMode && (
                    <td className="px-5 py-4">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="h-4 w-4 accent-[#0f1116]"
                      />
                    </td>
                  )}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <MdArticle size={16} className="text-gray-300 shrink-0" />
                      <span className="text-[0.88rem] font-medium text-gray-400 line-through">
                        {item.title}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-[0.82rem] text-gray-400">{item.type}</td>
                  <td className="px-5 py-4 text-[0.82rem] text-gray-400">{item.trashedAt}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <LoadingButton
                        type="button"
                        onClick={() => restore(item.id)}
                        pending={isPending(POST_TRASH_PENDING_KEY.restore(item.id))}
                        pendingLabel="Restoring..."
                        spinnerSize="xs"
                        spinnerClassName="text-white"
                        className="flex items-center gap-1 rounded-xl bg-[#0f1116] px-3 py-1.5 text-[0.78rem] font-medium text-white hover:opacity-90"
                      >
                        <MdRestoreFromTrash size={14} /> Restore
                      </LoadingButton>
                      {confirmId === item.id ? (
                        <>
                          <LoadingButton
                            type="button"
                            onClick={() => deletePerm(item.id)}
                            pending={isPending(POST_TRASH_PENDING_KEY.delete(item.id))}
                            pendingLabel="Deleting..."
                            spinnerSize="xs"
                            spinnerClassName="text-white"
                            className="rounded-xl bg-red-600 px-3 py-1.5 text-[0.78rem] text-white hover:bg-red-700"
                          >
                            Confirm
                          </LoadingButton>
                          <button
                            type="button"
                            onClick={() => setConfirmId(null)}
                            disabled={isPending(POST_TRASH_PENDING_KEY.delete(item.id))}
                            className="rounded-xl border px-3 py-1.5 text-[0.78rem] text-gray-500 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmId(item.id)}
                          disabled={
                            isPending(POST_TRASH_PENDING_KEY.restore(item.id)) ||
                            isPending(POST_TRASH_PENDING_KEY.delete(item.id))
                          }
                          className="flex items-center gap-1 rounded-xl border border-red-100 px-3 py-1.5 text-[0.78rem] text-red-600 hover:bg-red-50"
                        >
                          <MdDeleteOutline size={14} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-[24px] border border-dashed border-[#d8dde6] bg-[#fafbff] py-20 text-center">
          <MdDeleteOutline size={36} className="text-gray-300" />
          <p className="text-[1rem] font-medium text-gray-400">
            {isLoading ? 'Loading trash…' : 'Post trash is empty'}
          </p>
          <Link
            href="/dashboard/content/posts"
            className="text-[0.85rem] text-[#1e4fd2] hover:underline"
          >
            Back to posts
          </Link>
        </div>
      )}
    </div>
  );
}
