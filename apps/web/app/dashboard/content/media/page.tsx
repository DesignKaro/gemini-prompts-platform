'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { MdClose, MdOutlineImage, MdDeleteOutline, MdOpenInNew, MdContentCopy } from 'react-icons/md';
import { useAdminApi } from '../../../components/dashboard/use-admin-api';
import { formatBytes, formatRelativeTimeOrDash } from '../../../../lib/utils/format';

type MediaItem = {
  id: string;
  url: string;
  title: string;
  mime: string | null;
  size: number | null;
  uploadedAt: string;
  altText: string | null;
};

type MediaResponse = {
  items: Array<{
    id: string;
    title?: string | null;
    url: string;
    mime?: string | null;
    size?: number | null;
    altText?: string | null;
    createdAt: string;
  }>;
  total: number;
};

export default function MediaManagementPage() {
  const { request, status: authStatus } = useAdminApi();
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'JPG' | 'PNG'>('All');
  const [draftDetails, setDraftDetails] = useState({
    altText: '',
    title: '',
  });
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const activeMedia = mediaItems.find((m) => m.id === activeMediaId);

  const refreshMedia = useCallback(async () => {
    if (authStatus !== 'authenticated') return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const payload = await request<MediaResponse>('/api/admin/media?take=200&status=ACTIVE');
      const mapped = (payload.items ?? []).map((item) => ({
        id: item.id,
        url: item.url,
        title: item.title ?? 'Untitled',
        mime: item.mime ?? null,
        size: item.size ?? null,
        uploadedAt: item.createdAt,
        altText: item.altText ?? null,
      }));
      setMediaItems(mapped);
      if (activeMediaId && !mapped.find((item) => item.id === activeMediaId)) {
        setActiveMediaId(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load media.';
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  }, [activeMediaId, authStatus, request]);

  useEffect(() => {
    refreshMedia();
  }, [refreshMedia]);

  useEffect(() => {
    if (!activeMedia) return;
    setDraftDetails({
      altText: activeMedia.altText || '',
      title: activeMedia.title || '',
    });
  }, [activeMediaId, activeMedia?.altText, activeMedia?.title]);

  const getMediaType = (item: MediaItem) => {
    const mime = item.mime?.toLowerCase() ?? '';
    if (mime.includes('png')) return 'PNG';
    if (mime.includes('jpg') || mime.includes('jpeg')) return 'JPG';
    const ext = item.url.split('.').pop()?.split('?')[0]?.toUpperCase();
    if (ext === 'JPEG') return 'JPG';
    if (ext === 'PNG') return 'PNG';
    if (ext === 'JPG') return 'JPG';
    return 'JPG';
  };

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return mediaItems.filter((item) => {
      const matchesType = typeFilter === 'All' || getMediaType(item) === typeFilter;
      const matchesSearch =
        !query ||
        item.title.toLowerCase().includes(query) ||
        (item.altText ?? '').toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [mediaItems, search, typeFilter]);

  const allSelected = filteredItems.length > 0 && selectedIds.length === filteredItems.length;

  const toggleSelection = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((m: MediaItem) => m.id));
    }
  };

  const handleUpdateActiveMedia = (field: 'altText' | 'title', value: string) => {
    if (!activeMediaId) return;
    setMediaItems((prev) =>
      prev.map((item) =>
        item.id === activeMediaId ? { ...item, [field]: value } : item
      )
    );
  };

  const isDetailsDirty =
    !!activeMedia &&
    (draftDetails.altText !== (activeMedia.altText || '') ||
      draftDetails.title !== (activeMedia.title || ''));

  const saveMediaDetails = async () => {
    if (!activeMediaId || !activeMedia) return;
    setIsSavingDetails(true);
    try {
      await request(`/api/admin/media/${activeMediaId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          altText: draftDetails.altText,
          title: draftDetails.title,
        }),
      });
      handleUpdateActiveMedia('altText', draftDetails.altText);
      handleUpdateActiveMedia('title', draftDetails.title);
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoadError(null);
    try {
      await request(`/api/admin/media/${id}`, { method: 'DELETE' });
      setMediaItems((prev) => prev.filter((i) => i.id !== id));
      setSelectedIds((prev) => prev.filter((i) => i !== id));
      if (activeMediaId === id) setActiveMediaId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete media.';
      setLoadError(message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setLoadError(null);
    try {
      await Promise.all(
        selectedIds.map((id) => request(`/api/admin/media/${id}`, { method: 'DELETE' })),
      );
      setMediaItems((prev) => prev.filter((i) => !selectedIds.includes(i.id)));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to delete selected media.';
      setLoadError(message);
    } finally {
      setSelectedIds([]);
      setIsSelectMode(false);
    }
  };

  const copyUrlToClipboard = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      // Optional: Add toast notification
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleUpload = async (file?: File | null) => {
    if (!file) return;
    setLoadError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unable to read file.'));
        reader.readAsDataURL(file);
      });

      await request('/api/admin/media', {
        method: 'POST',
        body: JSON.stringify({
          url: dataUrl,
          title: file.name,
          mime: file.type || null,
          size: file.size || null,
        }),
      });

      await refreshMedia();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to upload media.';
      setLoadError(message);
    }
  };

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto pr-2 sm:pr-4 transition-all duration-300 ${activeMediaId ? 'mr-[360px] hidden xl:block' : ''}`}>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">Media</h1>
              <p className="text-[0.95rem] text-gray-500">Manage your uploads, assets, and media library.</p>
            </div>
            {isSelectMode ? (
              <>
                <button
                  type="button"
                  onClick={() => { setIsSelectMode(false); setSelectedIds([]); }}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:bg-gray-50 transition-colors shrink-0"
                >
                  Cancel
                </button>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-[0.85rem] font-medium text-red-600 shadow-sm hover:bg-red-100 transition-colors shrink-0"
                  >
                    <MdDeleteOutline size={16} />
                    Delete Selected ({selectedIds.length})
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsSelectMode(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:bg-gray-50 transition-colors shrink-0"
              >
                Select
              </button>
            )}
          </div>

          {loadError && (
            <div className="rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[0.85rem] text-red-700">
              {loadError}
            </div>
          )}

          {!mediaItems.length ? (
            <div className="rounded-[30px] border border-dashed border-[#d8dde6] bg-white p-12 text-center flex flex-col items-center justify-center gap-4">
              <div className="h-16 w-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
                <MdOutlineImage size={32} />
              </div>
              <div className="max-w-xs">
                <h3 className="text-[1.1rem] font-medium text-[#0f1116]">No media yet</h3>
                <p className="text-[0.85rem] text-gray-500 mt-2">
                  {isLoading ? 'Loading media library…' : 'Upload your first image or asset to build the library.'}
                </p>
              </div>
              <label className="mt-2 cursor-pointer rounded-xl bg-[#d5ea52] px-6 py-2.5 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:opacity-90 transition-opacity">
                Upload Media
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(event) => handleUpload(event.target.files?.[0])}
                />
              </label>
            </div>
          ) : (
            <div className="rounded-[24px] border border-[#e2e6ee] bg-white p-4 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-[1.1rem] font-medium text-[#0f1116]">Recent uploads</h2>
                  <p className="text-[0.85rem] text-gray-500">Showing {filteredItems.length} files</p>
                </div>
                <div className="flex items-center gap-2">
                  {isSelectMode && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="rounded-full border border-[#e1e5ee] px-4 py-2 text-[0.82rem] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {allSelected ? 'Deselect all' : 'Select all'}
                    </button>
                  )}
                  <label className="cursor-pointer rounded-full bg-[#0f1116] px-5 py-2 text-[0.85rem] font-medium text-white hover:opacity-90 transition-opacity">
                    Upload new
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(event) => handleUpload(event.target.files?.[0])}
                    />
                  </label>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-xs">
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
                    <circle cx="11" cy="11" r="7" />
                  </svg>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search media..."
                    className="w-full rounded-[999px] border border-[#e1e5ee] bg-white py-2.5 pl-9 pr-3 text-[0.85rem] text-[#0f1116] placeholder:text-gray-400 focus:border-[#0f1116] focus:outline-none focus:ring-1 focus:ring-[#0f1116]/10"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value as 'All' | 'JPG' | 'PNG')}
                    className="rounded-full border border-[#e1e5ee] bg-white px-4 py-2 text-[0.82rem] text-gray-600"
                  >
                    <option value="All">All types</option>
                    <option value="JPG">JPG</option>
                    <option value="PNG">PNG</option>
                  </select>
                  {isSelectMode && (
                    <label className="flex items-center gap-2 text-[0.8rem] text-gray-500">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-[#d7dbe5]"
                      />
                      Select all
                    </label>
                  )}
                  <span className="text-[0.8rem] text-gray-400">{selectedIds.length} selected</span>
                </div>
              </div>

              <div className={`mt-5 grid gap-5 grid-cols-2 sm:grid-cols-3 ${activeMediaId ? 'md:grid-cols-3 xl:grid-cols-4' : 'md:grid-cols-4 lg:grid-cols-5'}`}>
                {filteredItems.map((item: MediaItem) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isActive = activeMediaId === item.id;
                  
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => setActiveMediaId(item.id)}
                      className={`group cursor-pointer overflow-hidden rounded-[16px] border transition-all hover:shadow-lg hover:shadow-black/5 ${isActive ? 'border-[#0f1116] ring-1 ring-[#0f1116]' : isSelected ? 'border-[#d5ea52] ring-1 ring-[#d5ea52]' : 'border-[#e6e9ef]'}`}
                    >
                      <div className="relative h-[220px] w-full overflow-hidden bg-gray-50">
                        <div
                          className="h-full w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                          style={{ backgroundImage: `url(${item.url})` }}
                        />
                        {isSelectMode && (
                          <div className="absolute left-4 top-4 z-10">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => toggleSelection(item.id, e as unknown as React.MouseEvent)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-[#d7dbe5] accent-[#0f1116] shadow-sm cursor-pointer"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Attachment Details */}
      {(activeMediaId || activeMedia) && (
        <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[360px] bg-white shadow-2xl transition-transform duration-300 transform translate-x-0 border-l border-[#eef2f6] flex flex-col ${activeMediaId ? '' : 'translate-x-[100%]'}`}>
          <div className="flex items-center justify-between border-b border-[#eef2f6] px-5 py-4 shrink-0">
            <h2 className="text-[1.1rem] font-medium text-[#0f1116]">Attachment details</h2>
            <button
              onClick={() => setActiveMediaId(null)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-[#0f1116] transition-colors"
            >
              <MdClose size={20} />
            </button>
          </div>
          
          {activeMedia ? (
            <div className="flex-1 overflow-y-auto no-scrollbar p-5">
              <div className="relative mb-5 aspect-video w-full overflow-hidden rounded-[14px] border border-[#e2e6ee] bg-gray-50">
                <img 
                  src={activeMedia.url} 
                  alt={activeMedia.altText || activeMedia.title} 
                  className="h-full w-full object-cover"
                />
              </div>

              <div className="space-y-1 mb-6 text-[0.8rem] text-gray-500">
                <p className="font-medium text-[#0f1116] break-all">
                  {activeMedia.title}.{getMediaType(activeMedia).toLowerCase()}
                </p>
                <div className="flex items-center justify-between">
                  <span>{formatRelativeTimeOrDash(activeMedia.uploadedAt)}</span>
                  <span>{formatBytes(activeMedia.size, { zeroAsDash: true })}</span>
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <a href={activeMedia.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[#1e4fd2] hover:underline">
                    View original <MdOpenInNew size={14} />
                  </a>
                  <button 
                    onClick={() => copyUrlToClipboard(activeMedia.url)}
                    className="inline-flex items-center gap-1.5 ml-3 text-gray-600 hover:text-[#0f1116]"
                  >
                    Copy URL <MdContentCopy size={14} />
                  </button>
                </div>
              </div>

              <div className="h-px w-full bg-[#eef2f6] mb-6" />

              <div className="space-y-4">
                <label className="block">
                  <span className="block text-[0.8rem] font-medium text-gray-600 mb-1.5">Alt text</span>
                  <input
                    type="text"
                    value={draftDetails.altText}
                    onChange={(e) =>
                      setDraftDetails((prev) => ({ ...prev, altText: e.target.value }))
                    }
                    placeholder="Describe the purpose of the image. Leave empty if decorative."
                    className="w-full rounded-[10px] border border-[#e1e5ee] px-3 py-2 text-[0.85rem] text-[#0f1116] placeholder:text-gray-400 focus:border-[#0f1116] focus:outline-none focus:ring-1 focus:ring-[#0f1116]/10"
                  />
                  <p className="text-[0.7rem] text-gray-400 mt-1.5 leading-tight">Leave empty if the image is purely decorative.</p>
                </label>

                <label className="block">
                  <span className="block text-[0.8rem] font-medium text-gray-600 mb-1.5">Title</span>
                  <input
                    type="text"
                    value={draftDetails.title}
                    onChange={(e) =>
                      setDraftDetails((prev) => ({ ...prev, title: e.target.value }))
                    }
                    className="w-full rounded-[10px] border border-[#e1e5ee] px-3 py-2 text-[0.85rem] text-[#0f1116] focus:border-[#0f1116] focus:outline-none focus:ring-1 focus:ring-[#0f1116]/10"
                  />
                </label>
              </div>

              <div className="mt-8 pt-4 border-t border-[#eef2f6] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraftDetails({
                        altText: activeMedia.altText || '',
                        title: activeMedia.title || '',
                      })
                    }
                    disabled={!isDetailsDirty}
                    className="rounded-full border border-[#e1e5ee] px-4 py-2 text-[0.8rem] text-gray-600 disabled:opacity-50"
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={saveMediaDetails}
                    disabled={!isDetailsDirty || isSavingDetails}
                    className="rounded-full bg-[#0f1116] px-4 py-2 text-[0.8rem] text-white disabled:opacity-50"
                  >
                    {isSavingDetails ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(activeMedia.id)}
                  className="font-medium text-[#b94a4a] text-[0.85rem] hover:underline"
                >
                  Delete permanently
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <p>Media item not found.</p>
            </div>
          )}
        </div>
      )}
      
      {/* Mobile Backdrop for Sidebar */}
      {activeMediaId && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 xl:hidden backdrop-blur-sm transition-opacity animate-in fade-in"
          onClick={() => setActiveMediaId(null)}
        />
      )}
    </div>
  );
}
