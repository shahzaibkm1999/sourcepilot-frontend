import { useState } from 'react';
import IntakeForm from '../components/intake/IntakeForm';
import { api } from '../services/api';
import { Project, Completeness, ProjectType, Engagement, TimelinePref } from '../types';
import { renderMarkdown } from '../utils/markdown';
import '../styles/intake.css';

interface IntakePageProps {
  onCreated: (project: Project, completeness: Completeness) => void;
  onCancel: () => void;
}

/**
 * IntakePage
 * ----------
 * The full intake experience: form on the left, helpful "what
 * happens next" copy on the right. On submit, it calls the
 * orchestrator's `create_intake` and reports back.
 */
export default function IntakePage({ onCreated, onCancel }: IntakePageProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (input: {
    projectName: string;
    projectType?: ProjectType;
    engagement?: Engagement;
    timelinePref?: TimelinePref;
    requirement: string;
    details?: string;
    constraints?: string;
  }) => {
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.createIntake(input);
      onCreated(result.project, result.completeness);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to capture project');
    } finally {
      setSubmitting(false);
    }
  };

  const nextStepsHtml = renderMarkdown(NEXT_STEPS_MD);

  return (
    <div className="intake-page">
      <header className="intake-page-header">
        <button
          type="button"
          className="ghost-button back-button"
          onClick={onCancel}
        >
          <span aria-hidden="true">←</span> Back to projects
        </button>
        <div className="intake-page-eyebrow">SourcePilot</div>
        <h1>Capture a new project</h1>
        <p className="subtitle">
          Turn a client requirement into a living source of truth.
          Every answer you give here is versioned and traceable.
        </p>
      </header>

      {error && (
        <div className="intake-error">
          <strong>Could not capture the project.</strong> {error}
        </div>
      )}

      <div className="intake-page-grid">
        <section className="intake-form-section">
          <IntakeForm
            onSubmit={handleSubmit}
            onCancel={onCancel}
            submitting={submitting}
          />
        </section>

        <aside className="intake-sidecar">
          <div className="intake-sidecar-inner">
            <div className="intake-sidecar-rule" aria-hidden="true" />
            <h2 className="intake-sidecar-title">What happens next</h2>
            <div
              className="intake-sidecar-body"
              dangerouslySetInnerHTML={{ __html: nextStepsHtml }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

const NEXT_STEPS_MD = `Once you capture a project, SourcePilot walks you through:

1. **Discovery** — AI surfaces ambiguities, missing information, and risks
2. **Clarification** — Answer the questions; requirements are refined
3. **Scope** — In/out of scope, dependencies, assumptions
4. **Estimate** — Effort by area, with confidence and complexity ratings
5. **Timeline** — Phased roadmap with milestones
6. **Proposal** — Client-ready markdown, downloadable
7. **Specification** — Spec-Kit-compliant technical spec
8. **Plan & Tasks** — Implementation breakdown

Every step is **versioned**, **linked**, and shown in the **lineage drawer** so you can trace how the final spec evolved from the original requirement.

The **completeness score** updates as you go — when it hits 100%, the project is proposal-ready and spec-ready.`;
