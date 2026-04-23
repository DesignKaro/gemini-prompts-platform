'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  AuthorApiError,
  fetchAuthorFollowStatus,
  followAuthor as requestFollowAuthor,
  unfollowAuthor as requestUnfollowAuthor,
} from '../../lib/author-follow';
import { redirectToSignInModal } from '../../lib/utils/auth-redirect';
import { refreshSession } from '../../lib/utils/session';
import { LoadingButton } from './ui/loading-button';

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
    redirectToSignInModal();
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
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <span className="whitespace-nowrap rounded-full bg-[#f2f4f8] px-3 py-1.5 text-[0.78rem] text-[#606874] sm:px-4 sm:py-2 sm:text-[0.82rem]">
        {followerCount} follower{followerCount === 1 ? '' : 's'}
      </span>
      <LoadingButton
        type="button"
        onClick={() => {
          void toggleFollow();
        }}
        pending={pending && !isOwnProfile}
        pendingLabel={following ? 'Following...' : 'Follow...'}
        spinnerSize="xs"
        disabled={isOwnProfile}
        className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[0.8rem] font-medium transition-colors sm:px-5 sm:py-2 sm:text-[0.86rem] ${
          isOwnProfile
            ? 'cursor-default bg-[#eef2f6] text-[#8b93a3]'
            : following
              ? 'bg-[#111111] text-white hover:bg-[#222222]'
              : 'bg-[#d5ea52] text-black hover:bg-[#c7dc43]'
        }`}
      >
        {isOwnProfile ? 'Your profile' : statusReady && following ? 'Following' : 'Follow'}
      </LoadingButton>
    </div>
  );
}
