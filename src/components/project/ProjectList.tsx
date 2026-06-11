import { useCallback, useEffect, useState } from 'react';
import { Project } from '../../types';
import { api, PAGE_SIZE } from '../../services/api';
import ProjectCard from './ProjectCard';
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

  const loadPage = useCallback(
    async (nextOffset: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const result = await api.listProjects({ limit: PAGE_SIZE, offset: nextOffset });
        setProjects((prev) => (append ? [...prev, ...result.projects] : result.projects));
        setTotal(result.total);
        setHasMore(result.hasMore);
        setOffset(nextOffset + result.projects.length);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
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
      <header className="project-list-header">
        <div>
          <h2 className="project-list-title">Projects</h2>
          <p className="project-list-subtitle muted">
            Capture a client requirement. Generate a proposal or a
            technical scope. The same intake, two different outputs.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={onNewProject}
        >
          <span aria-hidden="true">+</span> New Project
        </button>
      </header>

      {loading && <p className="project-list-status muted">Loading projects…</p>}
      {error && <p className="project-list-status error-text">⚠ {error}</p>}
      {!loading && !error && projects.length === 0 && (
        <div className="project-list-empty">
          <div className="empty-state-rule" aria-hidden="true" />
          <h3>No projects yet</h3>
          <p className="muted">
            Click <strong>+ New Project</strong> to capture a client
            requirement. You'll then be able to generate a Proposal
            or a Technical Scope from it.
          </p>
        </div>
      )}

      <div className="project-list-grid">
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
          <p className="project-list-loadmore-count muted">
            showing {projects.length} of {total}
          </p>
          {hasMore ? (
            <button
              type="button"
              className="ghost-button"
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
