import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { Project } from '../types';
import { api, PAGE_SIZE } from './api';

/**
 * useProjects
 * -----------
 * TanStack Query bindings for the projects list. One infinite query,
 * keyed under `['projects', 'list']`. Cache invalidation is a single
 * `queryClient.invalidateQueries({ queryKey: ['projects'] })` call
 * from any mutation that touches the list (create / update / delete).
 *
 * The page size is sourced from `api.PAGE_SIZE` (which the backend
 * also uses as its default) so the "Load more" button and the cache
 * stay in sync.
 */
export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
};

type ListPage = Awaited<ReturnType<typeof api.listProjects>>;

/**
 * Infinite list query. Each page is one `{ projects, total, hasMore }`
 * response. `useInfiniteQuery` handles the "Load more" append,
 * dedup, and cache for us.
 */
export function useProjectsInfinite() {
  return useInfiniteQuery<
    ListPage,
    Error,
    InfiniteData<ListPage, number>,
    ReturnType<typeof projectKeys.list>,
    number
  >({
    queryKey: projectKeys.list(),
    queryFn: ({ pageParam = 0 }) =>
      api.listProjects({ limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      // Stop when the server says there's no more, or when a page came
      // back empty (avoids infinite loops if the server and client
      // disagree on `hasMore` — the empty-page guard from the old
      // hand-rolled list).
      lastPage.hasMore && lastPage.projects.length > 0
        ? lastPage.projects.length
        : undefined,
  });
}

/**
 * Invalidate the projects list cache. Call this from any mutation
 * that changes the list (create / update / delete). The list view
 * will refetch in the background and swap in fresh data.
 */
export function useInvalidateProjectsList() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: projectKeys.list() });
}

/**
 * Flatten an infinite-query result into a single `Project[]` for
 * rendering. Also returns the total count from the first page (the
 * server returns the same `total` on every page; the first one is
 * good enough for the "showing N of M" header).
 */
export function flattenProjects(
  data: InfiniteData<ListPage, number> | undefined,
): { projects: Project[]; total: number } {
  if (!data) return { projects: [], total: 0 };
  const pages = data.pages;
  const total = pages[0]?.total ?? 0;
  return {
    projects: pages.flatMap((p) => p.projects),
    total,
  };
}
