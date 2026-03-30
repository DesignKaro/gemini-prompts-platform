'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirectToSignInModal } from '../../../lib/utils/auth-redirect';
import { refreshSession } from '../../../lib/utils/session';
import {
  PromptApiError,
  fetchPromptInteractionStatus,
  likePrompt as requestLikePrompt,
  savePrompt as requestSavePrompt,
  unsavePrompt as requestUnsavePrompt,
} from '../../../lib/prompt-interactions';

type InteractionState = {
  likedByIp: boolean;
  savedByUser: boolean;
};

type UsePromptInteractionsOptions = {
  promptId: string;
  initialLikeCount: number;
  initialSaveCount: number;
  initialCommentCount: number;
  syncStatus?: boolean;
  syncAnonymousStatus?: boolean;
};

const FALLBACK_STATUS: InteractionState = {
  likedByIp: false,
  savedByUser: false,
};

const statusCache = new Map<string, Map<string, InteractionState>>();
const queuedPromptIds = new Map<string, Set<string>>();
const queuedResolvers = new Map<string, Map<string, Array<(status: InteractionState) => void>>>();
const queuedTimers = new Map<string, ReturnType<typeof setTimeout>>();
const queuedTokens = new Map<string, string | null>();

function getStatusCacheForKey(authKey: string) {
  let cache = statusCache.get(authKey);
  if (!cache) {
    cache = new Map<string, InteractionState>();
    statusCache.set(authKey, cache);
  }
  return cache;
}

function setCachedStatus(authKey: string, promptId: string, status: InteractionState) {
  getStatusCacheForKey(authKey).set(promptId, status);
}

function getCachedStatus(authKey: string, promptId: string) {
  return statusCache.get(authKey)?.get(promptId) ?? null;
}

async function flushStatusQueue(authKey: string) {
  queuedTimers.delete(authKey);

  const promptIdSet = queuedPromptIds.get(authKey);
  if (!promptIdSet || promptIdSet.size === 0) {
    return;
  }

  const promptIds = Array.from(promptIdSet);
  queuedPromptIds.delete(authKey);
  const resolverMap =
    queuedResolvers.get(authKey) ?? new Map<string, Array<(status: InteractionState) => void>>();
  const accessToken = queuedTokens.get(authKey) ?? null;

  let statusMap = new Map<string, InteractionState>();
  try {
    const response = await fetchPromptInteractionStatus({ promptIds }, accessToken);
    statusMap = new Map(
      response.items.map((item) => [
        item.promptId,
        {
          likedByIp: item.likedByIp,
          savedByUser: item.savedByUser,
        },
      ]),
    );
  } catch {
    statusMap = new Map<string, InteractionState>();
  }

  for (const promptId of promptIds) {
    const status = statusMap.get(promptId) ?? FALLBACK_STATUS;
    setCachedStatus(authKey, promptId, status);
    const resolvers = resolverMap.get(promptId) ?? [];
    resolverMap.delete(promptId);
    resolvers.forEach((resolve) => resolve(status));
  }

  if (resolverMap.size === 0) {
    queuedResolvers.delete(authKey);
  } else {
    queuedResolvers.set(authKey, resolverMap);
  }
}

function queueStatusFetch(authKey: string, promptId: string, accessToken: string | null) {
  const cached = getCachedStatus(authKey, promptId);
  if (cached) {
    return Promise.resolve(cached);
  }

  queuedTokens.set(authKey, accessToken);

  let ids = queuedPromptIds.get(authKey);
  if (!ids) {
    ids = new Set<string>();
    queuedPromptIds.set(authKey, ids);
  }
  ids.add(promptId);

  let resolverMap = queuedResolvers.get(authKey);
  if (!resolverMap) {
    resolverMap = new Map<string, Array<(status: InteractionState) => void>>();
    queuedResolvers.set(authKey, resolverMap);
  }

  return new Promise<InteractionState>((resolve) => {
    const resolvers = resolverMap?.get(promptId) ?? [];
    resolvers.push(resolve);
    resolverMap?.set(promptId, resolvers);

    if (!queuedTimers.has(authKey)) {
      const timer = setTimeout(() => {
        void flushStatusQueue(authKey);
      }, 12);
      queuedTimers.set(authKey, timer);
    }
  });
}

function isAccessTokenExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;
  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) return false;
  return expiresAtMs <= Date.now() + 60_000;
}

