export function buildShareUrl(
  encodedPayload: string,
  origin = window.location.origin,
  basePath = import.meta.env.BASE_URL,
): string {
  const normalizedBase = normalizeBasePath(basePath);
  return `${origin}${normalizedBase}#/${encodedPayload}`;
}

export function normalizeBasePath(basePath: string): string {
  if (!basePath || basePath === ".") {
    return "/";
  }

  const withLeadingSlash = basePath.startsWith("/") ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}
