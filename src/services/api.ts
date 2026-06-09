import {
  GeneratedSpec,
  SpecificationWithProject,
  Intake,
  ProjectType,
  Engagement,
  TimelinePref,
  Completeness,
  Lineage,
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
export const api = {
  health(): Promise<{ status: string }> {
    return request('/health');
  },

  // ---- Spec system (kept) ----
  listSpecs(): Promise<{ specifications: SpecificationWithProject[] }> {
    return request('/api/specifications');
  },

  getSpec(id: string): Promise<{ specification: SpecificationWithProject }> {
    return request(`/api/specifications/${encodeURIComponent(id)}`);
  },

  getSpecByName(name: string): Promise<{ specification: SpecificationWithProject }> {
    return request(`/api/specifications/by-name/${encodeURIComponent(name)}`);
  },

  generateSpec(projectIdea: string): Promise<{
    generated: GeneratedSpec;
    specification: SpecificationWithProject;
  }> {
    return request('/api/specifications/generate', {
      method: 'POST',
      body: JSON.stringify({ projectIdea }),
    });
  },

  saveSpec(input: {
    projectName: string;
    projectDescription?: string;
    specificationContent: string;
  }): Promise<{ project: { id: string; name: string }; specification: { id: string; version: number } }> {
    return request('/api/specifications/save', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  // ---- SourcePilot ----
  listProjects(): Promise<{ projects: import('../types').Project[] }> {
    return request('/api/projects');
  },

  createIntake(input: {
    projectName: string;
    projectDescription?: string;
    projectType?: ProjectType;
    engagement?: Engagement;
    timelinePref?: TimelinePref;
    requirement: string;
    details?: string;
    constraints?: string;
  }): Promise<{ project: import('../types').Project; intake: Intake; completeness: Completeness }> {
    return request('/api/intake', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getIntake(projectId: string): Promise<{ intake: Intake }> {
    return request(`/api/intake/${encodeURIComponent(projectId)}/latest`);
  },

  getCompleteness(projectId: string): Promise<Completeness> {
    return request(`/api/projects/${encodeURIComponent(projectId)}/completeness`);
  },

  getLineage(projectId: string): Promise<Lineage> {
    return request(`/api/artifacts/${encodeURIComponent(projectId)}/lineage`);
  },
};
