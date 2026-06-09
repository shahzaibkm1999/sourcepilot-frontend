/**
 * Mirrors the backend types in backend/src/types/index.ts and the
 * new model files in backend/src/models/*. Kept in sync manually —
 * small enough that codegen would be overkill.
 */

// ---- Original (kept) ----
export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Specification {
  id: string;
  project_id: string;
  content: string;
  version: number;
  created_at: string;
}

export interface SpecificationWithProject extends Specification {
  project: Pick<Project, 'id' | 'name' | 'description'>;
}

export interface GeneratedSpec {
  projectName: string;
  projectDescription: string;
  content: string;
}

export type ViewerContent =
  | { kind: 'idle' }
  | { kind: 'loading'; message?: string }
  | { kind: 'error'; message: string }
  | { kind: 'generated'; spec: GeneratedSpec }
  | { kind: 'saved'; spec: SpecificationWithProject };

// ---- SourcePilot types ----
export type ProjectType = 'web' | 'mobile' | 'saas' | 'internal' | 'api' | 'other';
export type Engagement = 'fixed_price' | 'hourly';
export type TimelinePref = '1-2w' | '1m' | '2-3m' | '3-6m' | 'flexible';

export interface Intake {
  id: string;
  project_id: string;
  project_type: ProjectType | null;
  engagement: Engagement | null;
  timeline_pref: TimelinePref | null;
  requirement: string;
  details: string | null;
  constraints: string | null;
  version: number;
  created_at: string;
}

export interface Completeness {
  score: number;          // 0..100
  missing: string[];
}

export type LineageStage =
  | 'intake'
  | 'discovery'
  | 'clarification'
  | 'scope'
  | 'estimate'
  | 'timeline'
  | 'proposal'
  | 'specification';

export interface LineageNode {
  stage: LineageStage;
  id: string;
  version: number;
  createdAt: string;
}

export type LineageEntry =
  | { stage: LineageStage; present: true; node: LineageNode; artifact: unknown }
  | { stage: LineageStage; present: false };

export interface Lineage {
  projectId: string;
  lineage: LineageEntry[];
}

// ---- App-level navigation state ----
export type AppRoute =
  | { kind: 'dashboard' }
  | { kind: 'intake' }
  | { kind: 'project'; projectId: string };
