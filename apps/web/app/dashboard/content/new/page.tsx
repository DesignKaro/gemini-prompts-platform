'use client';

import { useEffect, useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { FaCloudArrowUp } from 'react-icons/fa6';
import { MdClose, MdSchedule, MdCheckCircle, MdError } from 'react-icons/md';
import { useRouter, useSearchParams } from 'next/navigation';
import RichTextEditor from '../../../components/rich-text-editor';
import { useAdminApi } from '../../../components/dashboard/use-admin-api';

const MAX_TAGS = 15;

const optionStatusItems = ['Published', 'Draft', 'Private', 'Scheduled'] as const;
const optionPostTypes = ['Post', 'Prompt'] as const;
const optionPostFormats = ['Standard', 'Checklist', 'Gallery'] as const;

type Status = (typeof optionStatusItems)[number];
type PublishResult = 'success' | 'error' | null;

type ApiPromptStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
type ApiVisibility = 'FREE' | 'EXCLUSIVE';

type CategoryOption = { id: string; name: string; slug: string };
type TagOption = { id: string; name: string; slug: string; color?: string | null };

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

function toDateTimeLocal(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

export default function CreateContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams?.get('type')?.toLowerCase();
  const editParam = searchParams?.get('edit') ?? null;
  const { request, status: authStatus } = useAdminApi();

  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagsInput, setTagsInput] = useState('');

  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [excerpt, setExcerpt] = useState('');
  const [status, setStatus] = useState<Status>('Draft');
  const [visibility, setVisibility] = useState<ApiVisibility>('FREE');
  const [scheduledAt, setScheduledAt] = useState('');
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
      request<{ items: CategoryOption[] }>('/api/admin/categories?take=200'),
      request<{ items: TagOption[] }>('/api/admin/tags?take=200'),
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
      setFeaturedImage(payload.featuredImageUrl ?? null);
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
      if (apiStatus === 'PUBLISHED' && apiVisibility === 'EXCLUSIVE') {
        setStatus('Private');
      } else if (apiStatus === 'PUBLISHED') {
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
      setFeaturedImage(payload.featuredImageUrl ?? null);
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
      if (apiStatus === 'PUBLISHED' && apiVisibility === 'EXCLUSIVE') {
        setStatus('Private');
      } else if (apiStatus === 'PUBLISHED') {
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
        const payload = await request<PromptPayload>(`/api/admin/prompts/${editId}`);
        if (!isActive) return;
        hydrateFromPrompt(payload);
        return;
      }
      if (typeParam === 'post') {
        const payload = await request<PostPayload>(`/api/admin/posts/${editId}`);
        if (!isActive) return;
        hydrateFromPost(payload);
        return;
      }

      try {
        const payload = await request<PromptPayload>(`/api/admin/prompts/${editId}`);
        if (!isActive) return;
        hydrateFromPrompt(payload);
      } catch {
        const payload = await request<PostPayload>(`/api/admin/posts/${editId}`);
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

  const addTags = (raw: string) => {
    if (!raw.trim()) return;
    const nextTags = raw
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    setTags((current) => {
      const unique = new Set(current);
      for (const tag of nextTags) {
        if (unique.size >= MAX_TAGS) break;
        unique.add(tag);
      }
      return Array.from(unique);
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
    if (categories.length >= 15) return;
    if (!categories.includes(cat)) {
      setCategories((prev) => [...prev, cat]);
      if (categories.length === 0) setPrimaryCategory(cat);
      if (!availableCategories.includes(cat)) setAvailableCategories((prev) => [...prev, cat]);
    }
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

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => setFeaturedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleBodyChange = (html: string) => setBody(html);

  const validate = (target: Status): string | null => {
    if (!title.trim()) return 'A title is required before publishing.';
    if ((target === 'Published' || target === 'Private') && !body.trim()) {
      return 'Post body cannot be empty when publishing.';
    }
    if (target === 'Scheduled' && !scheduledAt) return 'Please set a scheduled date and time.';
    return null;
  };

  const handleSave = async (targetStatus: Status) => {
    const err = validate(targetStatus);
    if (
      err &&
      (targetStatus === 'Published' || targetStatus === 'Private' || targetStatus === 'Scheduled')
    ) {
      setValidationError(err);
      return;
    }

    setValidationError(null);
    setIsSaving(true);
    setPublishResult(null);

    const trimmedTitle = title.trim();
    const normalizedSlug = slug.trim() || generateSlug(trimmedTitle);

    const resolveStatus = () => {
      if (targetStatus === 'Private')
        return { status: 'PUBLISHED' as ApiPromptStatus, visibility: 'EXCLUSIVE' as ApiVisibility };
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
      const trimmed = names.map((name) => name.trim()).filter(Boolean);
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
      const trimmed = names.map((name) => name.trim()).filter(Boolean);
      if (trimmed.length === 0) return [];
      const updatedOptions = [...tagOptions];
      const created: TagOption[] = [];
      for (const name of trimmed) {
        const normalized = name.toLowerCase();
        const slugValue = generateSlug(name);
        const existing = updatedOptions.find(
          (tag) => tag.name.toLowerCase() === normalized || tag.slug === slugValue,
        );
        if (existing) continue;
        const createdTag = await request<TagOption>('/api/admin/tags', {
          method: 'POST',
          body: JSON.stringify({
            name,
            slug: slugValue,
            color: null,
          }),
        });
        created.push(createdTag);
        updatedOptions.push(createdTag);
      }
      if (created.length > 0) {
        setTagOptions((prev) => [...prev, ...created]);
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
      const payload = {
        title: trimmedTitle,
        slug: normalizedSlug,
        content: body,
        status: apiStatus,
        visibility: apiVisibility,
        scheduledAt: scheduledAtValue,
        featuredImageUrl: featuredImage ?? null,
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
        };
        if (editId) {
          await request(`/api/admin/prompts/${editId}`, {
            method: 'PATCH',
            body: JSON.stringify(promptPayload),
          });
        } else {
          const created = await request<PromptPayload>('/api/admin/prompts', {
            method: 'POST',
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
            body: JSON.stringify(postPayload),
          });
        } else {
          const created = await request<PostPayload>('/api/admin/posts', {
            method: 'POST',
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
    }
  };

  const handleAddAnother = () => {
    const nextType = postType === 'Prompt' ? 'prompt' : 'post';
    setEditId(null);
    setFeaturedImage(null);
    setIsDragging(false);
    setTitle('');
    setBody('');
    setTags([]);
    setTagsInput('');
    setSlug('');
    setSlugManuallyEdited(false);
    setExcerpt('');
    setStatus('Draft');
    setVisibility('FREE');
    setScheduledAt('');
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
    <div className="mx-auto max-w-[1200px] pb-28">
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
        <div className="mb-4 flex items-center gap-3 rounded-[14px] border border-red-100 bg-red-50 px-4 py-3 text-[0.88rem] text-red-700">
          <MdError size={18} className="shrink-0" />
          {loadError}
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
                  onClick={() => setFeaturedImage(null)}
                  className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-[0.78rem] font-medium text-white backdrop-blur-sm hover:bg-black/80 transition-colors"
                >
                  <MdClose size={14} />
                  Remove
                </button>
              </div>
            ) : (
              <label
                className={`mt-3 flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed px-6 py-10 text-center transition-colors ${
                  isDragging ? 'border-[#0f1116] bg-[#f7f8fb]' : 'border-[#d9dde6] bg-white'
                }`}
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFile(e.dataTransfer.files?.[0]);
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <div className="space-y-2">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[#d9dde6] text-[#7a8292]">
                    <FaCloudArrowUp className="h-4 w-4" />
                  </div>
                  <p className="text-[0.9rem] text-[#2f3440]">
                    <span className="text-[#1e4fd2]">Upload a file</span> or drag and drop
                  </p>
                  <p className="text-[0.78rem] text-[#9aa1ae]">PNG, JPG, GIF up to 5 MB</p>
                </div>
              </label>
            )}
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
            {/* Slug */}
            <div className="grid gap-3 border-t border-[#eceff4] pt-6">
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
            <div className="grid gap-3 border-t border-[#eceff4] pt-6">
              <p className="text-[0.85rem] text-[#2f3440]">Excerpt</p>
              <textarea
                rows={3}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Short description for search and previews…"
                className="w-full rounded-[12px] border border-[#e1e5ee] px-3.5 py-2.5 text-[0.9rem]"
              />
            </div>

            {/* Status */}
            <div className="grid gap-3 border-t border-[#eceff4] pt-6">
              <p className="text-[0.85rem] text-[#2f3440]">Status</p>
              <div className="flex flex-wrap gap-3 text-[0.85rem] text-[#2f3440]">
                {optionStatusItems.map((option) => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="post-status"
                      checked={status === option}
                      onChange={() => {
                        setStatus(option);
                        if (option === 'Private') {
                          setVisibility('EXCLUSIVE');
                        } else if (option === 'Published') {
                          setVisibility('FREE');
                        }
                      }}
                      className="accent-[#0f1116]"
                    />
                    {option}
                  </label>
                ))}
              </div>
              {/* Scheduled date picker */}
              {status === 'Scheduled' && (
                <div className="mt-1">
                  <label className="flex items-center gap-2 text-[0.82rem] text-[#7a8292] mb-1">
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
              )}
            </div>

            {/* Categories */}
            <div className="grid gap-3 border-t border-[#eceff4] pt-6 relative">
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

            {/* Post type */}
            <div className="grid gap-3 border-t border-[#eceff4] pt-6">
              <p className="text-[0.85rem] text-[#2f3440]">Post type</p>
              <select
                value={postType}
                onChange={(e) => setPostType(e.target.value as typeof postType)}
                className="w-full rounded-[12px] border border-[#e1e5ee] px-3.5 py-2.5 text-[0.9rem]"
              >
                {optionPostTypes.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>

            {/* Post format */}
            <div className="grid gap-3 border-t border-[#eceff4] pt-6">
              <p className="text-[0.85rem] text-[#2f3440]">Post format</p>
              <select
                value={postFormat}
                onChange={(e) => setPostFormat(e.target.value as typeof postFormat)}
                className="w-full rounded-[12px] border border-[#e1e5ee] px-3.5 py-2.5 text-[0.9rem]"
              >
                {optionPostFormats.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </aside>
      </div>

      {/* ——————————————————————————————————————————————
          STICKY FOOTER ACTION BAR
      —————————————————————————————————————————————— */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#eef2f6] bg-white/95 backdrop-blur-md px-4 py-3 lg:left-64">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="hidden text-[0.82rem] text-gray-400 sm:block">
              Status: <span className="font-medium text-[#0f1116]">{status}</span>
            </span>
            {title.trim() && (
              <span className="hidden text-[0.78rem] text-gray-300 sm:block">·</span>
            )}
            {title.trim() && (
              <span className="hidden max-w-[240px] truncate text-[0.82rem] text-gray-400 sm:block">
                {title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Preview */}
            <button
              type="button"
              onClick={() => setIsPreviewOpen(true)}
              className="hidden items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:bg-gray-50 transition-colors sm:flex"
            >
              Preview
            </button>

            {/* Save Draft */}
            <button
              type="button"
              onClick={() => handleSave('Draft')}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl border border-[#e1e5ee] bg-white px-4 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <span className="hidden sm:block">Save Draft</span>
              <span className="sm:hidden">Draft</span>
            </button>

            {/* Publish */}
            <button
              type="button"
              onClick={() => {
                const target =
                  status === 'Scheduled' || status === 'Private' ? status : 'Published';
                handleSave(target);
              }}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-[#d5ea52] px-5 py-2 text-[0.85rem] font-medium text-[#0f1116] shadow-sm hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isSaving ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0f1116]/30 border-t-[#0f1116]" />
                  Saving…
                </span>
              ) : (
                <>
                  {status === 'Scheduled'
                    ? 'Schedule'
                    : status === 'Private'
                      ? 'Publish Private'
                      : 'Publish'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

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
