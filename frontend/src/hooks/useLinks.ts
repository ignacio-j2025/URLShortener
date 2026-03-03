import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client.js';
import type { CreateLinkRequest } from '../types/index.js';

export function useLinks(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['links', page, limit],
    queryFn: () => api.links.list(page, limit),
  });
}

export function useCreateLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLinkRequest) => api.links.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}

export function useDeleteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => api.links.remove(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });
}
