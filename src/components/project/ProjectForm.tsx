import { FormEvent, useState } from 'react';
import { Audience } from '../../types';
import '../../styles/create-project.css';

export interface ProjectFormValues {
  name: string;
  client_name: string;
  audience: Audience;
  project_type: string;
  raw_requirement: string;
}

interface ProjectFormProps {
  onSubmit: (values: ProjectFormValues) => void;
  onCancel: () => void;
  submitting: boolean;
  /** Pre-fill the form (used for edit). Omit to start empty. */
  initialValues?: Partial<ProjectFormValues>;
  /** Submit button text. Defaults to "Create Project". */
  submitLabel?: string;
}

/**
 * ProjectForm
 * -----------
 * The 5-field intake form. Required: name, audience, raw_requirement
 * (>= 10 chars, mirrors backend Zod schema). Optional: client_name,
 * project_type.
 *
 * Used for both create and edit flows. Pass `initialValues` to start
 * pre-filled (edit); omit it to start empty (create). The submit
 * button label can be customized via `submitLabel`.
 */
export default function ProjectForm({
  onSubmit,
  onCancel,
  submitting,
  initialValues,
  submitLabel = 'Create Project',
}: ProjectFormProps) {
  const [name, setName] = useState(initialValues?.name ?? '');
  const [clientName, setClientName] = useState(initialValues?.client_name ?? '');
  const [audience, setAudience] = useState<Audience>(
    initialValues?.audience ?? 'non_tecnico',
  );
  const [projectType, setProjectType] = useState(initialValues?.project_type ?? '');
  const [requirement, setRequirement] = useState(initialValues?.raw_requirement ?? '');

  const trimmedName = name.trim();
  const trimmedReq = requirement.trim();
  const canSubmit =
    trimmedName.length > 0 && trimmedReq.length >= 10 && !submitting;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      name: trimmedName,
      client_name: clientName.trim(),
      audience,
      project_type: projectType.trim(),
      raw_requirement: trimmedReq,
    });
  };

  return (
    <form className="project-form" onSubmit={handleSubmit}>
      <div className="project-form-grid">
        <label className="project-field project-field-wide">
          <span className="project-label">Project Name</span>
          <input
            className="project-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Internal HR Portal"
            autoFocus
            required
          />
        </label>

        <label className="project-field">
          <span className="project-label">Client Name</span>
          <input
            className="project-input"
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="e.g. Acme Corp."
          />
        </label>

        <fieldset className="project-field project-field-audience">
          <legend className="project-label">Audience</legend>
          <div className="audience-radios">
            <label className="audience-radio">
              <input
                type="radio"
                name="audience"
                value="non_tecnico"
                checked={audience === 'non_tecnico'}
                onChange={() => setAudience('non_tecnico')}
              />
              <span className="audience-radio-body">
                <span className="audience-radio-title">Non-Technical</span>
                <span className="audience-radio-desc muted">
                  Airtable-style proposal: overview, scope, timeline,
                  pricing, what I need from you.
                </span>
              </span>
            </label>
            <label className="audience-radio">
              <input
                type="radio"
                name="audience"
                value="tecnico"
                checked={audience === 'tecnico'}
                onChange={() => setAudience('tecnico')}
              />
              <span className="audience-radio-body">
                <span className="audience-radio-title">Technical</span>
                <span className="audience-radio-desc muted">
                  Orbit-style technical scope: architecture, stack,
                  NFRs, risks, next steps.
                </span>
              </span>
            </label>
          </div>
        </fieldset>

        <label className="project-field">
          <span className="project-label">Project Type</span>
          <input
            className="project-input"
            type="text"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value)}
            placeholder="e.g. web app, mobile, internal tool, API"
            maxLength={100}
          />
        </label>
      </div>

      <label className="project-field">
        <span className="project-label">Raw Requirement</span>
        <textarea
          className="project-textarea"
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          placeholder="Describe what the client wants built. Be as concrete as possible — what problem does it solve, who uses it, what does success look like?"
          rows={8}
          required
          minLength={10}
        />
        <span className="project-hint muted">
          {trimmedReq.length < 10
            ? `At least 10 characters required (${trimmedReq.length}/10)`
            : `${trimmedReq.length} characters`}
        </span>
      </label>

      <div className="project-form-actions">
        <button
          type="button"
          className="ghost-button"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="primary-button"
          disabled={!canSubmit}
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
