import { Project } from '../../types';
import { audienceLabel } from '../../utils/audience';
import { formatRelative } from '../../utils/date';
import StatusChip from '../ui/StatusChip';
import '../../styles/project-card.css';

interface ProjectCardProps {
  project: Project;
  onSelect: (projectId: string) => void;
}

/**
 * ProjectCard
 * -----------
 * One card per project in the Projects page. Click → opens the
 * project detail page. Post-refactor: no completeness score, no
 * lineage — just the captured requirement metadata.
 */
export default function ProjectCard({ project, onSelect }: ProjectCardProps) {
  return (
    <button
      type="button"
      className="project-card"
      onClick={() => onSelect(project.id)}
      aria-label={`Open project ${project.name}`}
    >
      <div className="project-card-header">
        <h3 className="project-card-name">{project.name}</h3>
        <time
          className="project-card-time-absolute"
          dateTime={project.created_at}
        >
          {formatRelative(project.created_at)}
        </time>
      </div>

      {project.client_name && (
        <p className="project-card-client">
          <span className="muted">for </span>
          <span className="project-card-client-name">{project.client_name}</span>
        </p>
      )}

      {project.raw_requirement && (
        <p className="project-card-requirement">
          {truncate(project.raw_requirement, 180)}
        </p>
      )}

      <div className="project-card-chips">
        <StatusChip tone="audience" label={audienceLabel(project.audience)} />
        {project.project_type && (
          <StatusChip tone="type" label={project.project_type} />
        )}
      </div>
    </button>
  );
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + '…';
}
