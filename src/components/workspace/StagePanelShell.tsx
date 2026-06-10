import { ReactNode } from 'react';
import { formatRelative } from '../../utils/date';

interface StagePanelShellProps {
  eyebrow: string;
  title: string;
  version?: number;
  createdAt?: string;
  statusLabel?: string;
  statusTone?: 'complete' | 'stale';
  actions?: ReactNode;
  body: ReactNode;
}

/**
 * StagePanelShell
 * ---------------
 * Shared frame for every SourcePilot stage panel. Renders an
 * eyebrow (stage number), big title, meta row (version + timestamp
 * + status), and the body content.
 */
export default function StagePanelShell({
  eyebrow,
  title,
  version,
  createdAt,
  statusLabel,
  statusTone,
  actions,
  body,
}: StagePanelShellProps) {
  return (
    <div className="panel-shell">
      <header className="panel-shell-header">
        <div className="panel-shell-eyebrow">{eyebrow}</div>
        <h2 className="panel-shell-title">{title}</h2>
        {(version !== undefined || createdAt || statusLabel || actions) && (
          <div className="panel-shell-meta">
            {version !== undefined && <span className="muted">v{version}</span>}
            {createdAt && <span>· {formatRelative(createdAt)}</span>}
            {statusLabel && (
              <span
                className={`panel-shell-status ${
                  statusTone === 'complete' ? 'panel-shell-status--complete' : ''
                }${statusTone === 'stale' ? 'panel-shell-status--stale' : ''}`}
              >
                {statusLabel}
              </span>
            )}
            {actions && <div className="panel-shell-actions">{actions}</div>}
          </div>
        )}
      </header>
      <div className="panel-shell-body">{body}</div>
    </div>
  );
}
