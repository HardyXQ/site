import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';
import * as api from './api';
import type { ServiceFilters } from './api';
import type { Category, ServiceWithRelations } from './types';

export const qk = {
  categories: ['categories'] as const,
  services: (filters?: ServiceFilters) => ['services', filters ?? {}] as const,
  service: (id: string) => ['service', id] as const,
  dashboard: ['dashboard'] as const,
  recent: ['recent-services'] as const,
};

export function useCategories(opts?: Partial<UseQueryOptions<Category[]>>) {
  return useQuery({
    queryKey: qk.categories,
    queryFn: () => api.listCategories(true),
    ...opts,
  });
}

export function useServices(filters: ServiceFilters) {
  return useQuery({
    queryKey: qk.services(filters),
    queryFn: () => api.listServices(filters),
    placeholderData: (prev) => prev,
  });
}

export function useService(id: string | undefined) {
  return useQuery({
    queryKey: qk.service(id ?? 'none'),
    queryFn: () => api.getService(id!),
    enabled: Boolean(id),
  });
}

export function useDashboardStats() {
  return useQuery({ queryKey: qk.dashboard, queryFn: api.getDashboardStats });
}

export function useRecentServices() {
  return useQuery({ queryKey: qk.recent, queryFn: () => api.getRecentServices(6) });
}

/** Invalidate everything that can change when services/categories are mutated. */
export function useInvalidateAll() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ['services'] });
    qc.invalidateQueries({ queryKey: ['service'] });
    qc.invalidateQueries({ queryKey: qk.categories });
    qc.invalidateQueries({ queryKey: qk.dashboard });
    qc.invalidateQueries({ queryKey: qk.recent });
  };
}

export function useSetServicePublished() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: ({ id, isPublished }: { id: string; isPublished: boolean }) =>
      api.setServicePublished(id, isPublished),
    onSuccess: invalidate,
  });
}

export function useDeleteService() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => api.deleteService(id),
    onSuccess: invalidate,
  });
}

export function useDuplicateService() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (id: string) => api.duplicateService(id),
    onSuccess: invalidate,
  });
}

export function useReorderServices() {
  const invalidate = useInvalidateAll();
  return useMutation({
    mutationFn: (ids: string[]) => api.reorderServices(ids),
    onSuccess: invalidate,
  });
}

export type { ServiceWithRelations };
