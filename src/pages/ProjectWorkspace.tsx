import { useEffect, useState, useCallback } from 'react';
import { Project, Completeness, Lineage, Intake, LineageStage } from '../types';
import { api } from '../services/api';
import { STAGE_ORDER, LineageSnapshot } from '../utils/stages';
import StageRail, { StageId } from '../components/workspace/StageRail';
import StagePanelShell from '../components/workspace/StagePanelShell';
import CompletenessBadge from '../components/workspace/CompletenessBadge';
import LineageDrawer from '../components/workspace/LineageDrawer';

import IntakePanel from '../components/workspace/panels/IntakePanel';
import DiscoveryPanel from '../components/workspace/panels/DiscoveryPanel';
import ClarificationPanel from '../components/workspace/panels/ClarificationPanel';
import ScopePanel from '../components/workspace/panels/ScopePanel';
import EstimatePanel from '../components/workspace/panels/EstimatePanel';
import TimelinePanel from '../components/workspace/panels/TimelinePanel';
import ProposalPanel from '../components/workspace/panels/ProposalPanel';
import SpecPanel from '../components/workspace/panels/SpecPanel';

import { formatRelative } from '../utils/date';
import '../styles/workspace.css';

interface ProjectWorkspaceProps {
  projectId: string;
  onBack: () => void;
}

/**
 * ProjectWorkspace
 * ---------------
 * The SourcePilot heart-of-the-product view. Renders the stage
 * rail, the active stage's panel, and the right rail
 * (completeness + lineage). Refetches lineage + completeness
 * after every successful stage action.
 */
export default function ProjectWorkspace({ projectId, onBack }: ProjectWorkspaceProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [intake, setIntake] = useState<Intake | null>(null);
  const [lineage, setLineage] = useState<Lineage | null>(null);
  const [completeness, setCompleteness] = useState<Completeness | null>(null);
  const [active, setActive] = useState<StageId>('discovery');
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const bumpRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError(null);
      try {
        const projectsResp = await api.listProjects();
        const proj = projectsResp.projects.find((p) => p.id === projectId);
        if (cancelled) return;
        setProject(proj ?? null);
        if (!proj) {
          setError('Project not found.');
          return;
        }

        const [lin, comp, intakeResp] = await Promise.all([
          api.getLineage(projectId),
          api.getCompleteness(projectId),
          api.getIntake(projectId).catch(() => null),
        ]);
        if (cancelled) return;
        setLineage(lin);
        setCompleteness(comp);
        setIntake(intakeResp?.intake ?? null);

        // Auto-focus the first stage that is NOT yet done.
        const present = new Set(lin.lineage.filter((l) => l.present).map((l) => l.stage));
        const firstTodo = STAGE_ORDER.find((s) => !present.has(s));
        if (firstTodo) setActive(firstTodo as StageId);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load project');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, refreshKey]);

  const stageNumber = STAGE_ORDER.indexOf(active) + 1;
  const stageTotal = STAGE_ORDER.length;

  const renderPanel = () => {
    switch (active) {
      case 'intake':
        return <IntakePanel projectId={projectId} onAfterChange={bumpRefresh} />;
      case 'discovery':
        return <DiscoveryPanel projectId={projectId} onAfterChange={bumpRefresh} />;
      case 'clarification':
        return <ClarificationPanel projectId={projectId} onAfterChange={bumpRefresh} />;
      case 'scope':
        return <ScopePanel projectId={projectId} onAfterChange={bumpRefresh} />;
      case 'estimate':
        return <EstimatePanel projectId={projectId} onAfterChange={bumpRefresh} />;
      case 'timeline':
        return <TimelinePanel projectId={projectId} onAfterChange={bumpRefresh} />;
      case 'proposal':
        return <ProposalPanel projectId={projectId} onAfterChange={bumpRefresh} />;
      case 'specification':
        return <SpecPanel projectId={projectId} onAfterChange={bumpRefresh} />;
    }
  };

  if (error && !project) {
    return (
      <div style={{ padding: 'var(--space-7)' }}>
        <button type="button" className="ghost-button workspace-back" onClick={onBack}>
          <span aria-hidden="true">←</span> Back to projects
        </button>
        <p className="error-text">{error}</p>
      </div>
    );
  }

  return (
    <div className="workspace-shell">
      <StageRail
        active={active}
        onSelect={(s: LineageStage) => setActive(s as StageId)}
        lineage={lineage?.lineage ?? null}
      />

      <main className="workspace-main">
        <header className="workspace-header">
          <button type="button" className="ghost-button workspace-back" onClick={onBack}>
            <span aria-hidden="true">←</span> Back to projects
          </button>
          <div className="workspace-eyebrow">
            Stage {stageNumber} of {stageTotal} · {LineageSnapshot[active]}
          </div>
          <h1 className="workspace-title">{project?.name ?? 'Loading…'}</h1>
          {intake && (
            <div className="workspace-chips">
              {intake.project_type && <span className="chip chip-type">{intake.project_type}</span>}
              {intake.engagement && (
                <span className="chip chip-engagement">
                  {intake.engagement === 'fixed_price' ? 'fixed price' : 'hourly'}
                </span>
              )}
              {intake.timeline_pref && <span className="chip chip-stage">{intake.timeline_pref}</span>}
              {project && (
                <span className="muted" style={{ fontSize: '0.78rem', alignSelf: 'center' }}>
                  created {formatRelative(project.created_at)}
                </span>
              )}
            </div>
          )}
        </header>

        {renderPanel()}
      </main>

      <aside className="workspace-aside" aria-label="Project metadata">
        <CompletenessBadge completeness={completeness} />
        <LineageDrawer lineage={lineage?.lineage ?? null} />
      </aside>
    </div>
  );
}

// (StagePanelShell is exported only to satisfy noUnusedLocals; re-export
// pattern keeps the import live for tree-shake inspection.)
export { StagePanelShell };