export function usePromptInteractions({
  promptId,
  initialLikeCount,
  initialSaveCount,
  initialCommentCount,
  syncStatus = true,
  syncAnonymousStatus = false,
}: UsePromptInteractionsOptions) {
  const { data: session, status: sessionStatus, update } = useSession();
  const [likedByIp, setLikedByIp] = useState(false);
  const [savedByUser, setSavedByUser] = useState(false);
  const [statusReady, setStatusReady] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [saveCount, setSaveCount] = useState(initialSaveCount);
  const [likePending, setLikePending] = useState(false);
  const [savePending, setSavePending] = useState(false);
  const hasAccessToken = Boolean(session?.apiAccessToken);
  const sessionRef = useRef(session);
  const sessionStatusRef = useRef(sessionStatus);
  const updateRef = useRef(update);

  useEffect(() => {
    sessionRef.current = session;
    sessionStatusRef.current = sessionStatus;
    updateRef.current = update;
  }, [session, sessionStatus, update]);

  const authKey = useMemo(
    () =>
      sessionStatus === 'authenticated'
        ? `auth:${session?.user?.id || session?.user?.email || 'user'}:${hasAccessToken ? 'token' : 'notoken'}`
        : 'anonymous',
    [hasAccessToken, session?.user?.email, session?.user?.id, sessionStatus],
  );

  useEffect(() => {
    setLikeCount(initialLikeCount);
    setSaveCount(initialSaveCount);
  }, [initialLikeCount, initialSaveCount, promptId]);

  useEffect(() => {
    if (!syncStatus) {
      setStatusReady(true);
      return;
    }

    if (sessionStatus !== 'authenticated' && !syncAnonymousStatus) {
      setLikedByIp(false);
      setSavedByUser(false);
      setStatusReady(true);
      return;
    }

    if (sessionStatus === 'loading') {
      setStatusReady(false);
      return;
    }

    let isCancelled = false;
    setStatusReady(false);

    void queueStatusFetch(
      authKey,
      promptId,
      sessionStatus === 'authenticated' ? (session?.apiAccessToken ?? null) : null,
    ).then((status) => {
      if (isCancelled) return;
      setLikedByIp(status.likedByIp);
      setSavedByUser(status.savedByUser);
      setStatusReady(true);
    });

    return () => {
      isCancelled = true;
    };
  }, [authKey, promptId, session?.apiAccessToken, sessionStatus, syncAnonymousStatus, syncStatus]);

  const redirectToSignIn = useCallback(() => {
    redirectToSignInModal();
  }, []);

  const getAccessToken = useCallback(async (required: boolean) => {
    const currentSessionStatus = sessionStatusRef.current;
    if (currentSessionStatus !== 'authenticated') {
      return null;
    }

    const currentSession = sessionRef.current;
    let accessToken = currentSession?.apiAccessToken ?? null;

    if (accessToken && !isAccessTokenExpired(currentSession?.apiAccessTokenExpiresAt)) {
      return accessToken;
    }

    const shouldAttemptRefresh = Boolean(
      accessToken || currentSession?.apiAccessTokenExpiresAt || required,
    );

    if (updateRef.current && shouldAttemptRefresh) {
      const refreshed = await refreshSession(updateRef.current).catch(() => null);
      accessToken = refreshed?.apiAccessToken ?? null;
      if (accessToken) {
        return accessToken;
      }
    }

    if (required) {
      return null;
    }

    return accessToken;
  }, []);

  const getRequiredAccessToken = useCallback(async () => {
    if (sessionStatus !== 'authenticated') {
      redirectToSignIn();
      return null;
    }

    const accessToken = await getAccessToken(true);
    if (!accessToken) {
      redirectToSignIn();
      return null;
    }

    return accessToken;
  }, [getAccessToken, redirectToSignIn, sessionStatus]);

  const getOptionalAccessToken = useCallback(async () => {
    return getAccessToken(false);
  }, [getAccessToken]);

  const likePrompt = useCallback(async () => {
    if (likePending || likedByIp) {
      return;
    }

    const previousLiked = likedByIp;
    const previousLikeCount = likeCount;

    setLikePending(true);
    setLikedByIp(true);
    setLikeCount((count) => count + 1);

    try {
      const accessToken = await getAccessToken(false);
      const response = await requestLikePrompt(promptId, accessToken);
      setLikedByIp(true);
      setLikeCount(response.likeCount);
      setCachedStatus(authKey, promptId, {
        likedByIp: true,
        savedByUser,
      });
    } catch {
      setLikedByIp(previousLiked);
      setLikeCount(previousLikeCount);
    } finally {
      setLikePending(false);
    }
  }, [authKey, getAccessToken, likeCount, likePending, likedByIp, promptId, savedByUser]);

  const toggleSavePrompt = useCallback(async () => {
    if (savePending) {
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

    const nextSaved = !savedByUser;
    const previousSaved = savedByUser;
    const previousSaveCount = saveCount;

    setSavePending(true);
    setSavedByUser(nextSaved);
    setSaveCount((count) => Math.max(0, count + (nextSaved ? 1 : -1)));

    try {
      const response = nextSaved
        ? await requestSavePrompt(promptId, accessToken)
        : await requestUnsavePrompt(promptId, accessToken);

      setSavedByUser(response.saved);
      setSaveCount(response.saveCount);
      setCachedStatus(authKey, promptId, {
        likedByIp,
        savedByUser: response.saved,
      });
    } catch (error) {
      if (error instanceof PromptApiError && error.status === 401) {
        redirectToSignIn();
      }

      setSavedByUser(previousSaved);
      setSaveCount(previousSaveCount);
    } finally {
      setSavePending(false);
    }
  }, [
    authKey,
    getAccessToken,
    likedByIp,
    promptId,
    redirectToSignIn,
    saveCount,
    savePending,
    savedByUser,
    sessionStatus,
  ]);

  return {
    likeCount,
    saveCount,
    commentCount: initialCommentCount,
    likedByIp,
    savedByUser,
    statusReady,
    likePending,
    savePending,
    isAuthenticated: sessionStatus === 'authenticated',
    likePrompt,
    toggleSavePrompt,
    redirectToSignIn,
    getRequiredAccessToken,
    getOptionalAccessToken,
  };
}
