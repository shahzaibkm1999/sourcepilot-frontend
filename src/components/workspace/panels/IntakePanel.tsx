import { useEffect, useState } from 'react';
import { Intake } from '../../../types';
import { api } from '../../../services/api';
import { formatRelative } from '../../../utils/date';
import StagePanelShell from '../StagePanelShell';

interface IntakePanelProps {
  projectId: string;
  onAfterChange: () => void;
}

/**
 * IntakePanel
 * -----------
 * Read-only display of the project's intake. The intake is captured
 * once at the dashboard's "New Project" flow and is not regenerated.
 */
export default function IntakePanel({ projectId, onAfterChange: _on }: IntakePanelProps) {
  const [intake, setIntake] = useState<Intake | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { intake } = await api.getIntake(projectId);
        if (!cancelled) setIntake(intake);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load intake');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <StagePanelShell
        eyebrow="Stage 1 of 8"
        title="Intake"
        body={<p className="muted">Loading intake…</p>}
      />
    );
  }
  if (error || !intake) {
    return (
      <StagePanelShell
        eyebrow="Stage 1 of 8"
        title="Intake"
        body={
          <div className="panel-shell-empty">
            <h3>No intake yet</h3>
            <p>
              Intakes are captured when the project is first created from the
              dashboard. Use the back link and click <strong>+ New Project</strong> to
              start a fresh intake.
            </p>
          </div>
        }
      />
    );
  }

  return (
    <StagePanelShell
      eyebrow="Stage 1 of 8"
      title="Intake"
      version={intake.version}
      createdAt={intake.created_at}
      statusLabel="captured"
      statusTone="complete"
      body={
        <div>
          <h3 className="panel-section-title">Client requirement</h3>
          <div className="intake-requirement">{intake.requirement}</div>

          <h3 className="panel-section-title">Metadata</h3>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            {intake.project_type && (
              <span className="chip chip-type">{intake.project_type}</span>
            )}
            {intake.engagement && (
              <span className="chip chip-engagement">
                {intake.engagement === 'fixed_price' ? 'fixed price' : 'hourly'}
              </span>
            )}
            {intake.timeline_pref && (
              <span className="chip chip-stage">{intake.timeline_pref}</span>
            )}
          </div>

          {intake.details && (
            <>
              <h3 className="panel-section-title">Additional details</h3>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--color-ink-muted)', whiteSpace: 'pre-wrap' }}>
                {intake.details}
              </p>
            </>
          )}

          {intake.constraints && (
            <>
              <h3 className="panel-section-title">Constraints</h3>
              <p style={{ fontSize: '0.9rem', lineHeight: 1.55, color: 'var(--color-ink-muted)', whiteSpace: 'pre-wrap' }}>
                {intake.constraints}
              </p>
            </>
          )}

          <p className="muted" style={{ marginTop: 'var(--space-5)', fontSize: '0.78rem' }}>
            captured {formatRelative(intake.created_at)}
          </p>
        </div>
      }
    />
  );
}
