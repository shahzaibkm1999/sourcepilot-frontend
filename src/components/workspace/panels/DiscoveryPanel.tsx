import { useEffect, useState } from 'react';
import { Discovery } from '../../../types';
import { api } from '../../../services/api';
import StagePanelShell from '../StagePanelShell';

interface DiscoveryPanelProps {
  projectId: string;
  onAfterChange: () => void;
}

export default function DiscoveryPanel({ projectId, onAfterChange }: DiscoveryPanelProps) {
  const [discovery, setDiscovery] = useState<Discovery | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await api.getDiscovery(projectId).catch(() => null);
        if (!cancelled) setDiscovery(result?.discovery ?? null);
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
      const { discovery } = await api.generateDiscovery(projectId);
      setDiscovery(discovery);
      onAfterChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <StagePanelShell eyebrow="Stage 2 of 8" title="Discovery" body={<p className="muted">Loading…</p>} />;
  }

  if (!discovery) {
    return (
      <StagePanelShell
        eyebrow="Stage 2 of 8"
        title="Discovery"
        actions={
          <button
            type="button"
            className="primary-button"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating…' : 'Generate Discovery'}
          </button>
        }
        body={
          <div className="panel-shell-empty">
            <h3>No discovery yet</h3>
            <p>
              Click <strong>Generate Discovery</strong> to ask the model to
              surface ambiguities, missing information, and risks from the
              intake.
            </p>
            {error && <p className="error-text" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}
          </div>
        }
      />
    );
  }

  return (
    <StagePanelShell
      eyebrow="Stage 2 of 8"
      title="Discovery"
      version={discovery.version}
      createdAt={discovery.created_at}
      statusLabel="complete"
      statusTone="complete"
      actions={
        <button type="button" className="ghost-button" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Regenerating…' : 'Regenerate'}
        </button>
      }
      body={
        <div>
          <h3 className="panel-section-title">Ambiguities</h3>
          <ul className="panel-list">
            {(discovery.ambiguities ?? []).map((a, i) => (
              <li key={i}>
                <span className={`panel-severity-chip panel-severity-chip--${a.priority}`}>
                  {a.priority}
                </span>
                <strong>{a.area}.</strong> {a.question}
              </li>
            ))}
          </ul>

          <h3 className="panel-section-title">Missing information</h3>
          <ul className="panel-list">
            {(discovery.missing_info ?? []).map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>

          <h3 className="panel-section-title">Risks</h3>
          <ul className="panel-list">
            {(discovery.risks ?? []).map((r, i) => (
              <li key={i}>
                <span className={`panel-severity-chip panel-severity-chip--${r.severity}`}>
                  {r.severity}
                </span>
                <strong>{r.title}</strong>
                {r.mitigation && (
                  <>
                    <br />
                    <span className="muted" style={{ fontSize: '0.85rem' }}>
                      Mitigation: {r.mitigation}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>

          <h3 className="panel-section-title">Assumptions</h3>
          <ul className="panel-list">
            {(discovery.assumptions ?? []).map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>

          {discovery.content && (
            <details style={{ marginTop: 'var(--space-5)' }}>
              <summary className="muted" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                Show raw markdown view
              </summary>
              <pre className="proposal-content" style={{ marginTop: 'var(--space-3)' }}>
                {discovery.content}
              </pre>
            </details>
          )}
          {error && <p className="error-text" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}
        </div>
      }
    />
  );
}
