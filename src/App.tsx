import { useState, useCallback } from 'react';
import Dashboard from './pages/Dashboard';
import IntakePage from './pages/IntakePage';
import ProjectWorkspace from './pages/ProjectWorkspace';
import { Project, Completeness } from './types';

/**
 * App
 * ---
 * SourcePilot entry. State-based routing — no router, no extra deps
 * (Constitution Article VI). Three views:
 *
 *   1. Dashboard          — project list + "+ New Project" CTA
 *   2. IntakePage         — structured intake form
 *   3. ProjectWorkspace   — full 8-stage SourcePilot workspace
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
    return (
      <ProjectWorkspace
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
