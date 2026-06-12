import { useCallback, useEffect, useRef, useState } from 'react';
import { Project } from '../../types';
import { api, PAGE_SIZE } from '../../services/api';
import ProjectCard from './ProjectCard';
import EmptyState from '../ui/EmptyState';
import '../../styles/project-list.css';

interface ProjectListProps {
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
}

/**
 * ProjectList
 * -----------
 * The Projects page's main list. Renders every loaded project as
 * a ProjectCard. The list is paginated — initial load fetches
 * `PAGE_SIZE` rows, and a "Load more" button at the bottom
 * appends the next page when there's more to show.
 *
 * Pagination state lives here (not in App) because no other view
 * needs it. Navigating back to this page re-runs the mount effect
 * and re-fetches the first page, which is how create / edit /
 * delete get reflected without a shared store.
 */
export default function ProjectList({ onSelectProject, onNewProject }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Concurrency guard. React state updates are async, so two fast
   * clicks on "Load more" can both pass the `loadingMore` state
   * check before either has flipped it to true. A ref is updated
   * synchronously, so the second call sees the lock immediately.
   */
  const inFlight = useRef(false);

  const loadPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await api.listProjects({ limit: PAGE_SIZE, offset: nextOffset });
        setProjects((prev) => (append ? [...prev, ...result.projects] : result.projects));
        setTotal(result.total);
        // Empty-page guard: if the server claims `hasMore` but
        // returned 0 rows (e.g. rows were deleted between this
        // call and the previous one), treat as "end of list" so
        // we don't loop on the same offset.
        const trustHasMore = result.hasMore && result.projects.length > 0;
        setHasMore(trustHasMore);
        setOffset(nextOffset + result.projects.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
        inFlight.current = false;
      }
    },
    [],
  );

  // Initial load. Re-runs on mount (so navigating back from
  // create / edit / delete refetches the first page).
  useEffect(() => {
    loadPage(0, false);
  }, [loadPage]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    loadPage(offset, true);
  };

  return (
    <div className="project-list">
      <header className="project-list-internal-header">
        <div>
          <div className="project-list-internal-title">§ I — Your projects</div>
          {!loading && !error && projects.length > 0 && (
            <div className="project-list-internal-count">
              showing {projects.length} of {total}
            </div>
          )}
        </div>
      </header>

      {loading && <p className="project-list-status muted">Loading projects…</p>}
      {error && <p className="project-list-error">⚠ {error}</p>}
      {!loading && !error && projects.length === 0 && (
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
      )}

      <div className="project-list-grid reveal-on-mount">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onSelect={onSelectProject}
          />
        ))}
      </div>

      {!loading && !error && projects.length > 0 && (
        <div className="project-list-loadmore">
          {hasMore ? (
            <button
              type="button"
              className="secondary-button"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          ) : (
            <p className="project-list-loadmore-count muted">end of list</p>
          )}
        </div>
      )}
    </div>
  );
}
