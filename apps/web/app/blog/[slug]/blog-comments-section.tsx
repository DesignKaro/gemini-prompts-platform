'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FaHeart, FaRegHeart, FaReply } from 'react-icons/fa6';
import { AuthorAvatar } from '../../components/author-avatar';
import { usePromptInteractions } from '../../components/prompt-interactions/use-prompt-interactions';
import {
  PromptApiError,
  createPostComment,
  fetchPostComments,
  likeComment as requestLikeComment,
  type PromptCommentSummary,
} from '../../../lib/prompt-interactions';

function formatCommentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function findCommentLikeState(comments: PromptCommentSummary[], commentId: string) {
  for (const comment of comments) {
    if (comment.id === commentId) {
      return {
        likedByViewer: comment.likedByViewer,
        likeCount: comment.likeCount,
      };
    }

    const reply = comment.replies.find((item) => item.id === commentId);
    if (reply) {
      return {
        likedByViewer: reply.likedByViewer,
        likeCount: reply.likeCount,
      };
    }
  }

  return null;
}

function updateCommentLikeState(
  comments: PromptCommentSummary[],
  commentId: string,
  nextState: { likedByViewer: boolean; likeCount: number },
) {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return {
        ...comment,
        likedByViewer: nextState.likedByViewer,
        likeCount: nextState.likeCount,
      };
    }

    let changed = false;
    const nextReplies = comment.replies.map((reply) => {
      if (reply.id !== commentId) {
        return reply;
      }

      changed = true;
      return {
        ...reply,
        likedByViewer: nextState.likedByViewer,
        likeCount: nextState.likeCount,
      };
    });

    if (!changed) {
      return comment;
    }

    return {
      ...comment,
      replies: nextReplies,
    };
  });
}

