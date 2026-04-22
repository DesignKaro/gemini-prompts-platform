'use client';

import type { FC } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EditorContent, type Editor, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';

import {
  MdFormatBold,
  MdFormatItalic,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdFormatQuote,
  MdFormatStrikethrough,
  MdFormatUnderlined,
  MdInsertLink,
  MdRedo,
  MdUndo,
  MdClose,
  MdFormatAlignLeft,
  MdFormatAlignCenter,
  MdFormatAlignRight,
  MdFormatAlignJustify,
  MdFormatClear,
  MdCode,
  MdHorizontalRule,
  MdSubscript,
  MdSuperscript,
  MdImage,
  MdSmartToy,
} from 'react-icons/md';
import { BiHighlight } from 'react-icons/bi';
import { PromptBox } from './extensions/prompt-box';
import { useAdminApi } from './dashboard/use-admin-api';
import { getFileStem } from '../../lib/utils/file-name';

/* ─── Types ─── */
type Props = { value: string; onChange: (html: string) => void };
type TextBlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
type AlignType = 'left' | 'center' | 'right' | 'justify';
type Rect = { top: number; left: number; bottom: number };

/* ─── Highlight palette ─── */
const HIGHLIGHT_COLORS = [
  { label: 'Yellow', value: '#fef08a' },
  { label: 'Green', value: '#bbf7d0' },
  { label: 'Blue', value: '#bfdbfe' },
  { label: 'Pink', value: '#fecdd3' },
  { label: 'Purple', value: '#e9d5ff' },
  { label: 'Orange', value: '#fed7aa' },
];

/* ─── Extensions ─── */
const extensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5] } }),
  Underline,
  Link.configure({
    openOnClick: false,
    autolink: true,
    linkOnPaste: true,
    HTMLAttributes: { rel: null, target: null },
  }),
  TextAlign.configure({ types: ['paragraph', 'heading'] }),
  Highlight.configure({ multicolor: true }),
  Placeholder.configure({
    placeholder: 'Start typing...',
    showOnlyWhenEditable: true,
  }),
  Subscript.extend({ excludes: 'superscript' }),
  Superscript.extend({ excludes: 'subscript' }),
  Image.configure({ inline: false, allowBase64: true }),
  PromptBox,
];

/* ─── Toolbar button ─── */
function TBtn({
  active,
  onClick,
  disabled = false,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[1.1rem] transition-colors
        ${active ? 'bg-[#e8f0ff] text-[#2e5edb]' : 'text-[#4b5565] hover:bg-[#eef2f8] hover:text-[#1f2937]'}
        ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
    >
      {children}
    </button>
  );
}

/* ─── Divider ─── */
const Divider = () => <div className="mx-0.5 h-6 w-px shrink-0 bg-[#d3dae6]" />;

/* ─── Fixed popover helper (escapes overflow:hidden via portal) ─── */
function FixedPopover({
  anchor,
  onClose,
  children,
}: {
  anchor: Rect | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('[data-popover]') && !target.closest('[data-popover-trigger]')) onClose();
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onClose]);

  if (!anchor) return null;

  const style: React.CSSProperties = {
    position: 'fixed',
    top: anchor.bottom + 6,
    left: anchor.left,
    zIndex: 9999,
  };

  return createPortal(
    <div
      data-popover
      style={style}
      className="rounded-[14px] border border-gray-100 bg-white shadow-2xl"
    >
      {children}
    </div>,
    document.body,
  );
}

