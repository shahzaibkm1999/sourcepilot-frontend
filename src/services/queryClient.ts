import { QueryClient } from '@tanstack/react-query';

/**
 * QueryClient
 * -----------
 * One client for the whole app, instantiated once at module load
 * and provided via `<QueryClientProvider>` in `App.tsx`.
 *
 * Defaults are tuned for the projects list:
 *   - `staleTime: 60s`  — once the list is fetched, treat it as fresh
 *     for a minute. Navigating away and back shows the cached data
 *     instantly; a background refetch happens in the first 60s only.
 *   - `refetchOnWindowFocus: true` — the list stays current when the
 *     user tabs back to the app (e.g. after editing in another tab).
 *   - `retry: 1` — one retry on transient network errors. We don't
 *     want to hammer a failing endpoint, but a single blip should
 *     self-heal.
 *
 * Other parts of the app (ProjectDetailPage) still use plain
 * `useEffect` + `useState` polling — TanStack Query is wired in
 * only where cache + dedup add real value, per the
 * minimal-surface-area rule in the project constitution.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
});
