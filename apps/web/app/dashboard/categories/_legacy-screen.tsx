'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  MdSearch,
  MdMoreVert,
  MdEdit,
  MdDeleteOutline,
  MdAdd,
  MdOpenInNew,
  MdClose,
} from 'react-icons/md';
import { useAdminApi } from '../../components/dashboard/use-admin-api';
import { ActionError } from '../../components/dashboard/action-error';
import { bulkActionMessage, runBulkAction } from '../../components/dashboard/bulk-action';

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  parentName: string | null;
  image?: string | null;
  stats?: { prompts: number; posts: number };
};

type MediaItem = {
  id: string;
  title: string;
  url: string;
};

type CategoryResponse = {
  items: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    parent?: { id: string; name: string; slug: string } | null;
    imageUrl?: string | null;
    stats?: { prompts: number; posts: number };
  }>;
  total: number;
};

type MediaResponse = {
  items: Array<{
    id: string;
    title?: string | null;
    url: string;
  }>;
  total: number;
};

const createEmptyCategoryState = () => ({
  name: '',
  slug: '',
  description: '',
  parent: '',
  image: '',
  imageLabel: '',
});

export default function CategoriesPage() {
  const { request, status: authStatus } = useAdminApi();
  const [categories, setCategories] = useState<Category[]>([]);
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState(createEmptyCategoryState);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [mediaSearch, setMediaSearch] = useState('');
  const [isSelectMode, setIsSelectMode] = useState(false);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let isActive = true;
    setIsLoading(true);
    setLoadError(null);
    request<CategoryResponse>('/api/admin/categories?take=200', {
      actionName: 'dashboard.categories.list',
    })
      .then((payload) => {
        if (!isActive) return;
        const mapped = (payload.items ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          slug: item.slug,
          description: item.description ?? '',
          parentId: item.parent?.id ?? null,
          parentName: item.parent?.name ?? null,
          image: item.imageUrl ?? null,
          stats: item.stats ?? undefined,
        }));
        setCategories(mapped);
      })
      .catch((err: Error) => {
        if (!isActive) return;
        setLoadError(err.message || 'Unable to load categories.');
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [authStatus, request]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let isActive = true;
    request<MediaResponse>('/api/admin/media?take=200&status=ACTIVE', {
      actionName: 'dashboard.media.list',
    })
      .then((payload) => {
        if (!isActive) return;
        setMediaLibrary(
          (payload.items ?? []).map((item) => ({
            id: item.id,
            title: item.title ?? 'Untitled',
            url: item.url,
          })),
        );
      })
      .catch((err: Error) => {
        if (!isActive) return;
        setLoadError(err.message || 'Unable to load media library.');
      });

    return () => {
      isActive = false;
    };
  }, [authStatus, request]);

  const filteredCategories = useMemo(() => {
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase()),
    );
  }, [categories, search]);

  const parentOptions = useMemo(() => {
    return categories.filter((category) => !category.parentId && category.id !== editingCategoryId);
  }, [categories, editingCategoryId]);

  const filteredMediaLibrary = useMemo(() => {
    const query = mediaSearch.trim().toLowerCase();
    if (!query) {
      return mediaLibrary;
    }

    return mediaLibrary.filter((item) => item.title.toLowerCase().includes(query));
  }, [mediaLibrary, mediaSearch]);

  const updateSlugFromName = (value: string) => {
    const nextSlug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    return nextSlug;
  };

  const getImageLabelFromUrl = (url: string) => {
    const fileName = url.split('/').pop()?.split('?')[0];
    return fileName ? decodeURIComponent(fileName) : 'Saved category image';
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setNewCategory(createEmptyCategoryState());
    setMediaSearch('');
  };

  const closeCategoryModal = () => {
    setIsModalOpen(false);
    resetCategoryForm();
  };

  const openCreateModal = () => {
    resetCategoryForm();
    setIsModalOpen(true);
  };

  const handleCreateCategory = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newCategory.name.trim()) return;

    const trimmedName = newCategory.name.trim();
    const normalizedSlugInput = newCategory.slug.trim();
    const slug = updateSlugFromName(normalizedSlugInput || trimmedName);
    if (!slug) {
      setLoadError('Category slug must include at least one letter or number.');
      return;
    }

    if (editingCategoryId && newCategory.parent === editingCategoryId) {
      setLoadError('A category cannot be its own parent.');
      return;
    }

    setIsSaving(true);
    setLoadError(null);

    try {
      const payload = {
        name: trimmedName,
        slug,
        description: newCategory.description.trim() || null,
        parentId: newCategory.parent || null,
        imageUrl: newCategory.image.trim() || null,
      };

      if (editingCategoryId) {
        await request(`/api/admin/categories/${editingCategoryId}`, {
          method: 'PATCH',
          actionName: 'dashboard.categories.update',
          body: JSON.stringify(payload),
        });
      } else {
        await request('/api/admin/categories', {
          method: 'POST',
          actionName: 'dashboard.categories.create',
          body: JSON.stringify(payload),
        });
      }

      const refreshed = await request<CategoryResponse>('/api/admin/categories?take=200', {
        actionName: 'dashboard.categories.list',
      });
      const mapped = (refreshed.items ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description ?? '',
        parentId: item.parent?.id ?? null,
        parentName: item.parent?.name ?? null,
        image: item.imageUrl ?? null,
        stats: item.stats ?? undefined,
      }));
      setCategories(mapped);
      closeCategoryModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save category.';
      setLoadError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const selectMediaItem = (item: MediaItem) => {
    setNewCategory((current) => ({
      ...current,
      image: item.url,
      imageLabel: item.title,
    }));
    setIsMediaPickerOpen(false);
    setMediaSearch('');
  };

  const handleMediaUpload = async (file?: File | null) => {
    if (!file) return;

    setIsUploadingMedia(true);
    setLoadError(null);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unable to read file.'));
        reader.readAsDataURL(file);
      });

      const created = await request<{
        id: string;
        title?: string | null;
        url: string;
      }>('/api/admin/media', {
        method: 'POST',
        actionName: 'dashboard.media.create',
        body: JSON.stringify({
          url: dataUrl,
          title: file.name,
          mime: file.type || null,
          size: file.size || null,
        }),
      });

      const uploadedItem = {
        id: created.id,
        title: created.title ?? file.name,
        url: created.url,
      };

      setMediaLibrary((current) => {
        const next = current.filter((item) => item.id !== uploadedItem.id);
        return [uploadedItem, ...next];
      });
      setMediaSearch('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to upload media.';
      setLoadError(message);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const openEditModal = (category: Category) => {
    setEditingCategoryId(category.id);
    setNewCategory({
      name: category.name,
      slug: category.slug,
      description: category.description,
      parent: category.parentId ?? '',
      image: category.image ?? '',
      imageLabel: category.image ? getImageLabelFromUrl(category.image) : '',
    });
    setIsModalOpen(true);
  };

  const handleDeleteCategory = async (categoryId: string) => {
    setLoadError(null);
    try {
      await request(`/api/admin/categories/${categoryId}`, {
        method: 'DELETE',
        actionName: 'dashboard.categories.delete',
      });
      setCategories((current) => current.filter((category) => category.id !== categoryId));
      setSelectedIds((current) => current.filter((id) => id !== categoryId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete category.';
      setLoadError(message);
    }
  };

  const handleBulkDelete = async () => {
    try {
      const result = await runBulkAction({
        ids: selectedIds,
        actionLabel: 'Delete',
        run: (id) =>
          request(`/api/admin/categories/${id}`, {
            method: 'DELETE',
            actionName: 'dashboard.categories.delete',
          }).then(() => undefined),
      });

      const failedIds = new Set(result.failures.map((entry) => entry.id));
      setCategories((current) =>
        current.filter((category) => !selectedIds.includes(category.id) || failedIds.has(category.id)),
      );
      setSelectedIds(Array.from(failedIds));
      setLoadError(bulkActionMessage(result, 'Delete'));

      if (result.failureCount === 0) {
        setIsSelectMode(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete selected categories.';
      setLoadError(message);
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCategories.length && filteredCategories.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCategories.map((c) => c.id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">Categories</h1>
          <p className="text-[0.95rem] text-gray-500">
            Manage and organize your categories effectively.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isSelectMode ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedIds([]);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[0.85rem] font-medium text-red-600 shadow-sm hover:bg-red-100 transition-colors"
                >
                  <MdDeleteOutline size={16} />
                  Delete ({selectedIds.length})
                </button>
              )}
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
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#d5ea52] px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:opacity-90 transition-opacity"
          >
            <MdAdd size={18} />
            New Category
          </button>
        </div>
      </div>

      {loadError && <ActionError error={loadError} />}

      <div className="rounded-[24px] border border-[#e2e6ee] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div className="relative w-full sm:max-w-xs">
            <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories…"
              className="w-full rounded-[999px] border border-[#e1e5ee] bg-white py-2.5 pl-9 pr-3 text-[0.85rem] text-[#0f1116] placeholder:text-gray-400 focus:border-[#0f1116] focus:outline-none focus:ring-1 focus:ring-[#0f1116]/10"
            />
          </div>

          {isSelectMode && filteredCategories.length > 0 && (
            <label className="flex items-center gap-2 text-[0.85rem] font-medium text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={
                  filteredCategories.length > 0 && selectedIds.length === filteredCategories.length
                }
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-[#d7dbe5] accent-[#0f1116]"
              />
              Select All
            </label>
          )}
        </div>

        {filteredCategories.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className={`group relative overflow-hidden rounded-[22px] border bg-white p-5 transition-all ${
                  selectedIds.includes(category.id)
                    ? 'border-[#0f1116]/30 ring-1 ring-[#0f1116]/10'
                    : 'border-[#e8ebf2] hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4">
                  {isSelectMode && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(category.id)}
                      onChange={() => toggleSelection(category.id)}
                      className="mt-1 h-4 w-4 rounded border-[#d7dbe5] accent-[#0f1116] cursor-pointer"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-[1rem] font-medium text-[#0f1116]">
                          {category.name}
                        </h3>
                        <div className="mt-1 inline-flex items-center gap-2 rounded-full bg-[#f4f6fb] px-2.5 py-1 text-[0.7rem] text-gray-500">
                          /{category.slug}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-wider ${
                            category.parentId
                              ? 'bg-blue-50 text-blue-600'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {category.parentId ? 'Child' : 'Parent'}
                        </span>
                        <div className="relative">
                          <button
                            className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-[#0f1116] transition-colors"
                            type="button"
                            onClick={() =>
                              setActiveMenuId((current) =>
                                current === category.id ? null : category.id,
                              )
                            }
                          >
                            <MdMoreVert size={20} />
                          </button>
                          {activeMenuId === category.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setActiveMenuId(null)}
                              />
                              <div className="absolute right-0 top-[calc(100%+4px)] z-20 w-40 rounded-[14px] border border-[#e2e6ee] bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    openEditModal(category);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[0.8rem] text-[#0f1116] hover:bg-gray-50 transition-colors"
                                >
                                  <MdEdit size={16} /> Edit
                                </button>
                                <div className="my-1 border-t border-gray-100" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuId(null);
                                    handleDeleteCategory(category.id);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-[10px] px-3 py-2 text-[0.8rem] text-[#b94a4a] hover:bg-[#fff4f4] transition-colors"
                                >
                                  <MdDeleteOutline size={16} /> Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="mt-3 text-[0.85rem] text-[#4b5563] line-clamp-2">
                      {category.description}
                    </p>

                    <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                      <div className="space-y-2">
                        {category.parentName ? (
                          <span className="block text-[0.75rem] text-gray-500">
                            Sub of{' '}
                            <span className="font-medium text-[#0f1116]">
                              {category.parentName}
                            </span>
                          </span>
                        ) : (
                          <span className="block text-[0.75rem] text-gray-400">
                            Top-level category
                          </span>
                        )}
                        <a
                          href={`/category/${category.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#e1e5ee] bg-white px-3 py-1.5 text-[0.75rem] font-medium text-[#0f1116] transition-colors hover:bg-gray-50"
                        >
                          <MdOpenInNew size={14} />
                          View
                        </a>
                      </div>
                      <div className="flex items-center gap-2 text-[0.72rem] font-medium">
                        <span className="rounded-full bg-[#f1f4f9] px-2.5 py-1 text-gray-600">
                          {category.stats?.prompts || 0} Prompts
                        </span>
                        <span className="rounded-full bg-[#f1f4f9] px-2.5 py-1 text-gray-600">
                          {category.stats?.posts || 0} Posts
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-[#d8dde6] bg-[#fafbff] py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm text-gray-400">
              <MdSearch size={28} />
            </div>
            <div>
              <p className="text-[1.05rem] font-medium text-[#0f1116]">
                {isLoading ? 'Loading categories…' : 'No categories found'}
              </p>
              <p className="mt-1 text-[0.85rem] text-gray-500">
                Try adjusting your search or add a new category.
              </p>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed left-0 right-0 top-0 bottom-0 z-[9999] flex min-h-[100dvh] min-h-[100vh] w-full items-center justify-center bg-black/50 p-4"
              style={{ top: 0, left: 0, right: 0, bottom: 0 }}
              aria-modal="true"
              role="dialog"
            >
              <div className="w-full max-w-[560px] rounded-[28px] bg-white p-6 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[1.2rem] font-medium text-[#0f1116]">
                      {editingCategoryId ? 'Edit Category' : 'Add New Category'}
                    </h2>
                    <p className="text-[0.85rem] text-gray-500">
                      {editingCategoryId
                        ? 'Update the details below.'
                        : 'Fill out the details below.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeCategoryModal}
                    aria-label="Close category modal"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
                  >
                    <MdClose size={20} />
                  </button>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleCreateCategory}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-[0.85rem] text-gray-600">
                      Category Name
                      <input
                        type="text"
                        value={newCategory.name}
                        onChange={(event) => {
                          const value = event.target.value;
                          setNewCategory((current) => ({
                            ...current,
                            name: value,
                            slug: current.slug ? current.slug : updateSlugFromName(value),
                          }));
                        }}
                        placeholder="e.g. Editorial"
                        className="w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116]"
                      />
                    </label>
                    <label className="space-y-2 text-[0.85rem] text-gray-600">
                      Slug
                      <input
                        type="text"
                        value={newCategory.slug}
                        onChange={(event) =>
                          setNewCategory((current) => ({ ...current, slug: event.target.value }))
                        }
                        placeholder="editorial"
                        className="w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116]"
                      />
                    </label>
                  </div>

                  <div className="space-y-2 text-[0.85rem] text-gray-600">
                    <span>Image</span>
                    <div>
                      {newCategory.image ? (
                        <div className="mb-[10px] flex items-center gap-3 rounded-[16px] bg-[#f1f4f8] p-3">
                          <button
                            type="button"
                            onClick={() => setIsMediaPickerOpen(true)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          >
                            <div
                              className="h-16 w-16 shrink-0 rounded-[12px] bg-cover bg-center"
                              style={{ backgroundImage: `url(${newCategory.image})` }}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-[0.9rem] font-medium text-[#0f1116]">
                                {newCategory.imageLabel || 'Selected image'}
                              </p>
                              <p className="mt-1 truncate text-[0.75rem] text-gray-500">
                                Click to change media
                              </p>
                            </div>
                          </button>
                          <button
                            type="button"
                            aria-label="Clear selected image"
                            onClick={() =>
                              setNewCategory((current) => ({
                                ...current,
                                image: '',
                                imageLabel: '',
                              }))
                            }
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#b94a4a] shadow-sm transition-colors hover:bg-[#fff4f4]"
                          >
                            <MdClose size={18} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setIsMediaPickerOpen(true)}
                          className="mb-[10px] flex w-full items-center gap-3 rounded-[16px] bg-[#f1f4f8] p-4 text-left transition-colors hover:bg-[#edf2f7]"
                        >
                          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#0f1116] shadow-sm">
                            <MdAdd size={20} />
                          </span>
                          <span className="text-[0.95rem] font-[400] text-[#0f1116]">
                            Click to upload media
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  <label className="space-y-2 text-[0.85rem] text-gray-600">
                    Description
                    <textarea
                      rows={6}
                      value={newCategory.description}
                      onChange={(event) =>
                        setNewCategory((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Short description for this category."
                      className="min-h-[180px] w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116]"
                    />
                  </label>

                  <label className="space-y-2 text-[0.85rem] text-gray-600">
                    Parent or Child
                    <select
                      value={newCategory.parent}
                      onChange={(event) =>
                        setNewCategory((current) => ({ ...current, parent: event.target.value }))
                      }
                      className="w-full rounded-[12px] border border-[#e1e5ee] px-3 py-2 text-[0.9rem] text-[#0f1116]"
                    >
                      <option value="">Parent (no parent category)</option>
                      {parentOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          Child of {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={closeCategoryModal}
                      className="rounded-xl border border-[#e1e5ee] px-4 py-2 text-[0.85rem] text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="rounded-xl bg-[#0f1116] px-4 py-2 text-[0.85rem] font-medium text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {isSaving ? 'Saving…' : editingCategoryId ? 'Save Changes' : 'Save Category'}
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isMediaPickerOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex min-h-[100dvh] min-h-[100vh] w-full items-start justify-center bg-black/60 p-3 sm:p-4"
              style={{ top: 0, left: 0, right: 0, bottom: 0 }}
              aria-modal="true"
              role="dialog"
            >
              <div className="flex h-[min(94vh,1100px)] w-full max-w-[min(100vw-24px,1800px)] flex-col overflow-hidden rounded-[30px] bg-white shadow-[0_30px_120px_rgba(15,17,22,0.22)]">
                <div className="border-b border-[#e8edf5] px-4 py-4 sm:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2 className="text-[1.2rem] font-medium text-[#0f1116] sm:text-[1.35rem]">
                        Select Media
                      </h2>
                      <p className="text-[0.85rem] text-gray-500">
                        Pick from the media library or upload a new image and use it right away.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <div className="relative w-full sm:w-[280px]">
                        <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="search"
                          value={mediaSearch}
                          onChange={(event) => setMediaSearch(event.target.value)}
                          placeholder="Search media..."
                          className="w-full rounded-[999px] border border-[#e1e5ee] bg-white py-2.5 pl-9 pr-3 text-[0.85rem] text-[#0f1116] placeholder:text-gray-400 focus:border-[#0f1116] focus:outline-none focus:ring-1 focus:ring-[#0f1116]/10"
                        />
                      </div>

                      <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-[#0f1116] px-5 py-2.5 text-[0.85rem] font-medium text-white transition-opacity hover:opacity-90">
                        {isUploadingMedia ? 'Uploading…' : 'Upload new'}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            void handleMediaUpload(file);
                            event.target.value = '';
                          }}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMediaPickerOpen(false);
                          setMediaSearch('');
                        }}
                        className="inline-flex items-center justify-center rounded-full border border-[#e1e5ee] px-4 py-2.5 text-[0.82rem] text-gray-600 transition-colors hover:bg-gray-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                  {filteredMediaLibrary.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-8">
                      {filteredMediaLibrary.map((item) => {
                        const isSelected = newCategory.image === item.url;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => selectMediaItem(item)}
                            className={`group overflow-hidden rounded-[18px] border text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                              isSelected
                                ? 'border-[#0f1116] ring-2 ring-[#0f1116]/10'
                                : 'border-[#e2e6ee] hover:border-[#cfd7e4]'
                            }`}
                          >
                            <div
                              className="aspect-square w-full bg-cover bg-center"
                              style={{ backgroundImage: `url(${item.url})` }}
                            />
                            <div className="p-2.5">
                              <p className="line-clamp-2 text-[0.76rem] font-medium leading-[1.35] text-[#0f1116]">
                                {item.title}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-4 rounded-[24px] border border-dashed border-[#d8dde6] bg-[#fafbff] px-6 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm">
                        <MdSearch size={28} />
                      </div>
                      <div>
                        <p className="text-[1rem] font-medium text-[#0f1116]">
                          {mediaSearch ? 'No media matched your search' : 'No media available yet'}
                        </p>
                        <p className="mt-1 text-[0.85rem] text-gray-500">
                          {mediaSearch
                            ? 'Try a different title or upload a new image.'
                            : 'Upload a new image to start building the category library.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
