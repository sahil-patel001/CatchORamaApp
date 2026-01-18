import { API_ORIGIN } from './api';

const isHttpUrl = (value: string) => /^https?:\/\//i.test(value);
const isFileUrl = (value: string) => /^file:\/\//i.test(value);
const isDataUrl = (value: string) => /^data:/i.test(value);
const isBlobUrl = (value: string) => /^blob:/i.test(value);

/**
 * Convert API-returned image paths into device-loadable URIs.
 *
 * Backend often returns:
 * - Absolute: `https://.../uploads/x.jpg` (no change)
 * - Relative: `/uploads/x.jpg` (prefix with API origin)
 * - Filename-ish: `uploads/x.jpg` (prefix with API origin + `/`)
 */
export const resolveImageUrl = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (isDataUrl(trimmed) || isBlobUrl(trimmed)) return trimmed;
  if (isHttpUrl(trimmed) || isFileUrl(trimmed)) return trimmed;

  // Handle "/uploads/..." or any absolute path from the API.
  if (trimmed.startsWith('/')) return `${API_ORIGIN}${trimmed}`;

  // Handle "uploads/..." or "images/..."
  return `${API_ORIGIN}/${trimmed}`;
};

