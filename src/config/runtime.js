const envApiUrl = String(import.meta.env.VITE_API_URL || '').trim();

const removeTrailingSlash = (value) => value.replace(/\/+$/, '');

export const API_ORIGIN = envApiUrl
  ? removeTrailingSlash(envApiUrl)
  : window.location.origin;

export const toAbsoluteUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return `${API_ORIGIN}${normalizedPath}`;
};
