import { useState, FormEvent } from 'react';
import { ProjectType, Engagement, TimelinePref } from '../../types';
import '../../styles/intake.css';

interface IntakeFormProps {
  onSubmit: (input: {
    projectName: string;
    projectDescription?: string;
    projectType?: ProjectType;
    engagement?: Engagement;
    timelinePref?: TimelinePref;
    requirement: string;
    details?: string;
    constraints?: string;
  }) => void;
  onCancel: () => void;
  submitting: boolean;
}

const PROJECT_TYPES: { value: ProjectType; label: string }[] = [
  { value: 'web', label: 'Web Application' },
  { value: 'mobile', label: 'Mobile Application' },
  { value: 'saas', label: 'SaaS Platform' },
  { value: 'internal', label: 'Internal Tool' },
  { value: 'api', label: 'API Service' },
  { value: 'other', label: 'Other' },
];

const ENGAGEMENTS: { value: Engagement; label: string }[] = [
  { value: 'fixed_price', label: 'Fixed Price' },
  { value: 'hourly', label: 'Hourly' },
];

const TIMELINES: { value: TimelinePref; label: string }[] = [
  { value: '1-2w', label: '1–2 Weeks' },
  { value: '1m', label: '1 Month' },
  { value: '2-3m', label: '2–3 Months' },
  { value: '3-6m', label: '3–6 Months' },
  { value: 'flexible', label: 'Flexible' },
];

/**
 * IntakeForm
 * ----------
 * The structured client-requirement capture form. All fields are
 * optional except project name and requirement. The form is the
 * single entry point for opening a new project.
 */
export default function IntakeForm({ onSubmit, onCancel, submitting }: IntakeFormProps) {
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('web');
  const [engagement, setEngagement] = useState<Engagement>('fixed_price');
  const [timelinePref, setTimelinePref] = useState<TimelinePref>('1m');
  const [requirement, setRequirement] = useState('');
  const [details, setDetails] = useState('');
  const [constraints, setConstraints] = useState('');

  const canSubmit = projectName.trim().length > 0 && requirement.trim().length >= 10 && !submitting;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      projectName: projectName.trim(),
      projectType,
      engagement,
      timelinePref,
      requirement: requirement.trim(),
      details: details.trim() || undefined,
      constraints: constraints.trim() || undefined,
    });
  };

  return (
    <form className="intake-form" onSubmit={handleSubmit}>
      <div className="intake-form-grid">
        <label className="intake-field intake-field-wide">
          <span className="intake-label">Project Name</span>
          <input
            className="intake-input"
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="e.g. Acme Internal HR Portal"
            autoFocus
            required
          />
        </label>

        <label className="intake-field">
          <span className="intake-label">Project Type</span>
          <select
            className="intake-select"
            value={projectType}
            onChange={(e) => setProjectType(e.target.value as ProjectType)}
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>

        <label className="intake-field">
          <span className="intake-label">Engagement Model</span>
          <select
            className="intake-select"
            value={engagement}
            onChange={(e) => setEngagement(e.target.value as Engagement)}
          >
            {ENGAGEMENTS.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </label>

        <label className="intake-field">
          <span className="intake-label">Desired Timeline</span>
          <select
            className="intake-select"
            value={timelinePref}
            onChange={(e) => setTimelinePref(e.target.value as TimelinePref)}
          >
            {TIMELINES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="intake-field">
        <span className="intake-label">Client Requirement / Job Details</span>
        <textarea
          className="intake-textarea"
          value={requirement}
          onChange={(e) => setRequirement(e.target.value)}
          placeholder="Describe what the client wants built. Be as concrete as possible — what problem does it solve, who uses it, what does success look like?"
          rows={6}
          required
          minLength={10}
        />
        <span className="intake-hint muted">
          {requirement.length < 10
            ? `At least 10 characters required (${requirement.length}/10)`
            : `${requirement.length} characters`}
        </span>
      </label>

      <details className="intake-optional">
        <summary className="intake-optional-summary">Additional details (optional)</summary>
        <div className="intake-optional-body">
          <label className="intake-field">
            <span className="intake-label">Details</span>
            <textarea
              className="intake-textarea"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Any background, target users, scale, related context…"
              rows={4}
            />
          </label>
          <label className="intake-field">
            <span className="intake-label">Constraints (optional)</span>
            <textarea
              className="intake-textarea"
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              placeholder="Tech stack constraints, compliance, budget hard limits, deadlines…"
              rows={3}
            />
          </label>
        </div>
      </details>

      <div className="intake-actions">
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
          {submitting ? 'Capturing…' : 'Capture Project'}
        </button>
      </div>
    </form>
  );
}
