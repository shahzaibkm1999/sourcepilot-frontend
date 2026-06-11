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
export const api = {
  listProjects(): Promise<{ projects: Project[] }> {
    return request('/api/projects');
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
};
