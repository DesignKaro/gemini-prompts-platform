'use client';

import { useCallback, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import {
  AuthorApiError,
  fetchAuthorFollowStatus,
  followAuthor as requestFollowAuthor,
  unfollowAuthor as requestUnfollowAuthor,
} from '../../../lib/author-follow';
import { refreshSession } from '../../../lib/utils/session';

type AuthorFollowButtonProps = {
  authorId: string;
  initialFollowerCount: number;
};

function isAccessTokenExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) return false;
  return expiresAtMs <= Date.now() + 60_000;
}

export function AuthorFollowButton({ authorId, initialFollowerCount }: AuthorFollowButtonProps) {
  const { data: session, status: sessionStatus, update } = useSession();
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [pending, setPending] = useState(false);
  const [statusReady, setStatusReady] = useState(false);

  const isOwnProfile = Boolean(session?.user?.id && session.user.id === authorId);

  useEffect(() => {
    setFollowerCount(initialFollowerCount);
  }, [authorId, initialFollowerCount]);

  const redirectToSignIn = useCallback(() => {
    const callbackUrl = typeof window !== 'undefined' ? window.location.href : '/';
    void signIn(undefined, { callbackUrl });
  }, []);

  const getAccessToken = useCallback(
    async (required: boolean) => {
      let accessToken = session?.apiAccessToken ?? null;

      if (accessToken && !isAccessTokenExpired(session?.apiAccessTokenExpiresAt)) {
        return accessToken;
      }

      if (update) {
        const refreshed = await refreshSession(update).catch(() => null);
        accessToken = refreshed?.apiAccessToken ?? null;
        if (accessToken) {
          return accessToken;
        }
      }

      if (required) {
        return null;
      }

      return accessToken;
    },
    [session?.apiAccessToken, session?.apiAccessTokenExpiresAt, update],
  );

  useEffect(() => {
    if (sessionStatus !== 'authenticated') {
      setFollowing(false);
      setStatusReady(true);
      return;
    }

    if (isOwnProfile) {
      setFollowing(false);
      setStatusReady(true);
      return;
    }

    let isCancelled = false;
    setStatusReady(false);

    void (async () => {
      const accessToken = await getAccessToken(true);
      if (!accessToken) {
        if (!isCancelled) {
          setFollowing(false);
          setStatusReady(true);
        }
        return;
      }

      try {
        const response = await fetchAuthorFollowStatus(authorId, accessToken);
        if (isCancelled) return;
        setFollowing(response.following);
        setFollowerCount(response.followerCount);
      } catch {
        if (isCancelled) return;
        setFollowing(false);
      } finally {
        if (!isCancelled) {
          setStatusReady(true);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [authorId, getAccessToken, isOwnProfile, sessionStatus]);

  const toggleFollow = useCallback(async () => {
    if (pending || isOwnProfile) {
      return;
    }

    if (sessionStatus !== 'authenticated') {
      redirectToSignIn();
      return;
    }

    const accessToken = await getAccessToken(true);
    if (!accessToken) {
      redirectToSignIn();
      return;
    }

    const nextFollowing = !following;
    const previousFollowing = following;
    const previousFollowerCount = followerCount;

    setPending(true);
    setFollowing(nextFollowing);
    setFollowerCount((count) => Math.max(0, count + (nextFollowing ? 1 : -1)));

    try {
      const response = nextFollowing
        ? await requestFollowAuthor(authorId, accessToken)
        : await requestUnfollowAuthor(authorId, accessToken);

      setFollowing(response.following);
      setFollowerCount(response.followerCount);
    } catch (error) {
      if (error instanceof AuthorApiError && error.status === 401) {
        redirectToSignIn();
      }

      setFollowing(previousFollowing);
      setFollowerCount(previousFollowerCount);
    } finally {
      setPending(false);
    }
  }, [
    authorId,
    followerCount,
    following,
    getAccessToken,
    isOwnProfile,
    pending,
    redirectToSignIn,
    sessionStatus,
  ]);

  return (
    <div className="flex items-center gap-3">
      <span className="rounded-full bg-[#f2f4f8] px-4 py-2 text-[0.82rem] text-[#606874]">
        {followerCount} follower{followerCount === 1 ? '' : 's'}
      </span>
      <button
        type="button"
        onClick={() => {
          void toggleFollow();
        }}
        disabled={pending || isOwnProfile}
        className={`rounded-full px-5 py-2 text-[0.86rem] font-medium transition-colors ${
          isOwnProfile
            ? 'cursor-default bg-[#eef2f6] text-[#8b93a3]'
            : following
              ? 'bg-[#111111] text-white hover:bg-[#222222]'
              : 'bg-[#d5ea52] text-black hover:bg-[#c7dc43]'
        }`}
      >
        {isOwnProfile
          ? 'Your profile'
          : pending
            ? following
              ? 'Following...'
              : 'Follow...'
            : statusReady && following
              ? 'Following'
              : 'Follow'}
      </button>
    </div>
  );
}
