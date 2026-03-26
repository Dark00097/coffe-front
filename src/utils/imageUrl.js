export function appendImageQuery(url, query) {
  if (!url) return url;

  const [base, hash = ''] = url.split('#');
  const separator = base.includes('?') ? '&' : '?';

  return `${base}${separator}${query}${hash ? `#${hash}` : ''}`;
}