export function BlogCommentsSection({
  postId,
  initialCommentCount,
}: {
  postId: string;
  initialCommentCount: number;
}) {
  const [comments, setComments] = useState<PromptCommentSummary[]>([]);
  const [totalComments, setTotalComments] = useState(initialCommentCount);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [openReplyFor, setOpenReplyFor] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replySubmittingFor, setReplySubmittingFor] = useState<string | null>(null);
  const [likePendingByCommentId, setLikePendingByCommentId] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const { isAuthenticated, redirectToSignIn, getRequiredAccessToken, getOptionalAccessToken } =
    usePromptInteractions({
      promptId: postId,
      initialLikeCount: 0,
      initialSaveCount: 0,
      initialCommentCount,
      syncStatus: false,
    });

  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const accessToken = await getOptionalAccessToken();
        const response = await fetchPostComments(postId, { take: 50 }, accessToken);
        if (isCancelled) return;
        setComments(response.items);
        setTotalComments(response.total);
      } catch {
        if (isCancelled) return;
        setComments([]);
        setTotalComments(0);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [getOptionalAccessToken, postId, reloadNonce]);

  const submitComment = async () => {
    const normalizedContent = content.trim();
    if (!normalizedContent) {
      setFeedback('Write a comment before submitting.');
      return;
    }

    const accessToken = await getRequiredAccessToken();
    if (!accessToken) {
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      await createPostComment(postId, { content: normalizedContent }, accessToken);
      setContent('');
      setFeedback('Comment submitted for moderation.');
      setReloadNonce((value) => value + 1);
    } catch (error) {
      if (error instanceof PromptApiError && error.status === 401) {
        redirectToSignIn();
        return;
      }
      setFeedback(error instanceof Error ? error.message : 'Unable to submit comment right now.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReply = async (parentId: string) => {
    const normalizedContent = (replyDrafts[parentId] ?? '').trim();
    if (!normalizedContent) {
      setFeedback('Write a reply before submitting.');
      return;
    }

    if (!isAuthenticated) {
      redirectToSignIn();
      return;
    }

    const accessToken = await getRequiredAccessToken();
    if (!accessToken) {
      return;
    }

    setReplySubmittingFor(parentId);
    setFeedback(null);

    try {
      await createPostComment(postId, { content: normalizedContent, parentId }, accessToken);
      setReplyDrafts((prev) => ({
        ...prev,
        [parentId]: '',
      }));
      setOpenReplyFor(null);
      setFeedback('Reply submitted for moderation.');
      setReloadNonce((value) => value + 1);
    } catch (error) {
      if (error instanceof PromptApiError && error.status === 401) {
        redirectToSignIn();
        return;
      }
      setFeedback(error instanceof Error ? error.message : 'Unable to submit reply right now.');
    } finally {
      setReplySubmittingFor(null);
    }
  };

  const likeComment = async (commentId: string) => {
    if (likePendingByCommentId[commentId]) {
      return;
    }

    const current = findCommentLikeState(comments, commentId);
    if (!current) {
      return;
    }

    const optimisticState = {
      likedByViewer: !current.likedByViewer,
      likeCount: Math.max(0, current.likeCount + (current.likedByViewer ? -1 : 1)),
    };

    const snapshot = comments;
    setLikePendingByCommentId((prev) => ({ ...prev, [commentId]: true }));
    setComments((prev) => updateCommentLikeState(prev, commentId, optimisticState));

    try {
      const accessToken = await getOptionalAccessToken();
      const response = await requestLikeComment(commentId, accessToken);
      setComments((prev) =>
        updateCommentLikeState(prev, commentId, {
          likedByViewer: response.liked,
          likeCount: response.likeCount,
        }),
      );
    } catch (error) {
      setComments(snapshot);
      if (error instanceof PromptApiError && error.status === 401) {
        redirectToSignIn();
      } else {
        setFeedback('Unable to update comment like right now.');
      }
    } finally {
      setLikePendingByCommentId((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    }
  };

  return (
    <section id="comments" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[1.55rem] font-medium tracking-[-0.02em] text-[#0b0f18]">Comments</h2>
          <p className="mt-2 text-[1rem] leading-[1.75] text-[#5f6773]">
            {totalComments} approved comments.
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-[20px] border border-[#e6e9f2] bg-white p-5 sm:p-6">
        {isAuthenticated ? (
          <div>
            <label
              htmlFor="post-comment-input"
              className="text-[0.9rem] font-medium text-[#0f1118]"
            >
              Add comment
            </label>
            <textarea
              id="post-comment-input"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Share feedback or an improvement suggestion."
              className="mt-2 min-h-[120px] w-full resize-y rounded-[14px] border border-[#d8dce2] bg-white px-4 py-3 text-[0.95rem] text-[#101418] outline-none transition focus:border-[#101010]"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[0.84rem] text-[#6b7280]">
                New comments are submitted for moderation first.
              </p>
              <button
                type="button"
                onClick={() => {
                  void submitComment();
                }}
                disabled={submitting}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#111111] px-5 text-[0.92rem] text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? 'Submitting…' : 'Submit comment'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[0.94rem] text-[#4b5563]">Sign in to write a comment.</p>
            <button
              type="button"
              onClick={() => redirectToSignIn()}
              className="inline-flex h-10 items-center justify-center rounded-full bg-[#111111] px-5 text-[0.92rem] text-white transition-colors hover:bg-black"
            >
              Sign in
            </button>
          </div>
        )}

        {feedback ? <p className="mt-3 text-[0.85rem] text-[#4b5563]">{feedback}</p> : null}
      </div>

      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="rounded-[18px] border border-[#e6e9f2] bg-white px-5 py-4 text-[0.92rem] text-[#6b7280]">
            Loading comments…
          </div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="rounded-[20px] border border-[#e6e9f2] bg-[#f7f8fb] p-5 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <AuthorAvatar
                  name={comment.author?.name ?? 'Anonymous'}
                  avatarUrl={comment.author?.avatarUrl ?? null}
                  avatarUpdatedAt={comment.author?.avatarUpdatedAt ?? null}
                  className="h-11 w-11"
                  initialClassName="text-[0.78rem]"
                />
                <div>
                  {comment.author?.slug ? (
                    <Link
                      href={`/author/${comment.author.slug}`}
                      className="text-[0.94rem] font-medium text-[#0f1118] transition-colors hover:text-[#374151]"
                    >
                      {comment.author.name}
                    </Link>
                  ) : (
                    <p className="text-[0.94rem] font-medium text-[#0f1118]">
                      {comment.author?.name ?? 'Anonymous'}
                    </p>
                  )}
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <p className="text-[0.82rem] text-[#6b7280]">
                      {formatCommentDate(comment.createdAt)}
                    </p>
                    {comment.status === 'PENDING' ? (
                      <span className="inline-flex rounded-full bg-[#fff4d8] px-2 py-0.5 text-[0.72rem] font-medium text-[#8a6b1f]">
                        Pending review
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <p className="mt-3 whitespace-pre-line text-[0.98rem] leading-[1.75] text-[#1f2937]">
                {comment.content}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3 text-[0.95rem]">
                {comment.status === 'APPROVED' ? (
                  <>
                    <span className="text-[#c7ced8]">/</span>
                    {isAuthenticated ? (
                      <button
                        type="button"
                        onClick={() => {
                          setOpenReplyFor((current) =>
                            current === comment.id ? null : comment.id,
                          );
                        }}
                        className="inline-flex items-center gap-1.5 text-[#4b5563] transition-colors hover:text-[#111827]"
                      >
                        <FaReply className="h-3.5 w-3.5" />
                        Reply
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => redirectToSignIn()}
                        className="text-[#4b5563] transition-colors hover:text-[#111827]"
                      >
                        Log in to Reply
                      </button>
                    )}
                    <span className="text-[#c7ced8]">/</span>
                    <button
                      type="button"
                      onClick={() => {
                        void likeComment(comment.id);
                      }}
                      disabled={Boolean(likePendingByCommentId[comment.id])}
                      aria-pressed={comment.likedByViewer}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                        comment.likedByViewer
                          ? 'bg-[#fce8ed] text-[#dc4b74]'
                          : 'bg-[#eef1f5] text-[#6b7280] hover:text-[#111827]'
                      }`}
                    >
                      {comment.likedByViewer ? (
                        <FaHeart className="h-4 w-4" />
                      ) : (
                        <FaRegHeart className="h-4 w-4" />
                      )}
                    </button>
                    <span className="text-[1rem] text-[#111827]">{comment.likeCount}</span>
                  </>
                ) : (
                  <span className="inline-flex rounded-full bg-[#fff4d8] px-3 py-1 text-[0.78rem] font-medium text-[#8a6b1f]">
                    Pending review
                  </span>
                )}
              </div>

              {openReplyFor === comment.id && isAuthenticated && comment.status === 'APPROVED' ? (
                <div className="mt-4 rounded-[14px] border border-[#e1e6ef] bg-white p-4">
                  <textarea
                    value={replyDrafts[comment.id] ?? ''}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setReplyDrafts((prev) => ({
                        ...prev,
                        [comment.id]: nextValue,
                      }));
                    }}
                    placeholder="Write your reply."
                    className="min-h-[96px] w-full resize-y rounded-[12px] border border-[#d8dce2] bg-white px-3 py-2 text-[0.92rem] text-[#101418] outline-none transition focus:border-[#101010]"
                  />
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setOpenReplyFor(null)}
                      className="inline-flex h-9 items-center justify-center rounded-full border border-[#d8dce2] bg-white px-4 text-[0.85rem] text-[#101010] transition-colors hover:border-[#101010]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void submitReply(comment.id);
                      }}
                      disabled={replySubmittingFor === comment.id}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-[#111111] px-4 text-[0.85rem] text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {replySubmittingFor === comment.id ? 'Submitting…' : 'Submit reply'}
                    </button>
                  </div>
                </div>
              ) : null}

              {comment.replies.length > 0 ? (
                <div className="mt-5 border-l border-[#e1e6ef] pl-4 sm:pl-5">
                  <div className="space-y-3">
                    {comment.replies.map((reply) => (
                      <article
                        key={reply.id}
                        className="rounded-[16px] border border-[#e6e9f2] bg-white p-4"
                      >
                        <div className="flex items-center gap-3">
                          <AuthorAvatar
                            name={reply.author?.name ?? 'Anonymous'}
                            avatarUrl={reply.author?.avatarUrl ?? null}
                            avatarUpdatedAt={reply.author?.avatarUpdatedAt ?? null}
                            className="h-9 w-9"
                            initialClassName="text-[0.72rem]"
                          />
                          <div>
                            {reply.author?.slug ? (
                              <Link
                                href={`/author/${reply.author.slug}`}
                                className="text-[0.9rem] font-medium text-[#0f1118] transition-colors hover:text-[#374151]"
                              >
                                {reply.author.name}
                              </Link>
                            ) : (
                              <p className="text-[0.9rem] font-medium text-[#0f1118]">
                                {reply.author?.name ?? 'Anonymous'}
                              </p>
                            )}
                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                              <p className="text-[0.8rem] text-[#6b7280]">
                                {formatCommentDate(reply.createdAt)}
                              </p>
                              {reply.status === 'PENDING' ? (
                                <span className="inline-flex rounded-full bg-[#fff4d8] px-2 py-0.5 text-[0.7rem] font-medium text-[#8a6b1f]">
                                  Pending review
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <p className="mt-2 whitespace-pre-line text-[0.93rem] leading-[1.7] text-[#1f2937]">
                          {reply.content}
                        </p>

                        <div className="mt-3 flex items-center gap-3 text-[0.94rem]">
                          {reply.status === 'APPROVED' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  void likeComment(reply.id);
                                }}
                                disabled={Boolean(likePendingByCommentId[reply.id])}
                                aria-pressed={reply.likedByViewer}
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                                  reply.likedByViewer
                                    ? 'bg-[#fce8ed] text-[#dc4b74]'
                                    : 'bg-[#eef1f5] text-[#6b7280] hover:text-[#111827]'
                                }`}
                              >
                                {reply.likedByViewer ? (
                                  <FaHeart className="h-3.5 w-3.5" />
                                ) : (
                                  <FaRegHeart className="h-3.5 w-3.5" />
                                )}
                              </button>
                              <span className="text-[#111827]">{reply.likeCount}</span>
                            </>
                          ) : (
                            <span className="inline-flex rounded-full bg-[#fff4d8] px-3 py-1 text-[0.74rem] font-medium text-[#8a6b1f]">
                              Pending review
                            </span>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="rounded-[18px] border border-[#e6e9f2] bg-white px-5 py-4 text-[0.92rem] text-[#6b7280]">
            No approved comments yet.
          </div>
        )}
      </div>
    </section>
  );
}
