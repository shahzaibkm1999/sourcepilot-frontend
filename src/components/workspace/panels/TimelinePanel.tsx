import { useEffect, useState } from 'react';
import { Timeline } from '../../../types';
import { api } from '../../../services/api';
import StagePanelShell from '../StagePanelShell';

interface TimelinePanelProps {
  projectId: string;
  onAfterChange: () => void;
}

export default function TimelinePanel({ projectId, onAfterChange }: TimelinePanelProps) {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await api.getTimeline(projectId).catch(() => null);
        if (!cancelled) setTimeline(result?.timeline ?? null);
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
      const { timeline } = await api.generateTimeline(projectId);
      setTimeline(timeline);
      onAfterChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <StagePanelShell eyebrow="Stage 6 of 8" title="Timeline" body={<p className="muted">Loading…</p>} />;
  }
  if (!timeline) {
    return (
      <StagePanelShell
        eyebrow="Stage 6 of 8"
        title="Timeline"
        actions={
          <button type="button" className="primary-button" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate Timeline'}
          </button>
        }
        body={
          <div className="panel-shell-empty">
            <h3>No timeline yet</h3>
            <p>Click <strong>Generate Timeline</strong> to produce a phased project roadmap with milestones.</p>
            {error && <p className="error-text" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}
          </div>
        }
      />
    );
  }

  return (
    <StagePanelShell
      eyebrow="Stage 6 of 8"
      title="Timeline"
      version={timeline.version}
      createdAt={timeline.created_at}
      statusLabel={`${timeline.total_weeks ?? '?'} weeks`}
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
              <div className="estimate-summary-cell-label">Total duration</div>
              <div className="estimate-summary-cell-value">
                {timeline.total_weeks ?? '?'} weeks · {(timeline.phases ?? []).length} phases
              </div>
            </div>
          </div>

          <h3 className="panel-section-title">Phases</h3>
          <div className="timeline-phases">
            {(timeline.phases ?? []).map((p, i) => (
              <div key={i} className="timeline-phase-bar">
                <div className="timeline-phase-name">{p.name}</div>
                <div className="timeline-phase-weeks">{p.duration_weeks}w</div>
              </div>
            ))}
          </div>

          <h3 className="panel-section-title">Milestones</h3>
          {(timeline.phases ?? []).map((p, i) => (
            <div key={i} style={{ marginBottom: 'var(--space-4)' }}>
              <div className="panel-section-title" style={{ marginTop: 0, color: 'var(--color-ink)', borderBottom: 0, paddingBottom: 0, fontSize: '0.85rem', textTransform: 'none', letterSpacing: 0 }}>
                {p.name} · {p.duration_weeks}w
              </div>
              <ul className="panel-list">
                {p.milestones.map((m, j) => <li key={j}>{m}</li>)}
              </ul>
            </div>
          ))}

          {timeline.content && (
            <details style={{ marginTop: 'var(--space-5)' }}>
              <summary className="muted" style={{ cursor: 'pointer', fontSize: '0.85rem' }}>
                Show raw markdown
              </summary>
              <pre className="proposal-content" style={{ marginTop: 'var(--space-3)' }}>
                {timeline.content}
              </pre>
            </details>
          )}
          {error && <p className="error-text" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}
        </div>
      }
    />
  );
}
