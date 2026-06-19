import { ReactNode } from 'react';
import '../../styles/empty-state.css';

interface EmptyStateProps {
  /** Optional small monospace label, e.g. "no projects". */
  eyebrow?: string;
  /** Italic serif title — the heading of the empty state. */
  title: string;
  /** Optional supporting copy below the title. */
  description?: string;
  /** Optional CTA. A button, a link, whatever the page needs. */
  action?: ReactNode;
}

/**
 * EmptyState
 * ----------
 * Reusable empty-state block. Used by the project list and the
 * version history. Looks like a small editorial pull-quote:
 * short rule + italic title + body, with optional action below.
 */
export default function EmptyState({
  eyebrow,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-rule" aria-hidden="true" />
      {eyebrow && <div className="empty-state-eyebrow">{eyebrow}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
