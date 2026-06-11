/**
 * Mirrors the backend types in `backend/src/types/index.ts`. Kept in
 * sync manually — the surface is small enough that codegen would be
 * overkill.
 *
 * Post-refactor (Jun 2026), the product is an AI document generator.
 * The schema collapsed to two tables: `projects` + `documents`. The
 * old 8-stage pipeline types are gone.
 */

export type Audience = 'non_tecnico' | 'tecnico';
export type DocType = 'proposal' | 'tech_scope';

export interface Project {
  id: string;
  name: string;
  client_name: string | null;
  audience: Audience;
  project_type: string | null;
  raw_requirement: string;
  created_at: string;
}

export interface ProjectDocument {
  id: string;
  project_id: string;
  doc_type: DocType;
  content_markdown: string;
  created_at: string;
}

/** A project bundled with all its documents (joined on the server). */
export interface ProjectWithDocuments extends Project {
  documents: ProjectDocument[];
}
