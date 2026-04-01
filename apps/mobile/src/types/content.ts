export type PromptVisibility = 'FREE' | 'EXCLUSIVE';

export type PublicAuthor = {
  id: string;
  name: string;
  handle: string | null;
  slug: string;
  avatarUrl: string | null;
  profileTitle: string | null;
  bio: string | null;
  followerCount?: number;
  promptCount?: number;
};

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  totalCount?: number;
};

export type PublicTag = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  usage?: number;
};

export type PublicPrompt = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  promptType: string;
  visibility: PromptVisibility;
  image: string | null;
  galleryImages: string[];
  publishedAt: string | null;
  updatedAt: string;
  viewCount: number;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  isLocked: boolean;
  requiresMembership: boolean;
  author: PublicAuthor;
  primaryCategory: { id: string; name: string; slug: string } | null;
  categories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; slug: string }>;
  content?: string | null;
};

export type PublicPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  postType: string;
  postFormat: string;
  visibility: PromptVisibility;
  image: string | null;
  publishedAt: string | null;
  updatedAt: string;
  viewCount: number;
  commentCount: number;
  isLocked: boolean;
  requiresMembership: boolean;
  author: PublicAuthor;
  primaryCategory: { id: string; name: string; slug: string } | null;
  categories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; slug: string }>;
  content: string | null;
};

export type ListResponse<T> = {
  items: T[];
  total: number;
};

export type HomeResponse = {
  categories: PublicCategory[];
  latestPrompts: PublicPrompt[];
  trendingPrompts: PublicPrompt[];
  latestPosts: PublicPost[];
  popularTags: PublicTag[];
};

export type SearchResponse = {
  query: string;
  prompts: PublicPrompt[];
  posts: PublicPost[];
  categories: PublicCategory[];
  tags: PublicTag[];
  authors: PublicAuthor[];
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  handle?: string | null;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type MembershipSummary = {
  plan: 'FREE' | 'PREMIUM';
  status: string;
  expiresAt: string | null;
};
