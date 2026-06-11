import { useState } from 'react';
import ProjectForm, { ProjectFormValues } from '../components/project/ProjectForm';
import { api } from '../services/api';
import { Project } from '../types';
import '../styles/create-project.css';

interface CreateProjectPageProps {
  onCreated: (project: Project) => void;
  onCancel: () => void;
}

/**
 * CreateProjectPage
 * -----------------
 * The 5-field intake experience. On submit, calls
 * `api.createProject` and reports the new project back so the
 * router can navigate to its detail page.
 */
export default function CreateProjectPage({ onCreated, onCancel }: CreateProjectPageProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: ProjectFormValues) => {
    setSubmitting(true);
    setError(null);
    try {
      // Empty optional strings → undefined so the backend treats them
      // as "not provided" rather than "" (Zod accepts both, but null
      // storage is cleaner for absent values).
      const payload = {
        name: values.name,
        audience: values.audience,
        raw_requirement: values.raw_requirement,
        client_name: values.client_name || undefined,
        project_type: values.project_type || undefined,
      };
      const { project } = await api.createProject(payload);
      onCreated(project);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-project-page">
      <header className="create-project-page-header">
        <button
          type="button"
          className="ghost-button back-button"
          onClick={onCancel}
        >
          <span aria-hidden="true">←</span> Back to projects
        </button>
        <div className="create-project-page-eyebrow">SourcePilot</div>
        <h1>Capture a new project</h1>
        <p className="subtitle">
          One intake. The audience choice on this form decides
          whether you'll later generate an Airtable-style proposal
          or an Orbit-style technical scope.
        </p>
      </header>

      {error && (
        <div className="create-project-error">
          <strong>Could not create the project.</strong> {error}
        </div>
      )}

      <section className="create-project-form-section">
        <ProjectForm
          onSubmit={handleSubmit}
          onCancel={onCancel}
          submitting={submitting}
        />
      </section>
    </div>
  );
}
