'use client';

import { useEffect, useMemo, useState } from 'react';
import { buildAvatarSrc, getInitial, normalizeAvatarUrl } from '../../lib/utils/avatar';

type AuthorAvatarProps = {
  name?: string | null;
  avatarUrl?: string | null;
  avatarUpdatedAt?: string | null;
  className?: string;
  imageClassName?: string;
  initialClassName?: string;
  alt?: string;
};

export function AuthorAvatar({
  name,
  avatarUrl,
  avatarUpdatedAt,
  className = '',
  imageClassName = '',
  initialClassName = '',
  alt,
}: AuthorAvatarProps) {
  const normalizedBaseSrc = useMemo(() => normalizeAvatarUrl(avatarUrl), [avatarUrl]);
  const imageSrc = useMemo(
    () => buildAvatarSrc(avatarUrl, avatarUpdatedAt),
    [avatarUpdatedAt, avatarUrl],
  );
  const [resolvedSrc, setResolvedSrc] = useState(imageSrc);
  const [hasError, setHasError] = useState(false);
  const [didRetryWithoutVersion, setDidRetryWithoutVersion] = useState(false);

  useEffect(() => {
    setResolvedSrc(imageSrc);
    setHasError(false);
    setDidRetryWithoutVersion(false);
  }, [imageSrc]);

  const fallbackLabel = alt || `${name || 'Author'} profile`;

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-[#eef2f6] ${className}`.trim()}
    >
      {resolvedSrc && !hasError ? (
        <img
          src={resolvedSrc}
          alt={fallbackLabel}
          className={`h-full w-full object-cover ${imageClassName}`.trim()}
          referrerPolicy="no-referrer"
          decoding="async"
          onError={() => {
            if (!didRetryWithoutVersion && normalizedBaseSrc && resolvedSrc !== normalizedBaseSrc) {
              setDidRetryWithoutVersion(true);
              setResolvedSrc(normalizedBaseSrc);
              return;
            }
            setHasError(true);
          }}
        />
      ) : (
        <span
          role="img"
          aria-label={fallbackLabel}
          className={`flex h-full w-full items-center justify-center text-[0.78rem] font-medium text-[#4f5a68] ${initialClassName}`.trim()}
        >
          {getInitial(name)}
        </span>
      )}
    </span>
  );
}
