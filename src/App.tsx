import { useCallback, useState } from 'react';
import ProjectsPage from './pages/ProjectsPage';
import CreateProjectPage from './pages/CreateProjectPage';
import ProjectDetailPage from './pages/ProjectDetailPage';

/**
 * App
 * ---
 * SourcePilot entry. State-based routing — no router, no extra deps
 * (Constitution Article VI). Three views:
 *
 *   1. ProjectsPage         — project list + "+ New Project" CTA
 *   2. CreateProjectPage    — 5-field intake form
 *   3. ProjectDetailPage    — project info + 2 Generate buttons + document list + inline viewer
 */
export default function App() {
  type View =
    | { kind: 'projects' }
    | { kind: 'create' }
    | { kind: 'project'; projectId: string };

  const [view, setView] = useState<View>({ kind: 'projects' });

  const goToProjects = useCallback(() => {
    setView({ kind: 'projects' });
  }, []);

  const goToCreate = useCallback(() => {
    setView({ kind: 'create' });
  }, []);

  const goToProject = useCallback((projectId: string) => {
    setView({ kind: 'project', projectId });
  }, []);

  if (view.kind === 'create') {
    return (
      <CreateProjectPage
        onCreated={(project) => goToProject(project.id)}
        onCancel={goToProjects}
      />
    );
  }

  if (view.kind === 'project') {
    return (
      <ProjectDetailPage
        projectId={view.projectId}
        onBack={goToProjects}
      />
    );
  }

  return (
    <ProjectsPage
      onNewProject={goToCreate}
      onSelectProject={goToProject}
    />
  );
}
