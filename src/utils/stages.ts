import type { LineageStage } from '../types';

/**
 * STAGE_ORDER
 * ----------
 * The 8 SourcePilot stages in workflow order. Used by:
 *   - ProjectCard (current-stage chip)
 *   - StageRail (left navigator)
 *   - ProjectWorkspace (stage-state derivation)
 */
export const STAGE_ORDER: LineageStage[] = [
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
 * LineageSnapshot
 * --------------
 * Human-readable label for each stage. Exported as a const record
 * so callers can use `LineageSnapshot[stage]` without TS complaining.
 */
export const LineageSnapshot: Record<LineageStage, string> = {
  intake: 'Intake',
  discovery: 'Discovery',
  clarification: 'Clarification',
  scope: 'Scope',
  estimate: 'Estimate',
  timeline: 'Timeline',
  proposal: 'Proposal',
  specification: 'Specification',
};
