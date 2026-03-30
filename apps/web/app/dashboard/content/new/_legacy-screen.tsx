'use client';

import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import dynamic from 'next/dynamic';
import { FaCloudArrowUp } from 'react-icons/fa6';
import { MdClose, MdSchedule, MdCheckCircle, MdError } from 'react-icons/md';
import { useRouter, useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useAdminApi } from '../../../components/dashboard/use-admin-api';
import { ActionError } from '../../../components/dashboard/action-error';
import { LoadingButton } from '../../../components/ui/loading-button';

const RichTextEditor = dynamic(() => import('../../../components/rich-text-editor'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[260px] rounded-[16px] border border-[#e1e5ee] bg-[#fafbfd] p-4 text-[0.9rem] text-[#7a8292]">
      Loading editor...
    </div>
  ),
});

const MAX_TAGS = 15;
const MAX_GALLERY_IMAGES = 5;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const optionStatusItems = ['Published', 'Draft', 'Scheduled'] as const;
const optionPostTypes = ['Post', 'Prompt'] as const;
const optionPostFormats = ['Standard', 'Checklist', 'Gallery'] as const;

type Status = (typeof optionStatusItems)[number];
type PublishResult = 'success' | 'error' | null;

type ApiPromptStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
type ApiVisibility = 'FREE' | 'EXCLUSIVE';

type CategoryOption = { id: string; name: string; slug: string };
type TagOption = { id: string; name: string; slug: string; color?: string | null };
type GallerySlotState = { previewUrl: string | null; persistedValue: string | null };
type MediaAssetOption = { id: string; url: string; title?: string | null };

type PromptPayload = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  content: string;
  status?: ApiPromptStatus | null;
  visibility?: ApiVisibility | null;
  scheduledAt?: string | null;
  featuredImageUrl?: string | null;
  featuredImageRef?: string | null;
  galleryImageUrls?: string[] | null;
  galleryImageRefs?: string[] | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoFocusKeyword?: string | null;
  seoCanonicalUrl?: string | null;
  seoNoIndex?: boolean | null;
  tags?: Array<{ id: string; name: string; slug: string }>;
  categories?: Array<{ id: string; name: string; slug: string }>;
  primaryCategory?: { id: string; name: string; slug: string } | null;
  promptType?: string | null;
};

