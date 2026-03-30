type RedirectEligibilityOptions = {
  pathname: string;
};

export function shouldCheckManagedRedirect(options: RedirectEligibilityOptions): boolean {
  const { pathname } = options;
  return (
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/_next') &&
    !pathname.startsWith('/dashboard') &&
    !pathname.includes('.')
  );
}

export function isSameManagedRedirectTarget(options: {
  currentOrigin: string;
  currentPathname: string;
  currentSearch: string;
  destinationUrl: URL;
}): boolean {
  const currentPath = `${options.currentPathname}${options.currentSearch}`;
  const destinationPath = `${options.destinationUrl.pathname}${options.destinationUrl.search}`;

  return options.destinationUrl.origin === options.currentOrigin && destinationPath === currentPath;
}
