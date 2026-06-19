import {
  Project,
  ProjectDocument,
  ProjectWithDocuments,
  Audience,
  DocType,
} from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '';

/**
 * Tiny fetch wrapper that:
 *  - prefixes the API base URL
 *  - throws a clean Error on non-2xx responses with the server's error message
 *  - parses JSON
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // body wasn't JSON, keep the status text
    }
    throw new Error(message);
  }

  return (await res.json()) as T;
}

// ---- API surface used by the React app ----
//
// Post-refactor (Jun 2026), the backend exposes five routes on
// /api/projects. See backend/src/routes/projectRoutes.ts.
export const PAGE_SIZE = 20;

export const api = {
  /**
   * Paginated list, newest first. Returns the requested page plus
   * the total row count and a `hasMore` flag. Defaults match the
   * backend defaults (limit=20, offset=0).
   */
  listProjects(
    opts: { limit?: number; offset?: number } = {},
  ): Promise<{ projects: Project[]; total: number; hasMore: boolean }> {
    const params = new URLSearchParams({
      limit: String(opts.limit ?? PAGE_SIZE),
      offset: String(opts.offset ?? 0),
    });
    return request(`/api/projects?${params.toString()}`);
  },

  getProject(id: string): Promise<{ project: ProjectWithDocuments }> {
    return request(`/api/projects/${encodeURIComponent(id)}`);
  },

  createProject(input: {
    name: string;
    client_name?: string;
    audience: Audience;
    project_type?: string;
    raw_requirement: string;
  }): Promise<{ project: Project }> {
    return request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  generateDocument(
    projectId: string,
    docType: DocType,
  ): Promise<{ document: ProjectDocument }> {
    return request(`/api/projects/${encodeURIComponent(projectId)}/documents`, {
      method: 'POST',
      body: JSON.stringify({ doc_type: docType }),
    });
  },

  getDocument(id: string): Promise<{ document: ProjectDocument }> {
    return request(`/api/projects/documents/${encodeURIComponent(id)}`);
  },

  /**
   * Partial update of a project's intake fields. `null` for an
   * optional field (client_name, project_type) clears it; absent
   * keys are left untouched. At least one field is required.
   */
  updateProject(
    id: string,
    partial: {
      name?: string;
      client_name?: string | null;
      audience?: Audience;
      project_type?: string | null;
      raw_requirement?: string;
    },
  ): Promise<{ project: Project }> {
    return request(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(partial),
    });
  },

  /** Hard-delete a project. Cascades to all of its documents. */
  deleteProject(id: string): Promise<void> {
    return request(`/api/projects/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  /** Edit a single document's body. Does not bump `created_at`. */
  updateDocument(
    id: string,
    contentMarkdown: string,
  ): Promise<{ document: ProjectDocument }> {
    return request(`/api/projects/documents/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ content_markdown: contentMarkdown }),
    });
  },

  /** Hard-delete a single document version. Other versions remain. */
  deleteDocument(id: string): Promise<void> {
    return request(`/api/projects/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};
