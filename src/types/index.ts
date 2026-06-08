/**
 * Mirrors the backend types in backend/src/types/index.ts.
 * Kept in sync manually - small enough that codegen would be overkill.
 */

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

/**
 * What the dashboard renders in the right-hand "viewer" pane.
 * Either an unsaved generation or a saved row from the DB.
 */
export type ViewerContent =
  | { kind: 'idle' }
  | { kind: 'loading'; message?: string }
  | { kind: 'error'; message: string }
  | { kind: 'generated'; spec: GeneratedSpec }
  | { kind: 'saved'; spec: SpecificationWithProject };
