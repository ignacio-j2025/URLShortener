import type { Link, PaginatedLinks, AnalyticsData, CreateLinkRequest, ApiError } from '../types/index.js';

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string | Record<string, string[]>
  ) {
    super(typeof message === 'string' ? message : JSON.stringify(message));
    this.name = 'ApiRequestError';
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const body = await res.json();
  if (!body.success) {
    const err = body.error as ApiError;
    throw new ApiRequestError(err.code, err.message);
  }
  return body.data as T;
}

export const api = {
  links: {
    list(page = 1, limit = 20): Promise<PaginatedLinks> {
      return apiFetch(`/api/v1/links?page=${page}&limit=${limit}`);
    },
    create(data: CreateLinkRequest): Promise<Link> {
      return apiFetch('/api/v1/links', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    remove(slug: string): Promise<{ deleted: boolean }> {
      return apiFetch(`/api/v1/links/${slug}`, { method: 'DELETE' });
    },
  },
  analytics: {
    get(slug: string, from?: string, to?: string): Promise<AnalyticsData> {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const qs = params.toString();
      return apiFetch(`/api/v1/links/${slug}/analytics${qs ? `?${qs}` : ''}`);
    },
  },
};
