import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client.js';

export function useAnalytics(slug: string, from?: string, to?: string) {
  return useQuery({
    queryKey: ['analytics', slug, from, to],
    queryFn: () => api.analytics.get(slug, from, to),
    enabled: Boolean(slug),
  });
}