/* ─── Highlight picker ─── */
function HighlightPicker({ editor, disabled }: { editor: Editor | null; disabled: boolean }) {
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const isActive = editor?.isActive('highlight') ?? false;

  const toggle = () => {
    if (anchor) {
      setAnchor(null);
      return;
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setAnchor({ top: r.top, left: r.left, bottom: r.bottom });
  };

  return (
    <>
      <button
        ref={btnRef}
        data-popover-trigger
        type="button"
        title="Highlight colour"
        disabled={disabled}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[1.1rem] transition-colors
          ${isActive ? 'bg-[#e8f0ff] text-[#2e5edb]' : 'text-[#4b5565] hover:bg-[#eef2f8]'}
          ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
        onMouseDown={(e) => {
          e.preventDefault();
          if (!disabled) toggle();
        }}
      >
        <BiHighlight />
      </button>

      {anchor && (
        <FixedPopover anchor={anchor} onClose={() => setAnchor(null)}>
          <div className="flex flex-col gap-2 p-3">
            <p className="text-[0.7rem] font-semibold uppercase tracking-wider text-gray-400">
              Highlight
            </p>
            <div className="flex gap-2">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor?.chain().focus().toggleHighlight({ color: c.value }).run();
                    setAnchor(null);
                  }}
                  className="h-6 w-6 rounded-full border-2 border-white shadow-md transition hover:scale-125"
                  style={{ backgroundColor: c.value }}
                />
              ))}
              <button
                type="button"
                title="Remove highlight"
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor?.chain().focus().unsetHighlight().run();
                  setAnchor(null);
                }}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-gray-300 bg-white text-[0.65rem] text-gray-400 hover:border-gray-500"
              >
                ✕
              </button>
            </div>
          </div>
        </FixedPopover>
      )}
    </>
  );
}

/* ─── Media Library Types ─── */
type MediaItem = {
  id: string;
  url: string;
  title: string;
};

const LIBRARY_PAGE_SIZE = 100;
const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

