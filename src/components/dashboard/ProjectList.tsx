import { useEffect, useState } from 'react';
import { Project } from '../../types';
import { api } from '../../services/api';
import ProjectCard from './ProjectCard';
import '../../styles/project-list.css';

interface ProjectListProps {
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  /** Bump this to force a refetch (e.g. after creating a new project). */
  refreshKey?: number;
}

/**
 * ProjectList
 * -----------
 * The SourcePilot dashboard's main list. Renders every project as a
 * ProjectCard. Header has a + New Project CTA.
 */
export default function ProjectList({ onSelectProject, onNewProject, refreshKey = 0 }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { projects } = await api.listProjects();
        if (!cancelled) setProjects(projects);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load projects');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <div className="project-list">
      <header className="project-list-header">
        <div>
          <h2 className="project-list-title">Projects</h2>
          <p className="project-list-subtitle muted">
            Every project flows through the same living source of truth.
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
            Click <strong>+ New Project</strong> to capture a client requirement
            and walk it through the SourcePilot workflow.
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
    </div>
  );
}
