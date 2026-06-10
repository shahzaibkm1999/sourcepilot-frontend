import { useEffect, useState } from 'react';
import { Scope } from '../../../types';
import { api } from '../../../services/api';
import StagePanelShell from '../StagePanelShell';

interface ScopePanelProps {
  projectId: string;
  onAfterChange: () => void;
}

export default function ScopePanel({ projectId, onAfterChange }: ScopePanelProps) {
  const [scope, setScope] = useState<Scope | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await api.getScope(projectId).catch(() => null);
        if (!cancelled) setScope(result?.scope ?? null);
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
      const { scope } = await api.generateScope(projectId);
      setScope(scope);
      onAfterChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <StagePanelShell eyebrow="Stage 4 of 8" title="Scope" body={<p className="muted">Loading…</p>} />;
  }
  if (!scope) {
    return (
      <StagePanelShell
        eyebrow="Stage 4 of 8"
        title="Scope"
        actions={
          <button type="button" className="primary-button" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate Scope'}
          </button>
        }
        body={
          <div className="panel-shell-empty">
            <h3>No scope yet</h3>
            <p>Click <strong>Generate Scope</strong> to produce the in/out scope, dependencies, assumptions, and risks.</p>
            {error && <p className="error-text" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}
          </div>
        }
      />
    );
  }

  return (
    <StagePanelShell
      eyebrow="Stage 4 of 8"
      title="Scope"
      version={scope.version}
      createdAt={scope.created_at}
      statusLabel="complete"
      statusTone="complete"
      actions={
        <button type="button" className="ghost-button" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Regenerating…' : 'Regenerate'}
        </button>
      }
      body={
        <div>
          <h3 className="panel-section-title">In scope</h3>
          <ul className="panel-list">
            {(scope.in_scope ?? []).map((s, i) => <li key={i}>{s}</li>)}
          </ul>

          <h3 className="panel-section-title">Out of scope</h3>
          <ul className="panel-list panel-list--out">
            {(scope.out_of_scope ?? []).map((s, i) => <li key={i}>{s}</li>)}
          </ul>

          {(scope.future_considerations ?? []).length > 0 && (
            <>
              <h3 className="panel-section-title">Future considerations</h3>
              <ul className="panel-list panel-list--future">
                {scope.future_considerations!.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </>
          )}

          <h3 className="panel-section-title">Dependencies</h3>
          <ul className="panel-list">
            {(scope.dependencies ?? []).map((s, i) => <li key={i}>{s}</li>)}
          </ul>

          <h3 className="panel-section-title">Assumptions</h3>
          <ul className="panel-list">
            {(scope.assumptions ?? []).map((s, i) => <li key={i}>{s}</li>)}
          </ul>

          <h3 className="panel-section-title">Risks</h3>
          <ul className="panel-list">
            {(scope.risks ?? []).map((s, i) => <li key={i}>{s}</li>)}
          </ul>

          {scope.content && (
            <details style={{ marginTop: 'var(--space-5)' }}>
              <summary className="muted" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                Show raw markdown
              </summary>
              <pre className="proposal-content" style={{ marginTop: 'var(--space-3)' }}>
                {scope.content}
              </pre>
            </details>
          )}
          {error && <p className="error-text" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}
        </div>
      }
    />
  );
}