/* ─── Image modal ─── */
function ImagePicker({ editor, disabled }: { editor: Editor | null; disabled: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'upload' | 'library' | 'url'>('upload');

  // URL Tab State
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');

  // Library Tab State
  const [libraryMedia, setLibraryMedia] = useState<MediaItem[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<MediaItem | null>(null);
  const [libraryAltText, setLibraryAltText] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  const { request } = useAdminApi();

  const close = () => {
    setIsOpen(false);
    setUrl('');
    setAlt('');
    setSelectedImage(null);
    setLibraryAltText('');
  };

  const insert = (src: string, altText: string = alt) => {
    if (!src || !editor) return;
    editor
      .chain()
      .focus()
      .insertContent({ type: 'image', attrs: { src, alt: altText } })
      .run();
    close();
  };

  // Upload handler
  const handleUpload = async (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      alert('Image must be 10MB or smaller.');
      return;
    }
    const fileTitle = getFileStem(file.name) || file.name;
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', fileTitle);

      const response = await request<{ id?: string; url: string; title?: string | null }>(
        '/api/admin/media/upload',
        {
          method: 'POST',
          body: formData,
        },
      );

      // Instead of inserting directly, select it in the library and switch tabs
      const newItem: MediaItem = {
        id: response.id || Math.random().toString(), // fallback id for legacy response shapes
        url: response.url,
        title: response.title?.trim() || fileTitle,
      };
      setLibraryMedia((prev) => [newItem, ...prev]);
      setSelectedImage(newItem);
      setTab('library');
    } catch (err) {
      console.error(err);
      alert('Failed to upload image. Please ensure you are logged in as admin.');
    }
  };

  // Fetch Library
  const loadLibrary = useCallback(async () => {
    setIsLoadingLibrary(true);
    setLibraryError(null);
    try {
      let skip = 0;
      let total = Number.POSITIVE_INFINITY;
      const allItems: MediaItem[] = [];

      while (skip < total) {
        const data = await request<{
          items?: Array<{ id: string; url: string; title?: string | null }>;
          total?: number;
        }>(`/api/admin/media?take=${LIBRARY_PAGE_SIZE}&skip=${skip}&status=ACTIVE&sort=recent`);

        const batch = (data.items ?? []).map((item) => ({
          id: item.id,
          url: item.url,
          title: item.title?.trim() || 'Untitled image',
        }));

        allItems.push(...batch);
        total = typeof data.total === 'number' ? data.total : allItems.length;

        if (batch.length === 0 || batch.length < LIBRARY_PAGE_SIZE) {
          break;
        }
        skip += batch.length;
      }

      setLibraryMedia(allItems);
    } catch (err) {
      setLibraryError(err instanceof Error ? err.message : 'Could not load library');
    } finally {
      setIsLoadingLibrary(false);
    }
  }, [request]);

  useEffect(() => {
    if (isOpen && tab === 'library') {
      loadLibrary();
    }
  }, [isOpen, tab, loadLibrary]);

  return (
    <>
      <button
        type="button"
        title="Insert Image"
        disabled={disabled}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[1.1rem] transition-colors
          ${isOpen ? 'bg-[#e8f0ff] text-[#2e5edb]' : 'text-[#4b5565] hover:bg-[#eef2f8]'}
          ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
        onMouseDown={(e) => {
          e.preventDefault();
          if (!disabled) setIsOpen(true);
        }}
      >
        <MdImage />
      </button>

      {isOpen &&
        typeof window !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#0f1116]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
            onMouseDown={close}
          >
            <div
              className="w-full max-w-5xl bg-white rounded-[20px] shadow-2xl flex flex-col h-[85vh] max-h-[850px] overflow-hidden border border-[#e2e6ee] transform transition-all"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Header with Tabs */}
              <div className="flex flex-col border-b border-[#e2e6ee] bg-gray-50/50 pt-4 px-6 relative shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[1.3rem] font-semibold tracking-tight text-[#0f1116]">
                    Insert Media
                  </h3>
                  <button
                    type="button"
                    onClick={close}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-800 transition-colors"
                  >
                    <MdClose size={20} />
                  </button>
                </div>
                <div className="flex gap-6 relative bottom-[-1px]">
                  {(['upload', 'library', 'url'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`pb-3 text-[0.95rem] font-medium transition-colors border-b-2 ${
                        tab === t
                          ? 'border-[#0f1116] text-[#0f1116]'
                          : 'border-transparent text-gray-500 hover:text-gray-900'
                      }`}
                      onClick={() => setTab(t)}
                    >
                      {t === 'upload'
                        ? 'Upload Files'
                        : t === 'library'
                          ? 'Media Library'
                          : 'Insert from URL'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Area */}
              <div className="flex flex-1 overflow-hidden bg-white">
                {/* UPLOAD TAB */}
                {tab === 'upload' && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/30">
                    <label
                      className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-[24px] border-2 border-dashed border-[#d8dde6] bg-white w-full max-w-2xl py-24 text-center transition-all hover:border-[#d5ea52] hover:bg-gray-50 group shadow-sm"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        handleUpload(e.dataTransfer.files?.[0] ?? null);
                      }}
                    >
                      <div className="h-24 w-24 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-[#0f1116] transition-colors border border-gray-100">
                        <MdImage size={48} />
                      </div>
                      <div>
                        <h4 className="text-[1.3rem] font-medium text-[#0f1116]">
                          Drop files to upload
                        </h4>
                        <p className="text-[1rem] text-gray-500 mt-2">
                          or{' '}
                          <span className="text-[#1e4fd2] font-medium group-hover:underline">
                            click here
                          </span>{' '}
                          to browse your computer
                        </p>
                      </div>
                      <span className="text-[0.85rem] rounded-full bg-gray-100 px-4 py-1.5 text-gray-500 mt-4">
                        Maximum file size: 10MB
                      </span>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleUpload(e.target.files?.[0] ?? null)}
                      />
                    </label>
                  </div>
                )}

                {/* LIBRARY TAB */}
                {tab === 'library' && (
                  <div className="flex-1 flex overflow-hidden">
                    {/* Grid */}
                    <div className="flex-1 overflow-y-auto p-5 no-scrollbar bg-white">
                      {isLoadingLibrary ? (
                        <div className="flex-1 h-full flex flex-col items-center justify-center gap-4 text-gray-400">
                          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-[#0f1116]" />
                          <p className="text-[0.95rem] font-medium">Loading media library...</p>
                        </div>
                      ) : libraryError ? (
                        <div className="flex-1 h-full flex gap-3 flex-col items-center justify-center text-red-500 bg-red-50 rounded-[16px] border border-red-100 max-w-md mx-auto p-8 my-auto">
                          <p className="text-center font-medium">{libraryError}</p>
                          <button
                            type="button"
                            onClick={loadLibrary}
                            className="rounded-full bg-white border border-red-200 px-4 py-2 text-[0.85rem] text-red-600 hover:bg-red-50 font-medium shadow-sm"
                          >
                            Retry Connection
                          </button>
                        </div>
                      ) : libraryMedia.length === 0 ? (
                        <div className="flex-1 h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                          <div className="h-20 w-20 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300">
                            <MdImage size={40} />
                          </div>
                          <div className="text-center max-w-xs">
                            <h4 className="text-[1.2rem] font-medium text-[#0f1116]">
                              No items found
                            </h4>
                            <p className="text-[0.95rem] mt-2 text-gray-400">
                              Your media library is currently empty. Switch to the Upload tab to add
                              some images.
                            </p>
                          </div>
                          <button
                            onClick={() => setTab('upload')}
                            className="mt-4 rounded-[12px] bg-[#d5ea52] px-6 py-2.5 text-[0.95rem] font-medium text-[#0f1116] shadow-sm hover:opacity-90 transition-opacity"
                          >
                            Upload Files
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3 content-start">
                          {libraryMedia.map((img) => {
                            const isSelected = selectedImage?.id === img.id;
                            return (
                              <div
                                key={img.id}
                                className={`group relative aspect-square overflow-hidden rounded-[12px] border-2 cursor-pointer transition-all ${
                                  isSelected
                                    ? 'border-[#0f1116] ring-2 ring-[#0f1116]/20 ring-offset-1 shadow-md'
                                    : 'border-[#e2e6ee] bg-gray-50 hover:border-gray-400 hover:shadow-sm'
                                }`}
                                onClick={() => {
                                  setSelectedImage(img);
                                  setLibraryAltText(''); // Reset alt text for new selection
                                }}
                              >
                                <img
                                  src={img.url}
                                  alt={img.title}
                                  className="h-full w-full object-cover"
                                />
                                {isSelected && (
                                  <div className="absolute top-2 right-2 bg-[#0f1116] text-white p-1 rounded-full shadow-sm shadow-black/20">
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      stroke="currentColor"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Attachment Details Sidebar */}
                    {selectedImage && (
                      <div className="w-[340px] border-l border-[#e2e6ee] bg-gray-50/50 flex flex-col shrink-0 animate-in slide-in-from-right-8 duration-300">
                        <div className="p-5 border-b border-[#e2e6ee]">
                          <h4 className="font-semibold text-[#0f1116] text-[1.05rem]">
                            Attachment Details
                          </h4>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-5 no-scrollbar">
                          <div className="aspect-video w-full overflow-hidden rounded-[12px] border border-[#e2e6ee] bg-white shadow-sm">
                            <img
                              src={selectedImage.url}
                              alt={selectedImage.title}
                              className="h-full w-full object-contain"
                            />
                          </div>
                          <div>
                            <p
                              className="text-[0.85rem] font-medium text-[#0f1116] break-all truncate"
                              title={selectedImage.title}
                            >
                              {selectedImage.title}
                            </p>
                            <div className="flex gap-4 mt-2">
                              <button
                                className="text-[0.8rem] text-[#1e4fd2] hover:underline flex items-center gap-1 font-medium"
                                onClick={async () => {
                                  await navigator.clipboard
                                    .writeText(selectedImage.url)
                                    .catch(() => undefined);
                                }}
                              >
                                Copy URL
                              </button>
                              <a
                                href={selectedImage.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[0.8rem] text-gray-500 hover:text-[#0f1116] hover:underline flex items-center gap-1 font-medium"
                              >
                                View original file
                              </a>
                            </div>
                          </div>

                          <div className="h-px border-t border-[#e2e6ee] w-full" />

                          <div>
                            <label className="block text-[0.85rem] font-medium text-[#0f1116] mb-1.5">
                              Alt Text
                            </label>
                            <input
                              type="text"
                              value={libraryAltText}
                              onChange={(e) => setLibraryAltText(e.target.value)}
                              placeholder="Describe the image..."
                              className="w-full rounded-[10px] border border-[#e2e6ee] bg-white px-3 py-2 text-[0.9rem] focus:border-[#0f1116] focus:outline-none focus:ring-1 focus:ring-[#0f1116] shadow-sm"
                            />
                            <p className="text-[0.75rem] text-gray-500 mt-2">
                              Leave empty if decorative.
                            </p>
                          </div>
                        </div>

                        <div className="p-5 border-t border-[#e2e6ee] bg-white">
                          <button
                            type="button"
                            onClick={() =>
                              insert(selectedImage.url, libraryAltText || selectedImage.title)
                            }
                            className="w-full rounded-[12px] bg-[#d5ea52] px-6 py-3 text-[0.95rem] font-semibold text-[#0f1116] hover:opacity-90 shadow-sm transition-opacity"
                          >
                            Insert into post
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* URL TAB */}
                {tab === 'url' && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/30">
                    <div className="w-full max-w-lg bg-white p-8 rounded-[20px] shadow-sm border border-[#e2e6ee]">
                      <div className="mb-6">
                        <h4 className="text-[1.3rem] font-semibold text-[#0f1116]">
                          Insert from URL
                        </h4>
                        <p className="text-[0.95rem] text-gray-500 mt-1">
                          Paste a direct link to an image on the web.
                        </p>
                      </div>
                      <div className="flex flex-col gap-5">
                        <div>
                          <label className="block text-[0.85rem] font-medium text-gray-700 mb-1.5">
                            Image URL
                          </label>
                          <input
                            type="text"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="w-full rounded-[12px] border border-[#e2e6ee] bg-gray-50/50 px-4 py-3 text-[0.95rem] focus:border-[#0f1116] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0f1116] transition-colors"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') insert(url);
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[0.85rem] font-medium text-gray-700 mb-1.5">
                            Alt Text (Optional)
                          </label>
                          <input
                            type="text"
                            value={alt}
                            onChange={(e) => setAlt(e.target.value)}
                            placeholder="Describe the image..."
                            className="w-full rounded-[12px] border border-[#e2e6ee] bg-gray-50/50 px-4 py-3 text-[0.95rem] focus:border-[#0f1116] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0f1116] transition-colors"
                          />
                        </div>
                        <div className="pt-3">
                          <button
                            type="button"
                            onClick={() => insert(url)}
                            disabled={!url.trim()}
                            className="w-full rounded-[12px] bg-[#0f1116] px-6 py-3 text-[0.95rem] font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:bg-gray-300 transition-colors"
                          >
                            Insert Image
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/* ─── Link modal ─── */
function LinkModal({ editor, disabled }: { editor: Editor | null; disabled: boolean }) {
  const [anchor, setAnchor] = useState<Rect | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [nofollow, setNofollow] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const isLinkActive = editor?.isActive('link') ?? false;

  useEffect(() => {
    if (anchor) setTimeout(() => urlRef.current?.focus(), 10);
  }, [anchor]);

  const open = () => {
    if (anchor) {
      setAnchor(null);
      return;
    }
    if (editor?.isActive('link')) {
      const attrs = editor.getAttributes('link') as { href?: string; rel?: string | null };
      setLinkUrl(attrs.href ?? '');
      setNofollow((attrs.rel ?? '').includes('nofollow'));
    } else {
      setLinkUrl('');
      setNofollow(false);
    }
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setAnchor({ top: r.top, left: r.left, bottom: r.bottom });
  };

  const close = () => {
    setAnchor(null);
    setLinkUrl('');
    setNofollow(false);
  };

  const apply = () => {
    if (!editor) return;
    const url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url, rel: nofollow ? 'nofollow' : null, target: null })
        .run();
    }
    close();
  };

  return (
    <>
      <button
        ref={btnRef}
        data-popover-trigger
        type="button"
        title="Insert / Edit Link"
        disabled={disabled}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[1.1rem] transition-colors
          ${isLinkActive || anchor ? 'bg-[#e8f0ff] text-[#2e5edb]' : 'text-[#4b5565] hover:bg-[#eef2f8]'}
          ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
        onMouseDown={(e) => {
          e.preventDefault();
          if (!disabled) open();
        }}
      >
        <MdInsertLink />
      </button>

      {anchor && (
        <FixedPopover anchor={anchor} onClose={close}>
          <div className="w-[300px] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[0.95rem] font-semibold text-gray-800">
                {isLinkActive ? 'Edit Link' : 'Add Link'}
              </h3>
              <button type="button" onClick={close} className="text-gray-400 hover:text-gray-700">
                <MdClose size={18} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <input
                ref={urlRef}
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') apply();
                  if (e.key === 'Escape') close();
                }}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[0.9rem] focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={nofollow}
                  onChange={(e) => setNofollow(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 accent-blue-600"
                />
                <span className="text-[0.85rem] text-gray-600">
                  Nofollow <span className="text-gray-400">(SEO)</span>
                </span>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    apply();
                  }}
                  className="flex-1 rounded-[10px] bg-blue-600 py-2.5 text-[0.85rem] font-medium text-white hover:bg-blue-700"
                >
                  {isLinkActive ? 'Save' : 'Apply'}
                </button>
                {isLinkActive && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      editor?.chain().focus().extendMarkRange('link').unsetLink().run();
                      close();
                    }}
                    className="rounded-[10px] bg-red-50 px-4 text-[0.85rem] font-medium text-red-600 hover:bg-red-100"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </FixedPopover>
      )}
    </>
  );
}

/* ─── Toolbar ─── */
const Toolbar: FC<{ editor: Editor | null }> = ({ editor }) => {
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrike, setIsStrike] = useState(false);
  const [isSub, setIsSub] = useState(false);
  const [isSuper, setIsSuper] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isCodeBlock, setIsCodeBlock] = useState(false);
  const [isBlockquote, setIsBlockquote] = useState(false);
  const [isBullet, setIsBullet] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);
  const [blockType, setBlockType] = useState<TextBlockType>('paragraph');
  const [align, setAlign] = useState<AlignType>('left');
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const sync = useCallback((e: Editor | null) => {
    if (!e) {
      setIsBold(false);
      setIsItalic(false);
      setIsUnderline(false);
      setIsStrike(false);
      setIsSub(false);
      setIsSuper(false);
      setIsCode(false);
      setIsCodeBlock(false);
      setIsBlockquote(false);
      setIsBullet(false);
      setIsOrdered(false);
      setBlockType('paragraph');
      setAlign('left');
      setCanUndo(false);
      setCanRedo(false);
      return;
    }
    setIsBold(e.isActive('bold'));
    setIsItalic(e.isActive('italic'));
    setIsUnderline(e.isActive('underline'));
    setIsStrike(e.isActive('strike'));
    setIsSub(e.isActive('subscript'));
    setIsSuper(e.isActive('superscript'));
    setIsCode(e.isActive('code'));
    setIsCodeBlock(e.isActive('codeBlock'));
    setIsBlockquote(e.isActive('blockquote'));
    setIsBullet(e.isActive('bulletList'));
    setIsOrdered(e.isActive('orderedList'));
    const a = (['left', 'center', 'right', 'justify'] as AlignType[]).find((x) =>
      e.isActive({ textAlign: x }),
    );
    setAlign(a ?? 'left');
    if (e.isActive('heading', { level: 1 })) setBlockType('h1');
    else if (e.isActive('heading', { level: 2 })) setBlockType('h2');
    else if (e.isActive('heading', { level: 3 })) setBlockType('h3');
    else if (e.isActive('heading', { level: 4 })) setBlockType('h4');
    else if (e.isActive('heading', { level: 5 })) setBlockType('h5');
    else setBlockType('paragraph');
    try {
      setCanUndo(e.can().undo());
    } catch {
      setCanUndo(false);
    }
    try {
      setCanRedo(e.can().redo());
    } catch {
      setCanRedo(false);
    }
  }, []);

  useEffect(() => {
    if (!editor) {
      sync(null);
      return;
    }
    const h = () => sync(editor);
    h();
    editor.on('selectionUpdate', h);
    editor.on('transaction', h);
    return () => {
      editor.off('selectionUpdate', h);
      editor.off('transaction', h);
    };
  }, [editor, sync]);

  const setHeading = (val: TextBlockType) => {
    if (!editor) return;
    if (val === 'paragraph') {
      editor.chain().focus().setParagraph().run();
      return;
    }
    editor
      .chain()
      .focus()
      .setHeading({ level: Number(val[1]) as 1 | 2 | 3 | 4 | 5 })
      .run();
  };

  const d = !editor;

  return (
    <div className="flex flex-col">
      {/* Row 1 */}
      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-[#e0e5ef] bg-[#f7f9fc] px-3 py-2">
        <TBtn
          title="Undo"
          disabled={d || !canUndo}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          <MdUndo />
        </TBtn>
        <TBtn
          title="Redo"
          disabled={d || !canRedo}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          <MdRedo />
        </TBtn>
        <Divider />
        <select
          value={blockType}
          disabled={d}
          aria-label="Text type"
          onChange={(e) => setHeading(e.target.value as TextBlockType)}
          className="h-8 rounded-[8px] border border-[#d6ddeb] bg-white px-2.5 text-[0.83rem] font-semibold text-[#374151] outline-none focus:border-[#7da2f5] disabled:opacity-50"
        >
          <option value="paragraph">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="h5">Heading 5</option>
        </select>
        <Divider />
        <TBtn
          title="Align Left"
          active={align === 'left'}
          disabled={d}
          onClick={() => editor?.chain().focus().setTextAlign('left').run()}
        >
          <MdFormatAlignLeft />
        </TBtn>
        <TBtn
          title="Align Centre"
          active={align === 'center'}
          disabled={d}
          onClick={() => editor?.chain().focus().setTextAlign('center').run()}
        >
          <MdFormatAlignCenter />
        </TBtn>
        <TBtn
          title="Align Right"
          active={align === 'right'}
          disabled={d}
          onClick={() => editor?.chain().focus().setTextAlign('right').run()}
        >
          <MdFormatAlignRight />
        </TBtn>
        <TBtn
          title="Justify"
          active={align === 'justify'}
          disabled={d}
          onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
        >
          <MdFormatAlignJustify />
        </TBtn>
      </div>

      {/* Row 2 */}
      <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-b border-[#e0e5ef] bg-[#f7f9fc] px-3 py-2">
        <TBtn
          title="Bold"
          active={isBold}
          disabled={d}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <MdFormatBold />
        </TBtn>
        <TBtn
          title="Italic"
          active={isItalic}
          disabled={d}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <MdFormatItalic />
        </TBtn>
        <TBtn
          title="Underline"
          active={isUnderline}
          disabled={d}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <MdFormatUnderlined />
        </TBtn>
        <TBtn
          title="Strikethrough"
          active={isStrike}
          disabled={d}
          onClick={() => editor?.chain().focus().toggleStrike().run()}
        >
          <MdFormatStrikethrough />
        </TBtn>
        <TBtn
          title="Subscript"
          active={isSub}
          disabled={d}
          onClick={() => editor?.chain().focus().toggleSubscript().run()}
        >
          <MdSubscript />
        </TBtn>
        <TBtn
          title="Superscript"
          active={isSuper}
          disabled={d}
          onClick={() => editor?.chain().focus().toggleSuperscript().run()}
        >
          <MdSuperscript />
        </TBtn>
        <Divider />
        <HighlightPicker editor={editor} disabled={d} />
        <Divider />
        <TBtn
          title="Bullet List"
          active={isBullet}
          disabled={d}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <MdFormatListBulleted />
        </TBtn>
        <TBtn
          title="Numbered List"
          active={isOrdered}
          disabled={d}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <MdFormatListNumbered />
        </TBtn>
        <Divider />
        <TBtn
          title="Blockquote"
          active={isBlockquote}
          disabled={d}
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
        >
          <MdFormatQuote />
        </TBtn>
        <TBtn
          title="Inline Code"
          active={isCode}
          disabled={d}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          <MdCode />
        </TBtn>
        <TBtn
          title="Code Block"
          active={isCodeBlock}
          disabled={d}
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
        >
          <span className="font-mono text-[0.72rem] font-bold">{'{}'}</span>
        </TBtn>
        <TBtn
          title="Horizontal Rule"
          disabled={d}
          onClick={() => editor?.chain().focus().setHorizontalRule().run()}
        >
          <MdHorizontalRule />
        </TBtn>
        <Divider />
        <ImagePicker editor={editor} disabled={d} />
        <LinkModal editor={editor} disabled={d} />
        <Divider />
        <TBtn
          title="Insert Prompt Box"
          active={editor?.isActive('promptBox')}
          disabled={d}
          onClick={() =>
            editor
              ?.chain()
              .focus()
              .insertContent({ type: 'promptBox', content: [{ type: 'paragraph' }] })
              .run()
          }
        >
          <MdSmartToy />
        </TBtn>
        <TBtn
          title="Clear Formatting"
          disabled={d}
          onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <MdFormatClear />
        </TBtn>
      </div>
    </div>
  );
};

/* ─── Word count ─── */
function WordCountBar({ editor }: { editor: Editor | null }) {
  const [words, setWords] = useState(0);
  const [chars, setChars] = useState(0);
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const t = editor.getText();
      setChars(t.length);
      setWords(t.trim() === '' ? 0 : t.trim().split(/\s+/).length);
    };
    update();
    editor.on('update', update);
    return () => {
      editor.off('update', update);
    };
  }, [editor]);
  return (
    <div className="flex items-center gap-4 border-t border-[#e0e5ef] bg-[#f7f9fc] px-4 py-1.5 text-[0.75rem] text-[#9aa1ae] rounded-b-[19px]">
      <span>
        <span className="font-semibold text-[#4b5565]">{words}</span> words
      </span>
      <span>
        <span className="font-semibold text-[#4b5565]">{chars}</span> characters
      </span>
    </div>
  );
}

/* ─── RichTextEditor ─── */
const RichTextEditor: FC<Props> = ({ value, onChange }) => {
  const onChangeRef = useRef(onChange);
  const isApplyingRef = useRef(false);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'tiptap-editor outline-none flex-1 px-6 py-4 text-[0.95rem] text-[#2f3440] min-h-[260px] leading-7 ' +
          '[&_p]:mb-2 ' +
          /* Tailwind preflight strips browser defaults — restore them explicitly */
          '[&_em]:italic [&_i]:italic ' +
          '[&_strong]:font-bold [&_b]:font-bold ' +
          '[&_u]:underline ' +
          '[&_s]:line-through [&_del]:line-through [&_strike]:line-through ' +
          '[&_sub]:align-sub [&_sub]:text-[0.75em] ' +
          '[&_sup]:align-super [&_sup]:text-[0.75em] ' +
          '[&_h1]:mt-2 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-semibold ' +
          '[&_h2]:mt-2 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold ' +
          '[&_h3]:mt-2 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold ' +
          '[&_h4]:mt-2 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-semibold ' +
          '[&_h5]:mt-2 [&_h5]:mb-2 [&_h5]:text-[0.95rem] [&_h5]:font-semibold ' +
          '[&_blockquote]:my-3 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 ' +
          '[&_ul]:mb-2 [&_ul]:ml-6 [&_ul]:list-disc [&_ol]:mb-2 [&_ol]:ml-6 [&_ol]:list-decimal [&_li]:mb-1 ' +
          '[&_a]:text-blue-600 [&_a]:underline [&_a]:cursor-pointer ' +
          '[&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.88em] [&_code]:text-rose-600 ' +
          '[&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-gray-900 [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:text-gray-100 ' +
          '[&_hr]:my-4 [&_hr]:border-t [&_hr]:border-gray-200 ' +
          '[&_mark]:rounded [&_mark]:px-0.5 ' +
          '[&_img]:my-3 [&_img]:max-w-full [&_img]:rounded-xl',
      },
    },
    onUpdate: ({ editor: e }) => {
      if (isApplyingRef.current) return;
      onChangeRef.current(e.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const incoming = value || '';
    if (incoming === editor.getHTML()) return;
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;
      if (incoming === editor.getHTML()) return;
      isApplyingRef.current = true;
      try {
        editor.commands.setContent(incoming, { emitUpdate: false });
      } finally {
        isApplyingRef.current = false;
      }
    });

    return () => {
      cancelled = true;
    };
  }, [editor, value]);

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Sticky Toolbar Box with all corners rounded */}
      <div className="sticky top-[-16px] lg:top-[-32px] z-10 overflow-hidden rounded-[20px] border border-[#e2e6ee] bg-white shadow-sm transition-shadow hover:shadow-md">
        <Toolbar editor={editor} />
      </div>

      {/* Editor Content Box */}
      <div className="relative flex min-h-[260px] flex-col overflow-hidden rounded-[20px] border border-[#e2e6ee] bg-white shadow-sm focus-within:border-[#1e4fd2] focus-within:ring-1 focus-within:ring-[#1e4fd2]">
        <EditorContent editor={editor} className="flex-1" />
      </div>
      <WordCountBar editor={editor} />
    </div>
  );
};

export default RichTextEditor;
