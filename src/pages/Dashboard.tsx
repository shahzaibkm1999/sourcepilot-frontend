import { useState } from 'react';
import ProjectList from '../components/dashboard/ProjectList';
import { Project, Completeness } from '../types';
import '../styles/dashboard.css';

interface DashboardProps {
  onNewProject: () => void;
  onSelectProject: (projectId: string) => void;
  /** Bump this from the parent (e.g. after creating a project) to trigger a list refresh. */
  refreshKey: number;
  /** If a project was just created, show a success banner. */
  justCreated?: { project: Project; completeness: Completeness } | null;
  onDismissJustCreated?: () => void;
}

/**
 * Dashboard
 * ---------
 * The SourcePilot home page. Shows the project list and the
 * "+ New Project" CTA. If a project was just created, a banner
 * appears at the top with a quick link to its workspace.
 */
export default function Dashboard({
  onNewProject,
  onSelectProject,
  refreshKey,
  justCreated,
  onDismissJustCreated,
}: DashboardProps) {
  // local "I just created this" state if the parent doesn't manage it
  const [, setLocalAck] = useState(0);
  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <div className="dashboard-eyebrow">SourcePilot</div>
          <h1>Living Source of Truth</h1>
          <p className="subtitle">
            Turn a client requirement into a proposal-ready and
            development-ready project blueprint.
          </p>
        </div>
      </header>

      {justCreated && (
        <div className="dashboard-banner" role="status">
          <div className="dashboard-banner-text">
            <strong>Project captured.</strong> {justCreated.project.name} ·
            {' '}<span className="muted">{justCreated.completeness.score}% complete</span>
            {' '}— open it to start Discovery.
          </div>
          <div className="dashboard-banner-actions">
            <button
              type="button"
              className="primary-button"
              onClick={() => onSelectProject(justCreated.project.id)}
            >
              Open project
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                onDismissJustCreated?.();
                setLocalAck((n) => n + 1);
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <section className="dashboard-section">
        <ProjectList
          onSelectProject={onSelectProject}
          onNewProject={onNewProject}
          refreshKey={refreshKey}
        />
      </section>
    </div>
  );
}