type PostPayload = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  status?: ApiPromptStatus | null;
  visibility?: ApiVisibility | null;
  scheduledAt?: string | null;
  featuredImageUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoFocusKeyword?: string | null;
  seoCanonicalUrl?: string | null;
  seoNoIndex?: boolean | null;
  postType?: string | null;
  postFormat?: string | null;
  tags?: Array<{ id: string; name: string; slug: string }>;
  categories?: Array<{ id: string; name: string; slug: string }>;
  primaryCategory?: { id: string; name: string; slug: string } | null;
};

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function dedupeCaseInsensitive(values: string[]) {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }
  return unique;
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function createEmptyGallerySlots(): GallerySlotState[] {
  return Array.from({ length: MAX_GALLERY_IMAGES }, () => ({
    previewUrl: null,
    persistedValue: null,
  }));
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function CreateContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams?.get('type')?.toLowerCase();
  const editParam = searchParams?.get('edit') ?? null;
  const { request, status: authStatus } = useAdminApi();

  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [featuredImageValue, setFeaturedImageValue] = useState<string | null>(null);
  const [galleryImageSlots, setGalleryImageSlots] = useState<GallerySlotState[]>(() =>
    createEmptyGallerySlots(),
  );
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [mediaModalTarget, setMediaModalTarget] = useState<'featured' | number>('featured');
  const [mediaModalTab, setMediaModalTab] = useState<'upload' | 'library' | 'url'>('upload');
  const [mediaLibraryItems, setMediaLibraryItems] = useState<MediaAssetOption[]>([]);
  const [mediaLibrarySearch, setMediaLibrarySearch] = useState('');
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [isMediaLibraryLoading, setIsMediaLibraryLoading] = useState(false);
  const [isMediaUploading, setIsMediaUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');

  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoFocusKeyword, setSeoFocusKeyword] = useState('');
  const [seoCanonicalUrl, setSeoCanonicalUrl] = useState('');
  const [seoNoIndex, setSeoNoIndex] = useState(false);
  const [status, setStatus] = useState<Status>('Draft');
  const [visibility, setVisibility] = useState<ApiVisibility>('FREE');
  const [scheduledAt, setScheduledAt] = useState('');
  const [isSeoPanelOpen, setIsSeoPanelOpen] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [primaryCategory, setPrimaryCategory] = useState<string | null>(null);
  const [categoryInput, setCategoryInput] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [tagOptions, setTagOptions] = useState<TagOption[]>([]);

  const [postType, setPostType] = useState<(typeof optionPostTypes)[number]>(
    typeParam === 'prompt' ? 'Prompt' : 'Post',
  );
  const [postFormat, setPostFormat] = useState<(typeof optionPostFormats)[number]>('Standard');
  const [hasSetTypeFromUrl, setHasSetTypeFromUrl] = useState(false);
  const [editId, setEditId] = useState<string | null>(editParam);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Preview
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Save feedback
  const [publishResult, setPublishResult] = useState<PublishResult>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savingTarget, setSavingTarget] = useState<Status | null>(null);

  useEffect(() => {
    setEditId(editParam);
  }, [editParam]);

  useEffect(() => {
    if (hasSetTypeFromUrl) return;
    if (typeParam === 'prompt') {
      setPostType('Prompt');
      setHasSetTypeFromUrl(true);
      return;
    }
    if (typeParam === 'post') {
      setPostType('Post');
      setHasSetTypeFromUrl(true);
    }
  }, [hasSetTypeFromUrl, typeParam]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(generateSlug(title));
    }
  }, [title, slugManuallyEdited]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    let isActive = true;
    setLoadError(null);

    Promise.all([
      request<{ items: CategoryOption[] }>('/api/admin/categories?take=200', {
        actionName: 'dashboard.categories.list',
      }),
      request<{ items: TagOption[] }>('/api/admin/tags?take=200', {
        actionName: 'dashboard.tags.list',
      }),
    ])
      .then(([categoriesPayload, tagsPayload]) => {
        if (!isActive) return;
        const categoryItems = categoriesPayload.items ?? [];
        setCategoryOptions(categoryItems);
        setAvailableCategories(categoryItems.map((item) => item.name));
        setTagOptions(tagsPayload.items ?? []);
      })
      .catch((err: Error) => {
        if (!isActive) return;
        setLoadError(err.message || 'Unable to load categories and tags.');
      });

    return () => {
      isActive = false;
    };
  }, [authStatus, request]);

  useEffect(() => {
    if (!editId || authStatus !== 'authenticated') return;
    let isActive = true;
    setLoadError(null);

    const hydrateFromPrompt = (payload: PromptPayload) => {
      setPostType('Prompt');
      setTitle(payload.title || '');
      setSlug(payload.slug || '');
      setSlugManuallyEdited(true);
      setExcerpt(payload.description ?? '');
      setBody(payload.content ?? '');
      setMetaTitle(payload.metaTitle ?? '');
      setMetaDescription(payload.metaDescription ?? '');
      setSeoTitle(payload.seoTitle ?? '');
      setSeoDescription(payload.seoDescription ?? '');
      setSeoFocusKeyword(payload.seoFocusKeyword ?? '');
      setSeoCanonicalUrl(payload.seoCanonicalUrl ?? '');
      setSeoNoIndex(Boolean(payload.seoNoIndex));
      setIsSeoPanelOpen(
        Boolean(
          payload.seoTitle?.trim() ||
            payload.metaTitle?.trim() ||
            payload.seoDescription?.trim() ||
            payload.metaDescription?.trim() ||
            payload.seoFocusKeyword?.trim() ||
            payload.seoCanonicalUrl?.trim() ||
            payload.seoNoIndex,
        ),
      );
      setFeaturedImage(payload.featuredImageUrl ?? null);
      setFeaturedImageValue(payload.featuredImageRef ?? payload.featuredImageUrl ?? null);
      const nextGallerySlots = createEmptyGallerySlots();
      const galleryPreviewUrls = payload.galleryImageUrls ?? [];
      const galleryPersistedValues = payload.galleryImageRefs ?? galleryPreviewUrls;
      for (let index = 0; index < MAX_GALLERY_IMAGES; index += 1) {
        const previewUrl = galleryPreviewUrls[index] ?? null;
        const persistedValue = galleryPersistedValues[index] ?? previewUrl;
        nextGallerySlots[index] = {
          previewUrl,
          persistedValue,
        };
      }
      setGalleryImageSlots(nextGallerySlots);
      const categoryNames = Array.from(
        new Set(
          [payload.primaryCategory?.name, ...(payload.categories?.map((c) => c.name) ?? [])].filter(
            Boolean,
          ) as string[],
        ),
      );
      setCategories(categoryNames);
      setPrimaryCategory(payload.primaryCategory?.name ?? categoryNames[0] ?? null);
      if (categoryNames.length > 0) {
        setAvailableCategories((prev) => Array.from(new Set([...prev, ...categoryNames])));
      }
      setTags(payload.tags?.map((t) => t.name) ?? []);
      const apiStatus = payload.status ?? 'DRAFT';
      const apiVisibility = payload.visibility ?? 'FREE';
      setVisibility(apiVisibility);
      if (apiStatus === 'PUBLISHED') {
        setStatus('Published');
      } else if (apiStatus === 'SCHEDULED') {
        setStatus('Scheduled');
      } else {
        setStatus('Draft');
      }
      setScheduledAt(toDateTimeLocal(payload.scheduledAt ?? null));
    };

    const hydrateFromPost = (payload: PostPayload) => {
      setPostType(payload.postType === 'PROMPT' ? 'Prompt' : 'Post');
      if (payload.postFormat) {
        const normalized = payload.postFormat.toLowerCase();
        if (normalized === 'checklist') setPostFormat('Checklist');
        else if (normalized === 'gallery') setPostFormat('Gallery');
        else setPostFormat('Standard');
      }
      setTitle(payload.title || '');
      setSlug(payload.slug || '');
      setSlugManuallyEdited(true);
      setExcerpt(payload.excerpt ?? '');
      setBody(payload.content ?? '');
      setMetaTitle(payload.metaTitle ?? '');
      setMetaDescription(payload.metaDescription ?? '');
      setSeoTitle(payload.seoTitle ?? '');
      setSeoDescription(payload.seoDescription ?? '');
      setSeoFocusKeyword(payload.seoFocusKeyword ?? '');
      setSeoCanonicalUrl(payload.seoCanonicalUrl ?? '');
      setSeoNoIndex(Boolean(payload.seoNoIndex));
      setIsSeoPanelOpen(
        Boolean(
          payload.seoTitle?.trim() ||
            payload.metaTitle?.trim() ||
            payload.seoDescription?.trim() ||
            payload.metaDescription?.trim() ||
            payload.seoFocusKeyword?.trim() ||
            payload.seoCanonicalUrl?.trim() ||
            payload.seoNoIndex,
        ),
      );
      setFeaturedImage(payload.featuredImageUrl ?? null);
      setFeaturedImageValue(payload.featuredImageUrl ?? null);
      setGalleryImageSlots(createEmptyGallerySlots());
      const categoryNames = Array.from(
        new Set(
          [payload.primaryCategory?.name, ...(payload.categories?.map((c) => c.name) ?? [])].filter(
            Boolean,
          ) as string[],
        ),
      );
      setCategories(categoryNames);
      setPrimaryCategory(payload.primaryCategory?.name ?? categoryNames[0] ?? null);
      if (categoryNames.length > 0) {
        setAvailableCategories((prev) => Array.from(new Set([...prev, ...categoryNames])));
      }
      setTags(payload.tags?.map((t) => t.name) ?? []);
      const apiStatus = payload.status ?? 'DRAFT';
      const apiVisibility = payload.visibility ?? 'FREE';
      setVisibility(apiVisibility);
      if (apiStatus === 'PUBLISHED') {
        setStatus('Published');
      } else if (apiStatus === 'SCHEDULED') {
        setStatus('Scheduled');
      } else {
        setStatus('Draft');
      }
      setScheduledAt(toDateTimeLocal(payload.scheduledAt ?? null));
    };

    const load = async () => {
      if (typeParam === 'prompt') {
        const payload = await request<PromptPayload>(`/api/admin/prompts/${editId}`, {
          actionName: 'dashboard.prompts.read',
        });
        if (!isActive) return;
        hydrateFromPrompt(payload);
        return;
      }
      if (typeParam === 'post') {
        const payload = await request<PostPayload>(`/api/admin/posts/${editId}`, {
          actionName: 'dashboard.posts.read',
        });
        if (!isActive) return;
        hydrateFromPost(payload);
        return;
      }

      try {
        const payload = await request<PromptPayload>(`/api/admin/prompts/${editId}`, {
          actionName: 'dashboard.prompts.read',
        });
        if (!isActive) return;
        hydrateFromPrompt(payload);
      } catch {
        const payload = await request<PostPayload>(`/api/admin/posts/${editId}`, {
          actionName: 'dashboard.posts.read',
        });
        if (!isActive) return;
        hydrateFromPost(payload);
      }
    };

    load()
      .catch((err: Error) => {
        if (!isActive) return;
        setLoadError(err.message || 'Unable to load content.');
      })
      .finally(() => {
        if (!isActive) return;
      });

    return () => {
      isActive = false;
    };
  }, [authStatus, editId, request, typeParam]);

  const remainingTags = MAX_TAGS - tags.length;
  const tagCountLabel = useMemo(() => `${tags.length} of ${MAX_TAGS} tags`, [tags.length]);
  const seoPreviewTitle = useMemo(() => {
    const value = seoTitle.trim() || title.trim();
    return value || 'Untitled page';
  }, [seoTitle, title]);
  const seoPreviewDescription = useMemo(() => {
    const fallback = excerpt.trim() || stripHtml(body).slice(0, 160);
    return seoDescription.trim() || fallback || 'Add a meta description to improve search previews.';
  }, [body, excerpt, seoDescription]);
  const seoChecks = useMemo(() => {
    const focus = seoFocusKeyword.trim().toLowerCase();
    const titleValue = seoPreviewTitle.toLowerCase();
    const descriptionValue = seoPreviewDescription.toLowerCase();
    const bodyValue = stripHtml(body).toLowerCase();

    return [
      {
        label: 'SEO title length',
        ok: seoPreviewTitle.length >= 30 && seoPreviewTitle.length <= 60,
        hint: `${seoPreviewTitle.length} characters. Aim for 30-60.`,
      },
      {
        label: 'Meta description length',
        ok: seoPreviewDescription.length >= 120 && seoPreviewDescription.length <= 160,
        hint: `${seoPreviewDescription.length} characters. Aim for 120-160.`,
      },
      {
        label: 'Featured image selected',
        ok: Boolean(featuredImage || featuredImageValue),
        hint: featuredImage || featuredImageValue ? 'Image ready for sharing cards.' : 'Add a featured image for better sharing previews.',
      },
      {
        label: 'Focus keyword in title',
        ok: !focus || titleValue.includes(focus),
        hint: focus ? 'Include the focus keyword naturally in the title.' : 'Optional but helpful for editorial targeting.',
      },
      {
        label: 'Focus keyword in description/body',
        ok: !focus || descriptionValue.includes(focus) || bodyValue.includes(focus),
        hint: focus ? 'Mention the focus keyword in the description or body.' : 'Optional but helpful for consistency.',
      },
    ];
  }, [
    body,
    featuredImage,
    featuredImageValue,
    seoFocusKeyword,
    seoPreviewDescription,
    seoPreviewTitle,
  ]);

  const addTags = (raw: string) => {
    if (!raw.trim()) return;
    const nextTags = dedupeCaseInsensitive(raw.split(','));
    setTags((current) => {
      const next = [...current];
      const seen = new Set(current.map((tag) => tag.trim().toLowerCase()));
      for (const tag of nextTags) {
        if (next.length >= MAX_TAGS) break;
        const key = tag.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        next.push(tag);
      }
      return next;
    });
  };

  const removeTag = (tagToRemove: string) => {
    setTags((current) => current.filter((t) => t !== tagToRemove));
  };

  const handleTagInputChange = (value: string) => {
    if (value.includes(',')) {
      const parts = value.split(',');
      const last = parts.pop() ?? '';
      addTags(parts.join(','));
      setTagsInput(last);
      return;
    }
    setTagsInput(value);
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (tagsInput.trim()) {
        addTags(tagsInput);
        setTagsInput('');
      }
    }
    if (event.key === 'Backspace' && !tagsInput && tags.length > 0) {
      setTags((current) => current.slice(0, -1));
    }
  };

  // Category Logic
  const filteredCategories = useMemo(() => {
    return availableCategories.filter(
      (cat) => cat.toLowerCase().includes(categoryInput.toLowerCase()) && !categories.includes(cat),
    );
  }, [availableCategories, categoryInput, categories]);

  const addCategory = (cat: string) => {
    const normalizedCategory = cat.trim();
    if (!normalizedCategory) return;
    if (categories.length >= 15) return;

    const alreadySelected = categories.some(
      (existing) => existing.toLowerCase() === normalizedCategory.toLowerCase(),
    );

    if (!alreadySelected) {
      setCategories((prev) => [...prev, normalizedCategory]);
      if (categories.length === 0) setPrimaryCategory(normalizedCategory);
    }

    setAvailableCategories((prev) => {
      const exists = prev.some(
        (existing) => existing.toLowerCase() === normalizedCategory.toLowerCase(),
      );
      return exists ? prev : [...prev, normalizedCategory];
    });

    setCategoryInput('');
    setIsCategoryDropdownOpen(false);
  };

  const removeCategory = (catToRemove: string) => {
    const next = categories.filter((c) => c !== catToRemove);
    setCategories(next);
    if (catToRemove === primaryCategory)
      setPrimaryCategory(next.length > 0 ? (next[0] ?? null) : null);
  };

  const handleCategoryKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && categoryInput.trim()) {
      e.preventDefault();
      addCategory(categoryInput.trim());
    } else if (e.key === 'Backspace' && !categoryInput && categories.length > 0) {
      const last = categories[categories.length - 1];
      if (last) removeCategory(last);
    } else if (e.key === 'Escape') setIsCategoryDropdownOpen(false);
  };

  const applySelectedMedia = (
    target: 'featured' | number,
    selection: { previewUrl: string; persistedValue: string },
  ) => {
    if (target === 'featured') {
      setFeaturedImage(selection.previewUrl);
      setFeaturedImageValue(selection.persistedValue);
      return;
    }
    setGalleryImageSlots((current) =>
      current.map((slot, index) =>
        index === target
          ? { previewUrl: selection.previewUrl, persistedValue: selection.persistedValue }
          : slot,
      ),
    );
  };

  const openMediaModal = (target: 'featured' | number) => {
    setMediaModalTarget(target);
    setMediaModalTab('upload');
    setMediaUrlInput('');
    setIsMediaModalOpen(true);
  };

  const closeMediaModal = () => {
    setIsMediaModalOpen(false);
    setMediaUrlInput('');
    setMediaLibrarySearch('');
  };

  const selectMediaFromLibrary = (item: MediaAssetOption) => {
    applySelectedMedia(mediaModalTarget, {
      previewUrl: item.url,
      persistedValue: item.id ? `media:${item.id}` : item.url,
    });
    setValidationError(null);
    closeMediaModal();
  };

  const handleInsertMediaUrl = () => {
    const normalized = mediaUrlInput.trim();
    if (!normalized) return;
    applySelectedMedia(mediaModalTarget, {
      previewUrl: normalized,
      persistedValue: normalized,
    });
    setValidationError(null);
    closeMediaModal();
  };

  useEffect(() => {
    if (!isMediaModalOpen || mediaModalTab !== 'library') return;
    let isActive = true;

    const loadMedia = async () => {
      setIsMediaLibraryLoading(true);
      try {
        const query = mediaLibrarySearch.trim()
          ? `&search=${encodeURIComponent(mediaLibrarySearch.trim())}`
          : '';
        const payload = await request<{ items: MediaAssetOption[] }>(
          `/api/admin/media?take=120&status=ACTIVE&sort=recent${query}`,
          {
            actionName: 'dashboard.media.list',
          },
        );
        if (!isActive) return;
        setMediaLibraryItems(payload.items ?? []);
      } catch (error) {
        if (!isActive) return;
        setValidationError(error instanceof Error ? error.message : 'Unable to load media library.');
      } finally {
        if (isActive) {
          setIsMediaLibraryLoading(false);
        }
      }
    };

    void loadMedia();
    return () => {
      isActive = false;
    };
  }, [isMediaModalOpen, mediaModalTab, mediaLibrarySearch, request]);

  useEffect(() => {
    if (!isMediaModalOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsMediaModalOpen(false);
      setMediaUrlInput('');
      setMediaLibrarySearch('');
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isMediaModalOpen]);

  const uploadImageAsset = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      throw new Error('Please upload a valid image file.');
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error('Image must be 5MB or smaller.');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name);

    const uploaded = await request<{ id?: string; url?: string | null }>('/api/admin/media/upload', {
      method: 'POST',
      actionName: 'dashboard.media.create',
      body: formData,
    });

    const uploadedUrl = uploaded.url?.trim();
    if (!uploadedUrl) {
      throw new Error('Upload succeeded but no media URL was returned.');
    }
    const persistedValue =
      typeof uploaded.id === 'string' && uploaded.id.trim().length > 0
        ? `media:${uploaded.id.trim()}`
        : uploadedUrl;

    return {
      previewUrl: uploadedUrl,
      persistedValue,
    };
  };

  const handleMediaModalUpload = async (file: File | null | undefined) => {
    if (!file) return;
    setIsMediaUploading(true);
    try {
      const uploaded = await uploadImageAsset(file);
      applySelectedMedia(mediaModalTarget, uploaded);
      setValidationError(null);
      closeMediaModal();
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : 'Failed to upload image.');
    } finally {
      setIsMediaUploading(false);
    }
  };

  const removeGalleryImage = (slotIndex: number) => {
    setGalleryImageSlots((current) =>
      current.map((slot, index) =>
        index === slotIndex ? { previewUrl: null, persistedValue: null } : slot,
      ),
    );
  };

  const handleBodyChange = (html: string) => setBody(html);

  const validate = (target: Status): string | null => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return 'A title is required before saving.';

    const normalizedSlug = slug.trim() || generateSlug(trimmedTitle);
    if (!normalizedSlug) return 'Please use a title or slug with letters or numbers.';

    if (target === 'Published' && !body.trim()) {
      return 'Post body cannot be empty when publishing.';
    }
    if (target === 'Scheduled' && !scheduledAt) return 'Please set a scheduled date and time.';
    return null;
  };

  const handleSave = async (targetStatus: Status) => {
    if (isSaving) return;
    const err = validate(targetStatus);
    if (err) {
      setValidationError(err);
      return;
    }

    setValidationError(null);
    setIsSaving(true);
    setSavingTarget(targetStatus);
    setPublishResult(null);

    const trimmedTitle = title.trim();
    const normalizedSlug = slug.trim() || generateSlug(trimmedTitle);

    const resolveStatus = () => {
      if (targetStatus === 'Published')
        return { status: 'PUBLISHED' as ApiPromptStatus, visibility };
      if (targetStatus === 'Scheduled')
        return { status: 'SCHEDULED' as ApiPromptStatus, visibility };
      return { status: 'DRAFT' as ApiPromptStatus, visibility };
    };

    const { status: apiStatus, visibility: apiVisibility } = resolveStatus();
    const scheduledAtValue =
      targetStatus === 'Scheduled' && scheduledAt ? new Date(scheduledAt).toISOString() : null;

    const resolveCategoryIds = async (names: string[]) => {
      const trimmed = dedupeCaseInsensitive(names);
      if (trimmed.length === 0) return { ids: [] as string[], primaryId: null as string | null };
      const updatedOptions = [...categoryOptions];
      const created: CategoryOption[] = [];
      for (const name of trimmed) {
        const normalized = name.toLowerCase();
        const slugValue = generateSlug(name);
        const existing = updatedOptions.find(
          (cat) => cat.name.toLowerCase() === normalized || cat.slug === slugValue,
        );
        if (existing) continue;
        const createdCategory = await request<CategoryOption>('/api/admin/categories', {
          method: 'POST',
          actionName: 'dashboard.categories.create',
          body: JSON.stringify({
            name,
            slug: slugValue,
          }),
        });
        created.push(createdCategory);
        updatedOptions.push(createdCategory);
      }
      if (created.length > 0) {
        setCategoryOptions((prev) => [...prev, ...created]);
        setAvailableCategories((prev) =>
          Array.from(new Set([...prev, ...created.map((item) => item.name)])),
        );
      }

      const ids = trimmed
        .map((name) => {
          const normalized = name.toLowerCase();
          const slugValue = generateSlug(name);
          return updatedOptions.find(
            (cat) => cat.name.toLowerCase() === normalized || cat.slug === slugValue,
          )?.id;
        })
        .filter(Boolean) as string[];

      const primaryName = primaryCategory || trimmed[0] || null;
      const primaryId = primaryName
        ? (updatedOptions.find(
            (cat) =>
              cat.name.toLowerCase() === primaryName.toLowerCase() ||
              cat.slug === generateSlug(primaryName),
          )?.id ?? null)
        : null;

      return { ids, primaryId };
    };

    const resolveTagIds = async (names: string[]) => {
      const trimmed = dedupeCaseInsensitive(names);
      if (trimmed.length === 0) return [];
      const updatedOptions = [...tagOptions];
      const created: TagOption[] = [];
      const discovered: TagOption[] = [];
      for (const name of trimmed) {
        const normalized = name.toLowerCase();
        const slugValue = generateSlug(name);
        const existing = updatedOptions.find(
          (tag) => tag.name.toLowerCase() === normalized || tag.slug === slugValue,
        );
        if (existing) continue;
        try {
          const createdTag = await request<TagOption>('/api/admin/tags', {
            method: 'POST',
            actionName: 'dashboard.tags.create',
            body: JSON.stringify({
              name,
              slug: slugValue,
              color: null,
            }),
          });
          created.push(createdTag);
          updatedOptions.push(createdTag);
        } catch (error) {
          const fallback = await request<{ items: TagOption[] }>(
            `/api/admin/tags?take=50&sort=name&search=${encodeURIComponent(name)}`,
            {
              actionName: 'dashboard.tags.list',
            },
          );
          const existingTag = (fallback.items ?? []).find(
            (tag) => tag.name.toLowerCase() === normalized || tag.slug === slugValue,
          );
          if (!existingTag) {
            throw error;
          }
          updatedOptions.push(existingTag);
          discovered.push(existingTag);
        }
      }
      if (created.length > 0) {
        setTagOptions((prev) => [...prev, ...created]);
      }
      if (discovered.length > 0) {
        setTagOptions((prev) => {
          const seen = new Set(prev.map((tag) => tag.id));
          const merged = [...prev];
          for (const item of discovered) {
            if (seen.has(item.id)) continue;
            seen.add(item.id);
            merged.push(item);
          }
          return merged;
        });
      }

      return trimmed
        .map((name) => {
          const normalized = name.toLowerCase();
          const slugValue = generateSlug(name);
          return updatedOptions.find(
            (tag) => tag.name.toLowerCase() === normalized || tag.slug === slugValue,
          )?.id;
        })
        .filter(Boolean) as string[];
    };

    try {
      const { ids: categoryIds, primaryId } = await resolveCategoryIds(categories);
      const tagIds = await resolveTagIds(tags);
      const normalizedGalleryValues = galleryImageSlots
        .map((slot) => slot.persistedValue?.trim() || '')
        .filter((entry) => entry.length > 0)
        .slice(0, MAX_GALLERY_IMAGES);
      const payload = {
        title: trimmedTitle,
        slug: normalizedSlug,
        content: body,
        status: apiStatus,
        visibility: apiVisibility,
        scheduledAt: scheduledAtValue,
        featuredImageUrl: featuredImageValue ?? featuredImage ?? null,
        metaTitle: metaTitle.trim() || null,
        metaDescription: metaDescription.trim() || null,
        seoTitle: seoTitle.trim() || null,
        seoDescription: seoDescription.trim() || null,
        seoFocusKeyword: seoFocusKeyword.trim() || null,
        seoCanonicalUrl: seoCanonicalUrl.trim() || null,
        seoNoIndex,
        primaryCategoryId: primaryId,
        categoryIds,
        tagIds,
      };

      let savedId = editId;
      if (postType === 'Prompt') {
        const promptPayload = {
          ...payload,
          description: excerpt || null,
          promptType: 'CONTENT',
          galleryImageUrls: normalizedGalleryValues,
        };
        if (editId) {
          await request(`/api/admin/prompts/${editId}`, {
            method: 'PATCH',
            actionName: 'dashboard.prompts.update',
            body: JSON.stringify(promptPayload),
          });
        } else {
          const created = await request<PromptPayload>('/api/admin/prompts', {
            method: 'POST',
            actionName: 'dashboard.prompts.create',
            body: JSON.stringify(promptPayload),
          });
          savedId = created.id;
        }
      } else {
        const postPayload = {
          ...payload,
          excerpt: excerpt || null,
          postType: 'POST',
          postFormat:
            postFormat === 'Checklist'
              ? 'CHECKLIST'
              : postFormat === 'Gallery'
                ? 'GALLERY'
                : 'STANDARD',
        };
        if (editId) {
          await request(`/api/admin/posts/${editId}`, {
            method: 'PATCH',
            actionName: 'dashboard.posts.update',
            body: JSON.stringify(postPayload),
          });
        } else {
          const created = await request<PostPayload>('/api/admin/posts', {
            method: 'POST',
            actionName: 'dashboard.posts.create',
            body: JSON.stringify(postPayload),
          });
          savedId = created.id;
        }
      }

      if (savedId && !editId) {
        setEditId(savedId);
        const nextType = postType === 'Prompt' ? 'prompt' : 'post';
        router.replace(`/dashboard/content/new?edit=${savedId}&type=${nextType}`);
      }

      setSlug(normalizedSlug);
      setSlugManuallyEdited(true);
      setStatus(targetStatus);
      setPublishResult('success');
    } catch (saveErr) {
      const message =
        saveErr instanceof Error ? saveErr.message : 'Unable to save content right now.';
      setValidationError(message);
      setPublishResult('error');
    } finally {
      setIsSaving(false);
      setSavingTarget(null);
    }
  };

  const handleAddAnother = () => {
    const nextType = postType === 'Prompt' ? 'prompt' : 'post';
    setEditId(null);
    setFeaturedImage(null);
    setFeaturedImageValue(null);
    setGalleryImageSlots(createEmptyGallerySlots());
    setIsMediaModalOpen(false);
    setMediaModalTarget('featured');
    setMediaModalTab('upload');
    setMediaLibraryItems([]);
    setMediaLibrarySearch('');
    setMediaUrlInput('');
    setIsMediaLibraryLoading(false);
    setIsMediaUploading(false);
    setTitle('');
    setBody('');
    setTags([]);
    setTagsInput('');
    setSlug('');
    setSlugManuallyEdited(false);
    setExcerpt('');
    setSeoTitle('');
    setSeoDescription('');
    setSeoFocusKeyword('');
    setSeoCanonicalUrl('');
    setSeoNoIndex(false);
    setStatus('Draft');
    setVisibility('FREE');
    setScheduledAt('');
    setIsSeoPanelOpen(false);
    setCategories([]);
    setPrimaryCategory(null);
    setCategoryInput('');
    setIsCategoryDropdownOpen(false);
    setPostFormat('Standard');
    setValidationError(null);
    setPublishResult(null);
    setLoadError(null);
    setIsPreviewOpen(false);
    router.replace(`/dashboard/content/new?type=${nextType}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-[1200px] pb-32 lg:pb-28">
      {/* Page header */}
      <div className="mb-6 flex flex-col gap-1">
        <h1 className="text-[1.8rem] font-medium tracking-tight text-[#0f1116]">
          Create New Content
        </h1>
        <p className="text-[0.95rem] text-gray-500">
          Draft a new prompt, post, or guide for the marketplace.
        </p>
      </div>

      {loadError && (
        <div className="mb-4">
          <ActionError error={loadError} />
        </div>
      )}

      {/* Validation error banner */}
      {validationError && (
        <div className="mb-4 flex items-center gap-3 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[0.88rem] text-red-700">
          <MdError size={18} className="shrink-0" />
          {validationError}
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <MdClose size={16} />
          </button>
        </div>
      )}

      {/* Success banner */}
      {publishResult === 'success' && (
        <div className="mb-4 flex items-center gap-3 rounded-[14px] border border-green-100 bg-green-50 px-4 py-3 text-[0.88rem] text-green-700">
          <MdCheckCircle size={18} className="shrink-0" />
          Content saved successfully as <strong>{status}</strong>.
          {status !== 'Draft' ? (
            <button
              type="button"
              onClick={handleAddAnother}
              className="ml-auto rounded-full border border-green-200 bg-white px-3.5 py-1.5 text-[0.8rem] font-medium text-green-700 transition-colors hover:bg-green-100"
            >
              Add another {postType === 'Prompt' ? 'prompt' : 'post'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setPublishResult(null)}
            className={
              status !== 'Draft'
                ? 'text-green-400 hover:text-green-600'
                : 'ml-auto text-green-400 hover:text-green-600'
            }
          >
            <MdClose size={16} />
          </button>
        </div>
      )}

      <div className="mt-2 grid gap-8 lg:grid-cols-[0.65fr_0.35fr] lg:items-start">
        {/* —— LEFT COLUMN —— */}
        <div className="space-y-8">
          {/* Featured image */}
          <div>
            <p className="text-[0.9rem] text-[#2f3440]">Featured image</p>
            {featuredImage ? (
              <div className="relative mt-3">
                <div
                  className="h-auto w-full rounded-[20px] bg-cover bg-center"
                  style={{ backgroundImage: `url(${featuredImage})`, aspectRatio: '16 / 9' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setFeaturedImage(null);
                    setFeaturedImageValue(null);
                  }}
                  className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[0.78rem] font-medium text-white backdrop-blur-sm hover:bg-black/80 transition-colors"
                >
                  <MdClose size={14} />
                  Remove
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openMediaModal('featured')}
                className="mt-3 flex min-h-[180px] w-full cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed border-[#d9dde6] bg-white px-6 py-10 text-center transition-colors hover:border-[#0f1116] hover:bg-[#f7f8fb]"
              >
                <div className="space-y-2">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#d9dde6] text-[#7a8292]">
                    <FaCloudArrowUp className="h-4 w-4" />
                  </div>
                  <p className="text-[0.9rem] text-[#2f3440]">
                    <span className="text-[#1e4fd2]">Choose image</span> (Upload, Library, or URL)
                  </p>
                  <p className="text-[0.78rem] text-[#9aa1ae]">PNG, JPG, GIF up to 5 MB</p>
                </div>
              </button>
            )}

            {postType === 'Prompt' ? (
              <div className="mt-4">
                <p className="text-[0.82rem] text-[#7a8292]">
                  Gallery images (up to {MAX_GALLERY_IMAGES})
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                  {galleryImageSlots.map((slot, index) => {
                    return (
                      <div key={`prompt-gallery-slot-${index}`} className="relative">
                        <button
                          type="button"
                          onClick={() => openMediaModal(index)}
                          className="group relative flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-[16px] border border-[#d9dde6] bg-white"
                        >
                          {slot.previewUrl ? (
                            <img
                              src={slot.previewUrl}
                              alt={`Gallery image ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="space-y-1 text-center">
                              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-[#d9dde6] text-[#7a8292]">
                                <FaCloudArrowUp className="h-3.5 w-3.5" />
                              </div>
                              <p className="text-[0.72rem] text-[#7a8292]">Add image</p>
                            </div>
                          )}
                          <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/70 px-2 py-1 text-[0.64rem] font-medium text-white">
                            {slot.previewUrl ? 'Replace' : 'Upload'}
                          </span>
                        </button>
                        {slot.previewUrl ? (
                          <button
                            type="button"
                            onClick={() => removeGalleryImage(index)}
                            className="absolute right-1.5 top-1.5 rounded-full bg-black/65 p-1 text-white transition-colors hover:bg-black/85"
                            aria-label={`Remove gallery image ${index + 1}`}
                          >
                            <MdClose size={12} />
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* Title */}
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Write a title..."
              className={`w-full border-none bg-transparent text-[2rem] font-medium text-[#0f1116] outline-none placeholder:text-[#b5bac6] sm:text-[2.4rem] ${
                validationError && !title.trim() ? 'placeholder:text-red-300' : ''
              }`}
            />

            {/* Tags */}
            <div className="mt-6">
              <p className="text-[0.95rem] text-[#6b7280]">Add up to 15 tags...</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-[16px] border border-[#e1e5ee] px-3 py-3">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-[#f1f3f8] px-3 py-1 text-[0.75rem] text-[#2f3440]"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-0.5 text-gray-400 hover:text-gray-700 transition-colors"
                      aria-label={`Remove tag ${tag}`}
                    >
                      <MdClose size={12} />
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => handleTagInputChange(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder={remainingTags > 0 ? 'Add a tag' : 'Tag limit reached'}
                  className="min-w-[140px] flex-1 border-none bg-transparent text-[0.85rem] text-[#0f1116] outline-none"
                  disabled={remainingTags <= 0}
                />
              </div>
              <p className="mt-2 text-[0.75rem] text-[#9aa1ae]">
                {tagCountLabel}. Press Enter or comma to add. Backspace to remove last tag.
              </p>
            </div>
          </div>

          {/* Body */}
          <div>
            <RichTextEditor value={body} onChange={handleBodyChange} />
          </div>
        </div>

        {/* —— RIGHT COLUMN / SIDEBAR —— */}
        <aside className="rounded-[24px] border border-[#e2e6ee] bg-white p-5 sm:p-6 lg:sticky lg:top-6">
          <div>
            <h3 className="text-[1.1rem] text-[#0f1116]">Post options</h3>
            <p className="mt-1 text-[0.82rem] text-[#7a8292]">
              Configure settings before publishing.
            </p>
          </div>

          <div className="mt-6 space-y-6">
            <div className="rounded-[16px] border border-[#e4e9f2] bg-[#fafbfd] p-4">
              <p className="text-[0.76rem] font-medium uppercase tracking-[0.08em] text-[#7a8292]">
                Quick settings
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white px-3 py-1.5 text-[0.75rem] text-[#2f3440]">
                  Status: <span className="font-medium text-[#0f1116]">{status}</span>
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-[0.75rem] text-[#2f3440]">
                  Visibility:{' '}
                  <span className="font-medium text-[#0f1116]">
                    {visibility === 'EXCLUSIVE' ? 'Exclusive' : 'Free'}
                  </span>
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 text-[0.75rem] text-[#2f3440]">
                  Type: <span className="font-medium text-[#0f1116]">{postType}</span>
                </span>
              </div>
            </div>

            {/* Slug */}
            <div className="grid gap-3 rounded-[16px] border border-[#e4e9f2] bg-[#fafbfd] p-4">
              <p className="text-[0.85rem] text-[#2f3440]">Slug</p>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                }}
                placeholder="my-awesome-post"
                className="w-full rounded-[12px] border border-[#e1e5ee] px-3.5 py-2.5 text-[0.9rem]"
              />
              <p className="text-[0.78rem] text-[#7a8292]">
                Link preview:{' '}
                <span className="text-[#1e4fd2] break-all">
                  /{primaryCategory?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'category'}/
                  {slug || 'your-slug'}
                </span>
              </p>
            </div>

            {/* Excerpt */}
            <div className="grid gap-3 rounded-[16px] border border-[#e4e9f2] bg-[#fafbfd] p-4">
              <p className="text-[0.85rem] text-[#2f3440]">Excerpt</p>
              <textarea
                rows={3}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Short description for search and previews…"
                className="w-full rounded-[12px] border border-[#e1e5ee] px-3.5 py-2.5 text-[0.9rem]"
              />
            </div>

            {/* Publishing */}
            <div className="grid gap-4 rounded-[16px] border border-[#e4e9f2] bg-[#fafbfd] p-4">
              <div>
                <p className="text-[0.85rem] text-[#2f3440]">Publishing</p>
                <p className="mt-1 text-[0.78rem] text-[#7a8292]">
                  Set status and audience before you publish.
                </p>
              </div>

              <div className="grid gap-3">
                <p className="text-[0.82rem] text-[#2f3440]">Status</p>
                <div className="flex flex-wrap gap-3 text-[0.85rem] text-[#2f3440]">
                  {optionStatusItems.map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="post-status"
                        checked={status === option}
                        onChange={() => setStatus(option)}
                        className="accent-[#0f1116]"
                      />
                      {option}
                    </label>
                  ))}
                </div>
                {status === 'Scheduled' ? (
                  <div className="mt-1">
                    <label className="mb-1 flex items-center gap-2 text-[0.82rem] text-[#7a8292]">
                      <MdSchedule size={14} />
                      Schedule date & time
                    </label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(e) => setScheduledAt(e.target.value)}
                      className="w-full rounded-[12px] border border-[#e1e5ee] px-3.5 py-2.5 text-[0.9rem]"
                    />
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3">
                <p className="text-[0.82rem] text-[#2f3440]">Visibility</p>
                <div className="flex flex-wrap gap-3 text-[0.85rem] text-[#2f3440]">
                  {(
                    [
                      { label: 'Free', value: 'FREE' as const },
                      { label: 'Exclusive', value: 'EXCLUSIVE' as const },
                    ] as const
                  ).map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="post-visibility"
                        checked={visibility === option.value}
                        onChange={() => setVisibility(option.value)}
                        className="accent-[#0f1116]"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                <p className="text-[0.78rem] text-[#7a8292]">
                  Choose <span className="font-medium text-[#2f3440]">Free</span> for public access
                  or <span className="font-medium text-[#2f3440]">Exclusive</span> for member-only
                  access.
                </p>
              </div>
            </div>

            <div className="rounded-[16px] border border-[#e4e9f2] bg-[#fafbfd] p-4">
              <button
                type="button"
                onClick={() => setIsSeoPanelOpen((current) => !current)}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div>
                  <p className="text-[0.85rem] text-[#2f3440]">SEO</p>
                  <p className="mt-1 text-[0.78rem] text-[#7a8292]">
                    Optional search optimization settings.
                  </p>
                </div>
                <span className="rounded-full border border-[#d8dfe8] bg-white px-3 py-1 text-[0.74rem] font-medium text-[#2f3440]">
                  {isSeoPanelOpen ? 'Hide' : 'Show'}
                </span>
              </button>

              {isSeoPanelOpen ? (
                <div className="mt-4 grid gap-4 border-t border-[#e6ebf4] pt-4">
                  <div className="grid gap-2">
                    <label className="text-[0.78rem] text-[#6b7280]">SEO title</label>
                    <input
                      type="text"
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="Optional custom title for search results"
                      className="w-full rounded-[12px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[0.78rem] text-[#6b7280]">Meta title</label>
                    <input
                      type="text"
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      placeholder="Optional meta title"
                      className="w-full rounded-[12px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[0.78rem] text-[#6b7280]">SEO description</label>
                    <textarea
                      rows={4}
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="Optional custom description for search and social previews"
                      className="w-full rounded-[12px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[0.78rem] text-[#6b7280]">
                      Meta description (secondary)
                    </label>
                    <textarea
                      rows={4}
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      placeholder="Optional additional meta description"
                      className="w-full rounded-[12px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[0.78rem] text-[#6b7280]">Focus keyword</label>
                    <input
                      type="text"
                      value={seoFocusKeyword}
                      onChange={(e) => setSeoFocusKeyword(e.target.value)}
                      placeholder="Primary phrase you want this content to target"
                      className="w-full rounded-[12px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem]"
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-[0.78rem] text-[#6b7280]">Canonical URL</label>
                    <input
                      type="url"
                      value={seoCanonicalUrl}
                      onChange={(e) => setSeoCanonicalUrl(e.target.value)}
                      placeholder="https://example.com/preferred-url"
                      className="w-full rounded-[12px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem]"
                    />
                  </div>

                  <label className="flex items-center justify-between gap-3 rounded-[12px] border border-[#e1e5ee] bg-white px-3.5 py-3 text-[0.85rem] text-[#2f3440]">
                    <span>Noindex this content</span>
                    <input
                      type="checkbox"
                      checked={seoNoIndex}
                      onChange={(e) => setSeoNoIndex(e.target.checked)}
                      className="h-4 w-4 accent-[#111111]"
                    />
                  </label>

                  <div className="rounded-[16px] border border-[#e8ecf4] bg-white p-4">
                    <p className="text-[0.75rem] font-medium uppercase tracking-wide text-[#7a8292]">
                      Search preview
                    </p>
                    <p className="mt-3 text-[0.82rem] text-[#1a0dab]">{seoPreviewTitle}</p>
                    <p className="mt-1 break-all text-[0.74rem] text-[#188038]">
                      {seoCanonicalUrl.trim() || `/${primaryCategory?.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'category'}/${slug || 'your-slug'}`}
                    </p>
                    <p className="mt-2 text-[0.78rem] leading-relaxed text-[#4d5156]">
                      {seoPreviewDescription}
                    </p>
                  </div>

                  <div className="space-y-2 rounded-[16px] border border-[#e8ecf4] bg-white p-4">
                    <p className="text-[0.75rem] font-medium uppercase tracking-wide text-[#7a8292]">
                      SEO checks
                    </p>
                    {seoChecks.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[12px] border border-[#eef1f6] px-3 py-2.5"
                      >
                        <div className="flex items-center justify-between gap-3 text-[0.82rem]">
                          <span className="text-[#2f3440]">{item.label}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[0.7rem] font-medium ${
                              item.ok
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.ok ? 'Good' : 'Needs work'}
                          </span>
                        </div>
                        <p className="mt-1 text-[0.74rem] leading-relaxed text-[#7a8292]">
                          {item.hint}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-[0.78rem] leading-relaxed text-[#7a8292]">
                  Add SEO title, description, canonical URL, and index controls when needed.
                </p>
              )}
            </div>

            {/* Categories */}
            <div className="relative grid gap-3 rounded-[16px] border border-[#e4e9f2] bg-[#fafbfd] p-4">
              <p className="text-[0.85rem] text-[#2f3440]">Categories</p>
              <div
                className="w-full rounded-[12px] border border-[#e1e5ee] bg-white px-3 py-2 text-[0.9rem] flex flex-wrap gap-2 items-center focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all cursor-text"
                onClick={() => setIsCategoryDropdownOpen(true)}
              >
                {categories.map((cat) => (
                  <span
                    key={cat}
                    title={primaryCategory === cat ? 'Primary Category' : 'Click to set as Primary'}
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrimaryCategory(cat);
                    }}
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.8rem] font-medium border cursor-pointer transition-colors ${
                      primaryCategory === cat
                        ? 'bg-blue-100 text-blue-800 border-blue-200'
                        : 'bg-blue-50 text-blue-700 border-blue-100/50 hover:bg-blue-100/50'
                    }`}
                  >
                    {primaryCategory === cat && <span className="text-[0.7rem]">★</span>}
                    {cat}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCategory(cat);
                      }}
                      className={`hover:text-blue-900 focus:outline-none transition-colors ${primaryCategory === cat ? 'text-blue-500' : 'text-blue-400'}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => {
                    setCategoryInput(e.target.value);
                    setIsCategoryDropdownOpen(true);
                  }}
                  onFocus={() => setIsCategoryDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsCategoryDropdownOpen(false), 200)}
                  onKeyDown={handleCategoryKeyDown}
                  placeholder={categories.length === 0 ? 'Select or add categories...' : ''}
                  className="flex-1 min-w-[120px] bg-transparent outline-none py-0.5 text-[0.85rem] placeholder:text-gray-400"
                  disabled={categories.length >= 15}
                />
              </div>
              {isCategoryDropdownOpen && (
                <div className="absolute top-[100%] left-0 w-full mt-1 bg-white border border-gray-200 rounded-[12px] shadow-lg overflow-hidden z-50">
                  <ul className="max-h-[200px] overflow-y-auto pt-1">
                    {filteredCategories.length > 0
                      ? filteredCategories.map((cat) => (
                          <li
                            key={cat}
                            className="px-4 py-2.5 text-[0.85rem] text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => addCategory(cat)}
                          >
                            {cat}
                          </li>
                        ))
                      : categoryInput.trim() === '' && (
                          <li className="px-4 py-3 text-[0.85rem] text-gray-500 italic text-center">
                            Start typing to search or create
                          </li>
                        )}
                  </ul>
                  {categoryInput.trim() &&
                    !filteredCategories.find(
                      (c) => c.toLowerCase() === categoryInput.trim().toLowerCase(),
                    ) && (
                      <div
                        className="px-4 py-3 bg-blue-50/50 border-t border-gray-100 text-[0.85rem] text-blue-700 cursor-pointer hover:bg-blue-50 transition-colors font-medium flex items-center gap-2"
                        onClick={() => addCategory(categoryInput.trim())}
                      >
                        <span className="bg-blue-100 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center text-[0.9rem] leading-none">
                          +
                        </span>
                        Add &ldquo;{categoryInput}&rdquo;
                      </div>
                    )}
                </div>
              )}
              <p className="text-[0.78rem] text-[#7a8292]">Multiple categories allowed. Max 15.</p>
            </div>

            <div className="grid gap-4 rounded-[16px] border border-[#e4e9f2] bg-[#fafbfd] p-4">
              <p className="text-[0.85rem] text-[#2f3440]">Content type</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-[0.78rem] text-[#6b7280]">Post type</label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value as typeof postType)}
                    className="w-full rounded-[12px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem]"
                  >
                    {optionPostTypes.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-[0.78rem] text-[#6b7280]">Post format</label>
                  <select
                    value={postFormat}
                    onChange={(e) => setPostFormat(e.target.value as typeof postFormat)}
                    className="w-full rounded-[12px] border border-[#e1e5ee] bg-white px-3.5 py-2.5 text-[0.9rem]"
                  >
                    {optionPostFormats.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ——————————————————————————————————————————————
          STICKY FOOTER ACTION BAR
      —————————————————————————————————————————————— */}
      {typeof window !== 'undefined'
        ? createPortal(
            <div className="fixed bottom-0 left-0 right-0 z-[70] border-t border-[#eef2f6] bg-white/95 backdrop-blur-md lg:left-64">
              <div className="mx-auto w-full max-w-[1200px] px-4 py-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    <span className="hidden whitespace-nowrap text-[0.82rem] text-gray-400 sm:block">
                      Status: <span className="font-medium text-[#0f1116]">{status}</span>
                    </span>
                    <div className="hidden items-center gap-1.5 sm:flex">
                      <span className="whitespace-nowrap text-[0.82rem] text-gray-400">
                        Visibility:
                      </span>
                      <button
                        type="button"
                        onClick={() => setVisibility('FREE')}
                        className={`rounded-full px-2.5 py-1 text-[0.72rem] font-medium transition-colors ${
                          visibility === 'FREE'
                            ? 'bg-[#e8ecf4] text-[#0f1116]'
                            : 'bg-transparent text-gray-400 hover:text-[#0f1116]'
                        }`}
                      >
                        Free
                      </button>
                      <button
                        type="button"
                        onClick={() => setVisibility('EXCLUSIVE')}
                        className={`rounded-full px-2.5 py-1 text-[0.72rem] font-medium transition-colors ${
                          visibility === 'EXCLUSIVE'
                            ? 'bg-[#d5ea52] text-black'
                            : 'bg-transparent text-gray-400 hover:text-[#0f1116]'
                        }`}
                      >
                        Exclusive
                      </button>
                    </div>
                    {title.trim() ? (
                      <>
                        <span className="hidden text-[0.78rem] text-gray-300 sm:block">·</span>
                        <span className="hidden max-w-[260px] truncate text-[0.82rem] text-gray-400 sm:block">
                          {title}
                        </span>
                      </>
                    ) : null}
                  </div>

                  <div className="ml-auto flex items-center gap-2 sm:gap-3">
                    {/* Preview */}
                    <button
                      type="button"
                      onClick={() => setIsPreviewOpen(true)}
                      className="hidden items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm transition-colors hover:bg-gray-50 sm:flex"
                    >
                      Preview
                    </button>

                    {/* Save Draft */}
                    <LoadingButton
                      type="button"
                      onClick={() => handleSave('Draft')}
                      pending={isSaving && savingTarget === 'Draft'}
                      pendingLabel="Saving draft..."
                      spinnerSize="xs"
                      spinnerClassName="text-[#0f1116]"
                      disabled={isSaving && savingTarget !== 'Draft'}
                      className="flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
                    >
                      <span className="hidden sm:block">Save Draft</span>
                      <span className="sm:hidden">Draft</span>
                    </LoadingButton>

                    {/* Publish */}
                    <LoadingButton
                      type="button"
                      onClick={() => {
                        const target = status === 'Scheduled' ? 'Scheduled' : 'Published';
                        handleSave(target);
                      }}
                      pending={
                        isSaving && (savingTarget === 'Published' || savingTarget === 'Scheduled')
                      }
                      pendingLabel={status === 'Scheduled' ? 'Scheduling...' : 'Publishing...'}
                      spinnerSize="xs"
                      spinnerClassName="text-[#0f1116]"
                      disabled={isSaving && savingTarget === 'Draft'}
                      className="flex items-center gap-2 rounded-xl bg-[#d5ea52] px-5 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
                    >
                      <>{status === 'Scheduled' ? 'Schedule' : 'Publish'}</>
                    </LoadingButton>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {isMediaModalOpen && typeof window !== 'undefined'
        ? createPortal(
            <div
              className="fixed inset-0 z-[12000] flex items-center justify-center bg-[#0b0f18]/60 p-3 backdrop-blur-[2px] sm:p-6"
              onClick={(event) => {
                if (event.target !== event.currentTarget) return;
                closeMediaModal();
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Insert Media"
                className="flex w-full max-w-[900px] max-h-[min(90vh,760px)] flex-col overflow-hidden rounded-[22px] border border-[#e6ebf4] bg-white shadow-[0_24px_64px_rgba(2,6,23,0.35)]"
              >
                <div className="flex items-center justify-between border-b border-[#eef2f6] px-5 py-4 sm:px-6">
                  <h3 className="text-[1.05rem] font-semibold text-[#0f1116]">Insert Media</h3>
                  <button
                    type="button"
                    onClick={closeMediaModal}
                    className="rounded-full p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                  >
                    <MdClose size={18} />
                  </button>
                </div>

                <div className="flex shrink-0 border-b border-[#eef2f6] px-4 sm:px-6">
                  {(['upload', 'library', 'url'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setMediaModalTab(tab)}
                      className={`border-b-2 px-3 py-3 text-[0.84rem] font-medium capitalize transition-colors sm:px-4 sm:text-[0.86rem] ${
                        mediaModalTab === tab
                          ? 'border-[#0f1116] text-[#0f1116]'
                          : 'border-transparent text-gray-500 hover:text-[#0f1116]'
                      }`}
                    >
                      {tab === 'url'
                        ? 'Insert from URL'
                        : tab === 'library'
                          ? 'Media Library'
                          : 'Upload'}
                    </button>
                  ))}
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                  {mediaModalTab === 'upload' ? (
                    <label className="flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-[#d9dde6] bg-[#fafbfd] px-6 py-10 text-center transition-colors hover:bg-white">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={isMediaUploading}
                        onChange={(event) => {
                          void handleMediaModalUpload(event.target.files?.[0]);
                          event.currentTarget.value = '';
                        }}
                      />
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#d9dde6] text-[#7a8292]">
                        <FaCloudArrowUp className="h-4 w-4" />
                      </div>
                      <p className="mt-3 text-[0.92rem] text-[#2f3440]">
                        {isMediaUploading ? 'Uploading image...' : 'Upload image from your device'}
                      </p>
                      <p className="mt-1 text-[0.78rem] text-[#9aa1ae]">PNG, JPG, GIF up to 5 MB</p>
                    </label>
                  ) : null}

                  {mediaModalTab === 'library' ? (
                    <div className="space-y-4">
                      <input
                        type="text"
                        value={mediaLibrarySearch}
                        onChange={(event) => setMediaLibrarySearch(event.target.value)}
                        placeholder="Search media..."
                        className="w-full rounded-[12px] border border-[#e1e5ee] px-3.5 py-2.5 text-[0.9rem] outline-none"
                      />
                      {isMediaLibraryLoading ? (
                        <p className="py-10 text-center text-[0.88rem] text-[#7a8292]">Loading media...</p>
                      ) : mediaLibraryItems.length === 0 ? (
                        <p className="py-10 text-center text-[0.88rem] text-[#7a8292]">
                          No images found in library.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                          {mediaLibraryItems.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => selectMediaFromLibrary(item)}
                              className="group relative aspect-square overflow-hidden rounded-[14px] border border-[#e1e5ee] bg-white"
                            >
                              <img
                                src={item.url}
                                alt={item.title ?? 'Media'}
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute inset-x-2 bottom-2 rounded-full bg-black/70 px-2 py-1 text-[0.64rem] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
                                Select
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {mediaModalTab === 'url' ? (
                    <div className="space-y-3">
                      <p className="text-[0.85rem] text-[#6b7280]">Paste an image URL</p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="url"
                          value={mediaUrlInput}
                          onChange={(event) => setMediaUrlInput(event.target.value)}
                          placeholder="https://example.com/image.jpg"
                          className="w-full rounded-[12px] border border-[#e1e5ee] px-3.5 py-2.5 text-[0.9rem] outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleInsertMediaUrl}
                          className="rounded-[12px] bg-[#0f1116] px-4 py-2.5 text-[0.85rem] font-medium text-white"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {/* ——————————————————————————————————————————————
          PREVIEW MODAL
      —————————————————————————————————————————————— */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-black/60 p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsPreviewOpen(false);
          }}
        >
          <div className="my-6 w-full max-w-[860px] rounded-[28px] bg-white shadow-2xl overflow-hidden">
            {/* Preview header */}
            <div className="flex items-center justify-between border-b border-[#eef2f6] px-6 py-4">
              <div>
                <span className="text-[0.8rem] font-medium uppercase tracking-widest text-gray-400">
                  Preview
                </span>
                <p className="text-[0.85rem] text-gray-500 mt-0.5">
                  This is how your content will look live
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <MdClose size={18} />
              </button>
            </div>

            {/* Preview body */}
            <div className="p-8">
              {featuredImage && (
                <img
                  src={featuredImage}
                  alt="Featured"
                  className="mb-8 h-[280px] w-full rounded-[20px] object-cover"
                />
              )}
              {categories.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <span
                      key={cat}
                      className={`rounded-full px-3 py-1 text-[0.75rem] font-medium ${
                        primaryCategory === cat
                          ? 'bg-[#0f1116] text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
              <h1 className="text-[2rem] font-semibold leading-tight text-[#0f1116]">
                {title || <span className="text-gray-300 italic">Untitled post</span>}
              </h1>
              {excerpt && (
                <p className="mt-4 text-[1rem] leading-relaxed text-gray-500">{excerpt}</p>
              )}
              {tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#f1f3f8] px-3 py-1 text-[0.75rem] text-[#4b5563]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              {body ? (
                <div
                  className="prose prose-gray mt-8 max-w-none text-[0.95rem] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: body }}
                />
              ) : (
                <p className="mt-8 text-center text-[0.9rem] italic text-gray-400">
                  No body content yet. Start writing to see a preview.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
