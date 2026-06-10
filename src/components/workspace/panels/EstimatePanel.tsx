import { useEffect, useState } from 'react';
import { Estimate } from '../../../types';
import { api } from '../../../services/api';
import StagePanelShell from '../StagePanelShell';

interface EstimatePanelProps {
  projectId: string;
  onAfterChange: () => void;
}

function formatCurrency(min: number, max: number, currency: string): string {
  const fmt = (n: number) =>
    `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `${fmt(min)} – ${fmt(max)}`;
}

export default function EstimatePanel({ projectId, onAfterChange }: EstimatePanelProps) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await api.getEstimate(projectId).catch(() => null);
        if (!cancelled) setEstimate(result?.estimate ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const { estimate } = await api.generateEstimate(projectId);
      setEstimate(estimate);
      onAfterChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <StagePanelShell eyebrow="Stage 5 of 8" title="Estimate" body={<p className="muted">Loading…</p>} />;
  }
  if (!estimate) {
    return (
      <StagePanelShell
        eyebrow="Stage 5 of 8"
        title="Estimate"
        actions={
          <button type="button" className="primary-button" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate Estimate'}
          </button>
        }
        body={
          <div className="panel-shell-empty">
            <h3>No estimate yet</h3>
            <p>Click <strong>Generate Estimate</strong> to produce per-area effort, complexity, and confidence.</p>
            {error && <p className="error-text" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}
          </div>
        }
      />
    );
  }

  const totalLow = estimate.total_hours_low ?? 0;
  const totalHigh = estimate.total_hours_high ?? 0;

  return (
    <StagePanelShell
      eyebrow="Stage 5 of 8"
      title="Estimate"
      version={estimate.version}
      createdAt={estimate.created_at}
      statusLabel="complete"
      statusTone="complete"
      actions={
        <button type="button" className="ghost-button" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Regenerating…' : 'Regenerate'}
        </button>
      }
      body={
        <div>
          <div className="estimate-summary">
            <div>
              <div className="estimate-summary-cell-label">Total hours</div>
              <div className="estimate-summary-cell-value">
                {totalLow} – {totalHigh}
              </div>
            </div>
            {estimate.budget_range && (
              <div>
                <div className="estimate-summary-cell-label">Fixed-price range</div>
                <div className="estimate-summary-cell-value">
                  {formatCurrency(estimate.budget_range.min, estimate.budget_range.max, estimate.budget_range.currency)}
                </div>
              </div>
            )}
            {estimate.risk_buffer !== null && estimate.risk_buffer !== undefined && (
              <div>
                <div className="estimate-summary-cell-label">Risk buffer</div>
                <div className="estimate-summary-cell-value">
                  {estimate.risk_buffer.toLocaleString()} hours
                </div>
              </div>
            )}
          </div>

          <h3 className="panel-section-title">Effort by area</h3>
          <table className="panel-table">
            <thead>
              <tr>
                <th>Area</th>
                <th>Hours</th>
                <th>Complexity</th>
                <th>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {(estimate.items ?? []).map((i, idx) => (
                <tr key={idx}>
                  <td>{i.area}</td>
                  <td>{i.hours}</td>
                  <td>{i.complejidad}</td>
                  <td>{i.confidence}</td>
                </tr>
              ))}
              <tr>
                <td>Total</td>
                <td>
                  {totalLow} – {totalHigh}
                </td>
                <td>—</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>

          {estimate.content && (
            <details style={{ marginTop: 'var(--space-5)' }}>
              <summary className="muted" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                Show raw markdown
              </summary>
              <pre className="proposal-content" style={{ marginTop: 'var(--space-3)' }}>
                {estimate.content}
              </pre>
            </details>
          )}
          {error && <p className="error-text" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}
        </div>
      }
    />
  );
}
