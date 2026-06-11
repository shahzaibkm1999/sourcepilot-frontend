import { useEffect, useState } from 'react';
import { Project } from '../../types';
import { api } from '../../services/api';
import ProjectCard from './ProjectCard';
import '../../styles/project-list.css';

interface ProjectListProps {
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
}

/**
 * ProjectList
 * -----------
 * The Projects page's main list. Renders every project as a
 * ProjectCard. Header has a + New Project CTA.
 */
export default function ProjectList({ onSelectProject, onNewProject }: ProjectListProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Re-fetch whenever the page becomes visible (cheap; small MVP list).
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
  }, []);

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
    </div>
  );
}
