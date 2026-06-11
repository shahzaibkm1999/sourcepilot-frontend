import ProjectList from '../components/project/ProjectList';
import '../styles/projects-page.css';

interface ProjectsPageProps {
  onNewProject: () => void;
  onSelectProject: (projectId: string) => void;
}

/**
 * ProjectsPage
 * ------------
 * The SourcePilot home page. Shows the project list and the
 * "+ New Project" CTA. The list itself, the empty state, the
 * loading state, and the error state all live in `ProjectList`.
 */
export default function ProjectsPage({
  onNewProject,
  onSelectProject,
}: ProjectsPageProps) {
  return (
    <div className="projects-page">
      <header className="projects-page-header">
        <div className="projects-page-header-inner">
          <div className="projects-page-eyebrow">SourcePilot</div>
          <h1>AI Proposal Generator</h1>
          <p className="subtitle">
            One intake. Two audience-specific outputs. Turn a raw
            client requirement into a non-technical proposal or a
            formal technical scope in a single click.
          </p>
        </div>
      </header>

      <section className="projects-page-section">
        <ProjectList
          onSelectProject={onSelectProject}
          onNewProject={onNewProject}
        />
      </section>
    </div>
  );
}
