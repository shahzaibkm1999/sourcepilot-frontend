import {
  GeneratedSpec,
  SpecificationWithProject,
  Intake,
  ProjectType,
  Engagement,
  TimelinePref,
  Completeness,
  Lineage,
  Discovery,
  Clarification,
  ClarificationQuestion,
  Scope,
  Estimate,
  Timeline,
  Proposal,
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

  // ---- Discovery ----
  generateDiscovery(projectId: string): Promise<{ discovery: Discovery; completeness: Completeness }> {
    return request('/api/discoveries/generate', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  },
  getDiscovery(projectId: string): Promise<{ discovery: Discovery }> {
    return request(`/api/discoveries/${encodeURIComponent(projectId)}/latest`);
  },

  // ---- Clarifications ----
  generateClarifications(projectId: string): Promise<{ clarification: Clarification; completeness: Completeness }> {
    return request('/api/clarifications/generate', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  },
  saveClarifications(input: {
    projectId: string;
    questions: ClarificationQuestion[];
    refinedInput?: string;
  }): Promise<{ clarification: Clarification; completeness: Completeness }> {
    return request('/api/clarifications/save', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  listClarifications(projectId: string): Promise<{ clarifications: Clarification[] }> {
    return request(`/api/clarifications/${encodeURIComponent(projectId)}`);
  },

  // ---- Scope ----
  generateScope(projectId: string): Promise<{ scope: Scope; completeness: Completeness }> {
    return request('/api/scope/generate', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  },
  getScope(projectId: string): Promise<{ scope: Scope }> {
    return request(`/api/scope/${encodeURIComponent(projectId)}/latest`);
  },

  // ---- Estimate ----
  generateEstimate(projectId: string): Promise<{ estimate: Estimate; completeness: Completeness }> {
    return request('/api/estimate/generate', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  },
  getEstimate(projectId: string): Promise<{ estimate: Estimate }> {
    return request(`/api/estimate/${encodeURIComponent(projectId)}/latest`);
  },

  // ---- Timeline ----
  generateTimeline(projectId: string): Promise<{ timeline: Timeline; completeness: Completeness }> {
    return request('/api/timeline/generate', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  },
  getTimeline(projectId: string): Promise<{ timeline: Timeline }> {
    return request(`/api/timeline/${encodeURIComponent(projectId)}/latest`);
  },

  // ---- Proposal ----
  generateProposal(projectId: string): Promise<{ proposal: Proposal; completeness: Completeness }> {
    return request('/api/proposal/generate', {
      method: 'POST',
      body: JSON.stringify({ projectId }),
    });
  },
  getProposal(projectId: string): Promise<{ proposal: Proposal }> {
    return request(`/api/proposal/${encodeURIComponent(projectId)}/latest`);
  },
};
