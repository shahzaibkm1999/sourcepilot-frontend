import { useEffect, useState } from 'react';
import { Project, Completeness, LineageEntry, LineageStage, Intake } from '../../types';
import { api } from '../../services/api';
import { formatRelative } from '../../utils/date';
import '../../styles/project-card.css';

interface ProjectCardProps {
  project: Project;
  onSelect: (projectId: string) => void;
}

const STAGE_LABELS: Record<LineageStage, string> = {
  intake: 'Intake',
  discovery: 'Discovery',
  clarification: 'Clarification',
  scope: 'Scope',
  estimate: 'Estimate',
  timeline: 'Timeline',
  proposal: 'Proposal',
  specification: 'Specification',
};

const STAGE_ORDER: LineageStage[] = [
  'intake',
  'discovery',
  'clarification',
  'scope',
  'estimate',
  'timeline',
  'proposal',
  'specification',
];

/**
 * ProjectCard
 * -----------
 * One card per project in the SourcePilot dashboard.
 * Shows: project name, project type chip, current stage, completeness
 * score, last activity. Click → opens ProjectWorkspace (Phase 6) or
 * shows lineage for now.
 */
export default function ProjectCard({ project, onSelect }: ProjectCardProps) {
  const [completeness, setCompleteness] = useState<Completeness | null>(null);
  const [latestIntake, setLatestIntake] = useState<Intake | null>(null);
  const [lineage, setLineage] = useState<LineageEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [comp, lin, intake] = await Promise.all([
          api.getCompleteness(project.id),
          api.getLineage(project.id),
          api.getIntake(project.id).catch(() => null),
        ]);
        if (cancelled) return;
        setCompleteness(comp);
        setLineage(lin.lineage);
        setLatestIntake(intake?.intake ?? null);
      } catch (err) {
        if (cancelled) return;
        // Soft failure — show what we have without completeness
        console.error('ProjectCard: failed to load', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const currentStage = lineage
    ? [...STAGE_ORDER].reverse().find((s) => lineage.find((l) => l.stage === s && l.present)) ?? 'intake'
    : 'intake';

  const projectType = latestIntake?.project_type ?? null;
  const engagement = latestIntake?.engagement ?? null;

  return (
    <button
      type="button"
      className="project-card"
      onClick={() => onSelect(project.id)}
      aria-label={`Open project ${project.name}`}
    >
      <div className="project-card-header">
        <h3 className="project-card-name">{project.name}</h3>
        <div className="project-card-score">
          {completeness ? (
            <>
              <span className="project-card-score-num">{completeness.score}</span>
              <span className="project-card-score-suffix">%</span>
            </>
          ) : (
            <span className="project-card-score-loading">…</span>
          )}
        </div>
      </div>

      {project.description && (
        <p className="project-card-desc">{project.description}</p>
      )}

      <div className="project-card-chips">
        {projectType && <span className="chip chip-type">{projectType}</span>}
        {engagement && (
          <span className="chip chip-engagement">
            {engagement === 'fixed_price' ? 'fixed price' : 'hourly'}
          </span>
        )}
        <span className="chip chip-stage">
          <span className="chip-stage-dot" aria-hidden="true" />
          {STAGE_LABELS[currentStage as LineageStage]}
        </span>
      </div>

      <div className="project-card-footer">
        <time className="project-card-time" dateTime={project.created_at}>
          {formatRelative(project.created_at)}
        </time>
        {completeness && completeness.missing.length > 0 && (
          <span className="project-card-missing">
            missing: {completeness.missing.length}
          </span>
        )}
        {completeness && completeness.missing.length === 0 && (
          <span className="project-card-complete">complete ✓</span>
        )}
      </div>
    </button>
  );
}
