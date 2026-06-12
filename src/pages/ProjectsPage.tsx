import ProjectList from '../components/project/ProjectList';
import PageHeader from '../components/ui/PageHeader';
import '../styles/reveal.css';

interface ProjectsPageProps {
  onNewProject: () => void;
  onSelectProject: (projectId: string) => void;
}

/**
 * ProjectsPage
 * ------------
 * The SourcePilot home page. Editorial PageHeader up top, then
 * the project list. The list itself, the empty state, the
 * loading state, and the error state all live in `ProjectList`.
 *
 * The whole page mounts with a single staggered fade-up — one
 * well-orchestrated moment is more interesting than scattered
 * micro-interactions.
 */
export default function ProjectsPage({
  onNewProject,
  onSelectProject,
}: ProjectsPageProps) {
  return (
    <div className="projects-page reveal-on-mount">
      <PageHeader
        eyebrow="SourcePilot"
        title="AI Proposal Generator"
        subtitle="One intake. Two audience-specific outputs. Turn a raw client requirement into a non-technical proposal or a formal technical scope in a single click."
      />

      <section className="projects-page-section">
        <ProjectList
          onSelectProject={onSelectProject}
          onNewProject={onNewProject}
        />
      </section>
    </div>
  );
}
