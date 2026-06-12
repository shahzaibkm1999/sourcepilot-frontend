import { useEffect } from 'react';
import ProjectCard from './ProjectCard';
import EmptyState from '../ui/EmptyState';
import {
  useProjectsInfinite,
  flattenProjects,
  useInvalidateProjectsList,
} from '../../services/useProjects';
import '../../styles/project-list.css';

interface ProjectListProps {
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
}

/**
 * ProjectList
 * -----------
 * The Projects page's main list, powered by TanStack Query.
 *
 * What we get from `useInfiniteQuery`:
 *   - Stale-while-revalidate: the list shows cached data instantly on
 *     remount (e.g. after creating a project and navigating back), and
 *     refetches in the background if the cache is older than `staleTime`.
 *   - Dedup: two simultaneous mounts share one in-flight request.
 *   - `Load more` is just `fetchNextPage()` — no manual offset state.
 *   - Refetch on window focus: list stays current across tabs.
 *
 * What this component still owns:
 *   - The empty / loading / error UI.
 *   - The "§ I — Your projects" section header.
 *   - The "showing N of M" count.
 *
 * The detail page deliberately does NOT use TanStack Query — it polls
 * `GET /api/projects/:id` for `pending` documents, which is a
 * different concern (state machine, not list-of-things). Mixing the
 * two would make the polling harder to reason about for no gain.
 */
export default function ProjectList({ onSelectProject, onNewProject }: ProjectListProps) {
  const {
    data,
    isPending,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    refetch,
  } = useProjectsInfinite();

  /**
   * When the user returns from the create page, the list may be stale
   * (the new project isn't in the cache yet). A focused refetch is
   * what we want — it doesn't block the cached data, just runs in
   * the background and swaps in the new row when it lands.
   */
  const invalidateList = useInvalidateProjectsList();
  useEffect(() => {
    // On every mount, mark the list as potentially stale. The query
    // client decides whether to refetch based on staleTime + focus.
    invalidateList();
  }, [invalidateList]);

  const { projects, total } = flattenProjects(data);

  if (isPending) {
    return (
      <div className="project-list">
        <header className="project-list-internal-header">
          <div>
            <div className="project-list-internal-title">§ I — Your projects</div>
          </div>
        </header>
        <p className="project-list-status muted">Loading projects…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="project-list">
        <header className="project-list-internal-header">
          <div>
            <div className="project-list-internal-title">§ I — Your projects</div>
          </div>
        </header>
        <p className="project-list-error">
          ⚠ {error instanceof Error ? error.message : 'Failed to load projects'}
        </p>
        <div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              void refetch();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="project-list">
        <header className="project-list-internal-header">
          <div>
            <div className="project-list-internal-title">§ I — Your projects</div>
          </div>
        </header>
        <EmptyState
          eyebrow="no projects"
          title="Nothing here yet."
          description="Click + New Project to capture a client requirement. You'll then be able to generate a Proposal or a Technical Scope from it."
          action={
            <button
              type="button"
              className="primary-button"
              onClick={onNewProject}
            >
              <span aria-hidden="true">+</span> New Project
            </button>
          }
        />
      </div>
    );
  }

  return (
    <div className="project-list">
      <header className="project-list-internal-header">
        <div>
          <div className="project-list-internal-title">§ I — Your projects</div>
          <div className="project-list-internal-count">
            showing {projects.length} of {total}
          </div>
        </div>
      </header>

      <div className="project-list-grid reveal-on-mount">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onSelect={onSelectProject}
          />
        ))}
      </div>

      <div className="project-list-loadmore">
        {hasNextPage ? (
          <button
            type="button"
            className="secondary-button"
            onClick={() => {
              void fetchNextPage();
            }}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        ) : (
          <p className="project-list-loadmore-count muted">end of list</p>
        )}
      </div>
    </div>
  );
}
