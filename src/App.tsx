import { useState, useCallback } from 'react';
import Dashboard from './pages/Dashboard';
import IntakePage from './pages/IntakePage';
import { Project, Completeness } from './types';

/**
 * App
 * ---
 * SourcePilot entry. State-based routing — no router, no extra deps
 * (Constitution Article VI). The app exposes three views:
 *
 *   1. Dashboard      — project list + "+ New Project" CTA
 *   2. IntakePage     — structured intake form (POST /api/intake)
 *   3. ProjectView    — placeholder for Phase 6's ProjectWorkspace.
 *                       For now shows a minimal "select a project"
 *                       placeholder so the demo flow is unbroken.
 */
export default function App() {
  type View =
    | { kind: 'dashboard' }
    | { kind: 'intake' }
    | { kind: 'project'; projectId: string };

  const [view, setView] = useState<View>({ kind: 'dashboard' });
  const [refreshKey, setRefreshKey] = useState(0);
  const [justCreated, setJustCreated] = useState<{ project: Project; completeness: Completeness } | null>(null);

  const goToDashboard = useCallback(() => {
    setView({ kind: 'dashboard' });
    setJustCreated(null);
  }, []);

  const goToIntake = useCallback(() => {
    setView({ kind: 'intake' });
  }, []);

  const goToProject = useCallback((projectId: string) => {
    setView({ kind: 'project', projectId });
  }, []);

  const handleProjectCreated = useCallback((project: Project, completeness: Completeness) => {
    setJustCreated({ project, completeness });
    setRefreshKey((k) => k + 1);
    setView({ kind: 'dashboard' });
  }, []);

  if (view.kind === 'intake') {
    return (
      <IntakePage
        onCreated={handleProjectCreated}
        onCancel={goToDashboard}
      />
    );
  }

  if (view.kind === 'project') {
    // Phase 6: full workspace. For now, a minimal placeholder so the
    // user sees a real "this project exists" view with a back link.
    return (
      <ProjectPlaceholder
        projectId={view.projectId}
        onBack={goToDashboard}
      />
    );
  }

  return (
    <Dashboard
      onNewProject={goToIntake}
      onSelectProject={goToProject}
      refreshKey={refreshKey}
      justCreated={justCreated}
      onDismissJustCreated={() => setJustCreated(null)}
    />
  );
}

function ProjectPlaceholder({ projectId, onBack }: { projectId: string; onBack: () => void }) {
  return (
    <div style={{ padding: '40px', maxWidth: 720, margin: '0 auto' }}>
      <button
        type="button"
        className="ghost-button"
        onClick={onBack}
        style={{ marginBottom: 24 }}
      >
        <span aria-hidden="true">←</span> Back to projects
      </button>
      <h1 style={{ marginBottom: 8 }}>Project {projectId.slice(0, 8)}…</h1>
      <p className="muted">
        The full workspace (with Discovery, Clarification, Scope, Estimate,
        Timeline, Proposal, and Specification panels) is coming in Phase 6.
        For now, this confirms the project was captured and that lineage /
        completeness are queryable.
      </p>
    </div>
  );
}
