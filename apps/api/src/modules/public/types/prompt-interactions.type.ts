export type PromptInteractionStatusRequest = {
  promptIds: string[];
};

export type PromptInteractionStatusItem = {
  promptId: string;
  likedByIp: boolean;
  savedByUser: boolean;
};

export type PromptInteractionStatusResponse = {
  items: PromptInteractionStatusItem[];
};

export type PromptLikeResponse = {
  liked: true;
  alreadyLiked: boolean;
  likeCount: number;
};

export type PromptSaveResponse = {
  saved: boolean;
  saveCount: number;
};

export type ContentViewResponse = {
  counted: boolean;
  viewCount: number;
};

export type PromptCommentCreateRequest = {
  content: string;
  parentId?: string;
};

export type PromptCommentCreateResponse = {
  submitted: true;
  status: 'PENDING';
  parentId: string | null;
};

export type PublicCommentStatus = 'APPROVED' | 'PENDING';

export type PromptCommentReplySummary = {
  id: string;
  content: string;
  createdAt: string;
  status: PublicCommentStatus;
  likeCount: number;
  likedByViewer: boolean;
  author: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    avatarUpdatedAt: string | null;
  } | null;
};

export type PromptCommentSummary = {
  id: string;
  content: string;
  createdAt: string;
  status: PublicCommentStatus;
  likeCount: number;
  likedByViewer: boolean;
  replyCount: number;
  author: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    avatarUpdatedAt: string | null;
  } | null;
  replies: PromptCommentReplySummary[];
};

export type PromptCommentListResponse = {
  items: PromptCommentSummary[];
  total: number;
};

export type PromptCommentLikeResponse = {
  liked: boolean;
  likeCount: number;
};

export type AuthorFollowResponse = {
  following: boolean;
  followerCount: number;
};

export type FollowedAuthorSummary = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  avatarUpdatedAt: string | null;
  followedAt: string;
};

export type FollowedAuthorListResponse = {
  items: FollowedAuthorSummary[];
};
