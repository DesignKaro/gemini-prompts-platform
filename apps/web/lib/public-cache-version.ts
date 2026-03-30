let publicCacheVersion = `${Date.now()}`;

export function getPublicCacheVersion() {
  return publicCacheVersion;
}

export function bumpPublicCacheVersion() {
  publicCacheVersion = `${Date.now()}`;
  return publicCacheVersion;
}
