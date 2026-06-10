import { LineageEntry, LineageStage } from '../../types';
import { LineageSnapshot, STAGE_ORDER } from '../../utils/stages';

export type StageId = LineageStage;
export type StageState = 'done' | 'active' | 'todo';

interface StageRailProps {
  active: StageId;
  onSelect: (stage: StageId) => void;
  lineage: LineageEntry[] | null;
}

/**
 * StageRail
 * ---------
 * Left-rail navigator. Shows all 8 SourcePilot stages with a
 * done / active / todo marker. Click selects a stage. A stage is
 * `done` if lineage reports it as present; `active` if it's the
 * currently focused stage; `todo` otherwise.
 */
export default function StageRail({ active, onSelect, lineage }: StageRailProps) {
  const presentSet = new Set(
    (lineage ?? []).filter((l) => l.present).map((l) => l.stage)
  );

  const stateOf = (s: StageId): StageState => {
    if (presentSet.has(s)) return 'done';
    if (s === active) return 'active';
    return 'todo';
  };

  return (
    <aside className="workspace-rail" aria-label="Project stages">
      <div className="workspace-rail-eyebrow">Workflow</div>
      <nav className="stage-rail">
        {STAGE_ORDER.map((stage, idx) => {
          const state = stateOf(stage);
          const label = LineageSnapshot[stage];
          const isDone = state === 'done';
          const isActive = state === 'active';
          const stageNumber = String(idx + 1).padStart(2, '0');
          return (
            <button
              type="button"
              key={stage}
              className={`stage-rail-row ${isActive ? 'stage-rail-row--active' : ''}`}
              onClick={() => onSelect(stage)}
              aria-current={isActive ? 'step' : undefined}
            >
              <span
                className={`stage-rail-marker ${
                  isDone ? 'stage-rail-marker--done' : isActive ? 'stage-rail-marker--active' : ''
                }`}
                aria-hidden="true"
              >
                {isDone ? '✓' : isActive ? '●' : '○'}
              </span>
              <span className="stage-rail-label">{label}</span>
              <span className="stage-rail-row-stage-number">{stageNumber}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
