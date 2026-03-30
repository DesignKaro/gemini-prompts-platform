'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MdRestoreFromTrash, MdDeleteOutline, MdAutoAwesome } from 'react-icons/md';
import { useAdminApi } from '../../../../components/dashboard/use-admin-api';
import { ActionError } from '../../../../components/dashboard/action-error';
import { bulkActionMessage, runBulkAction } from '../../../../components/dashboard/bulk-action';
import { formatRelativeTimeOrDash } from '../../../../../lib/utils/format';

type TrashedPrompt = {
  id: string;
  title: string;
  category: string;
  trashedAt: string;
  trashedAtISO: string;
};

type PromptResponse = {
  items: Array<{
    id: string;
    title: string;
    deletedAt?: string | null;
    updatedAt?: string;
    createdAt?: string;
    primaryCategory?: { id: string; name: string; slug: string } | null;
    categories?: Array<{ id: string; name: string; slug: string }>;
  }>;
  total: number;
};

export default function PromptsTrashPage() {
  const { request, status: authStatus } = useAdminApi();
  const [items, setItems] = useState<TrashedPrompt[]>([]);
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
    request<PromptResponse>('/api/admin/prompts?take=200&trash=true', {
      actionName: 'dashboard.prompts.trash.list',
    })
      .then((payload) => {
        if (!isActive) return;
        const mapped = (payload.items ?? []).map((item) => {
          const primary = item.primaryCategory ?? item.categories?.[0] ?? null;
          const deletedAtValue = item.deletedAt || item.updatedAt || item.createdAt || '';
          return {
            id: item.id,
            title: item.title,
            category: primary?.name ?? 'Uncategorized',
            trashedAt: formatRelativeTimeOrDash(deletedAtValue),
            trashedAtISO: deletedAtValue,
          };
        });
        setItems(mapped);
      })
      .catch((err: Error) => {
        if (!isActive) return;
        setLoadError(err.message || 'Unable to load trashed prompts.');
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
    try {
      await request(`/api/admin/prompts/${id}/restore`, {
        method: 'PATCH',
        actionName: 'dashboard.prompts.restore',
      });
      setItems((p) => p.filter((i) => i.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to restore prompt.';
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
    try {
      await request(`/api/admin/prompts/${id}`, {
        method: 'DELETE',
        actionName: 'dashboard.prompts.delete-permanent',
      });
      setItems((p) => p.filter((i) => i.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete prompt.';
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
    try {
      const selectedIds = Array.from(selected);
      const result = await runBulkAction({
        ids: selectedIds,
        actionLabel: 'Restore',
        run: (id) =>
          request(`/api/admin/prompts/${id}/restore`, {
            method: 'PATCH',
            actionName: 'dashboard.prompts.restore',
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
      const message = err instanceof Error ? err.message : 'Unable to restore selected prompts.';
      setLoadError(message);
    }
  };
  const deleteSelected = async () => {
    try {
      const selectedIds = Array.from(selected);
      const result = await runBulkAction({
        ids: selectedIds,
        actionLabel: 'Delete',
        run: (id) =>
          request(`/api/admin/prompts/${id}`, {
            method: 'DELETE',
            actionName: 'dashboard.prompts.delete-permanent',
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
      const message = err instanceof Error ? err.message : 'Unable to delete selected prompts.';
      setLoadError(message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">Prompt Trash</h1>
          <p className="text-[0.95rem] text-gray-500">
            Recover or permanently delete trashed prompts.
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
            href="/dashboard/content/prompts"
            className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] text-[#0f1116] hover:bg-gray-50 transition-colors"
          >
            Back to Prompts
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
            <button
              type="button"
              onClick={restoreSelected}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 rounded-xl border border-[#e1e5ee] px-3 py-2 text-[0.8rem] text-gray-700 hover:bg-gray-50 disabled:opacity-40"
            >
              <MdRestoreFromTrash size={15} /> Restore selected
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3 py-2 text-[0.8rem] text-white hover:bg-red-700 disabled:opacity-40"
            >
              <MdDeleteOutline size={15} /> Delete selected
            </button>
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className={`rounded-[24px] border bg-white p-5 shadow-sm transition-colors ${selected.has(item.id) ? 'border-[#0f1116]/20 bg-[#f7f8fb]' : 'border-[#e2e6ee]'}`}
            >
              <div className="flex items-start gap-3">
                {isSelectMode && (
                  <input
                    type="checkbox"
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                    className="mt-1 h-4 w-4 accent-[#0f1116]"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f3f8] text-gray-400">
                      <MdAutoAwesome size={16} />
                    </div>
                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[0.7rem] text-red-500">
                      Trashed
                    </span>
                  </div>
                  <h3 className="mt-2 text-[0.95rem] font-medium text-gray-400 line-through">
                    {item.title}
                  </h3>
                  <p className="text-[0.78rem] text-gray-400 mt-0.5">
                    {item.category} · {item.trashedAt}
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => restore(item.id)}
                      className="flex items-center gap-1.5 rounded-xl bg-[#0f1116] px-3 py-2 text-[0.78rem] font-medium text-white hover:opacity-90 transition-opacity"
                    >
                      <MdRestoreFromTrash size={14} /> Restore
                    </button>
                    {confirmId === item.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => deletePerm(item.id)}
                          className="rounded-xl bg-red-600 px-3 py-2 text-[0.78rem] text-white hover:bg-red-700"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmId(null)}
                          className="rounded-xl border px-3 py-2 text-[0.78rem] text-gray-500 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmId(item.id)}
                        className="flex items-center gap-1.5 rounded-xl border border-red-100 px-3 py-2 text-[0.78rem] text-red-600 hover:bg-red-50"
                      >
                        <MdDeleteOutline size={14} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-[24px] border border-dashed border-[#d8dde6] bg-[#fafbff] py-20 text-center">
          <MdDeleteOutline size={36} className="text-gray-300" />
          <p className="text-[1rem] font-medium text-gray-400">
            {isLoading ? 'Loading trash…' : 'Prompt trash is empty'}
          </p>
          <Link
            href="/dashboard/content/prompts"
            className="text-[0.85rem] text-[#1e4fd2] hover:underline"
          >
            Back to prompts
          </Link>
        </div>
      )}
    </div>
  );
}
