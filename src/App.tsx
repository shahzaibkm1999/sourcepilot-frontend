import { useCallback, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import ProjectsPage from './pages/ProjectsPage';
import CreateProjectPage from './pages/CreateProjectPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import { queryClient } from './services/queryClient';

/**
 * App
 * ---
 * SourcePilot entry. State-based routing — no router, no extra deps
 * (Constitution Article VI). Three views:
 *
 *   1. ProjectsPage         — project list + "+ New Project" CTA
 *   2. CreateProjectPage    — 5-field intake form
 *   3. ProjectDetailPage    — project info + 2 Generate buttons + document list + inline viewer
 *
 * The TanStack QueryClient is provided at the top so any descendant
 * that opts in (currently only the projects list) gets the cache
 * for free. The detail page still uses its own polling — wiring it
 * to TanStack Query would replace working code with no observable
 * benefit.
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

  let body: React.ReactNode;
  if (view.kind === 'create') {
    body = (
      <CreateProjectPage
        onCreated={(project) => goToProject(project.id)}
        onCancel={goToProjects}
      />
    );
  } else if (view.kind === 'project') {
    body = (
      <ProjectDetailPage
        projectId={view.projectId}
        onBack={goToProjects}
      />
    );
  } else {
    body = (
      <ProjectsPage
        onNewProject={goToCreate}
        onSelectProject={goToProject}
      />
    );
  }

  return <QueryClientProvider client={queryClient}>{body}</QueryClientProvider>;
}
