import { useEffect, useState } from 'react';
import { Clarification, ClarificationQuestion } from '../../../types';
import { api } from '../../../services/api';
import StagePanelShell from '../StagePanelShell';

interface ClarificationPanelProps {
  projectId: string;
  onAfterChange: () => void;
}

export default function ClarificationPanel({ projectId, onAfterChange }: ClarificationPanelProps) {
  const [clarification, setClarification] = useState<Clarification | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await api.listClarifications(projectId).catch(() => ({ clarifications: [] }));
        if (cancelled) setClarification(list.clarifications[0] ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId]);

  // Seed local answers from server data whenever a new clarification
  // version loads.
  useEffect(() => {
    if (!clarification) return;
    const seed: Record<string, string> = {};
    for (const q of clarification.questions) {
      if (q.answer) seed[q.id] = q.answer;
    }
    setAnswers((prev) => ({ ...seed, ...prev }));
  }, [clarification?.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const { clarification: fresh } = await api.generateClarifications(projectId);
      setClarification(fresh);
      onAfterChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!clarification) return;
    setSaving(true);
    setError(null);
    try {
      const mergedQuestions: ClarificationQuestion[] = clarification.questions.map((q) => {
        const local = answers[q.id];
        const answer = (local && local.trim()) || q.answer || null;
        return {
          ...q,
          answer,
          status: answer ? 'answered' : 'pending',
        };
      });
      const { clarification: saved } = await api.saveClarifications({
        projectId,
        questions: mergedQuestions,
      });
      setClarification(saved);
      setAnswers({}); // reset, the new version becomes the source
      onAfterChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <StagePanelShell eyebrow="Stage 3 of 8" title="Clarification" body={<p className="muted">Loading…</p>} />;
  }

  if (!clarification || clarification.questions.length === 0) {
    return (
      <StagePanelShell
        eyebrow="Stage 3 of 8"
        title="Clarification"
        actions={
          <button
            type="button"
            className="primary-button"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating…' : 'Generate Questions'}
          </button>
        }
        body={
          <div className="panel-shell-empty">
            <h3>No clarifications yet</h3>
            <p>
              Click <strong>Generate Questions</strong> to ask the model for the
              next batch of high-impact questions for the client.
            </p>
            {error && <p className="error-text" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}
          </div>
        }
      />
    );
  }

  const totalAnswered = clarification.questions.filter((q) => q.status === 'answered').length;

  return (
    <StagePanelShell
      eyebrow="Stage 3 of 8"
      title="Clarification"
      version={clarification.version}
      createdAt={clarification.created_at}
      statusLabel={`${totalAnswered} / ${clarification.questions.length} answered`}
      statusTone={totalAnswered === clarification.questions.length ? 'complete' : 'stale'}
      actions={
        <button
          type="button"
          className="ghost-button"
          onClick={handleGenerate}
          disabled={generating || saving}
        >
          {generating ? 'Generating…' : 'New batch'}
        </button>
      }
      body={
        <div>
          {clarification.refined_input && (
            <details style={{ marginBottom: 'var(--space-4)' }}>
              <summary className="muted" style={{ cursor: 'pointer', fontSize: '0.78rem' }}>
                Refined requirement
              </summary>
              <pre className="proposal-content" style={{ marginTop: 'var(--space-2)', fontSize: '0.85rem' }}>
                {clarification.refined_input}
              </pre>
            </details>
          )}

          {clarification.questions.map((q) => {
            const isAnswered = q.status === 'answered' || (answers[q.id] && answers[q.id].trim().length > 0);
            return (
              <div key={q.id} className="clarification-row">
                <div className="clarification-question">
                  <span className="clarification-area-chip">{q.area}</span>
                  <span>{q.question}</span>
                </div>
                <textarea
                  className="clarification-answer-input"
                  placeholder="Type the client's answer…"
                  value={answers[q.id] ?? q.answer ?? ''}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                  }
                />
                <div
                  className={`clarification-row-status ${
                    isAnswered ? 'clarification-row-status--answered' : ''
                  }`}
                >
                  {isAnswered ? '✓ answered' : 'pending'}
                </div>
              </div>
            );
          })}

          <div className="clarification-actions">
            <button
              type="button"
              className="primary-button"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save Answers'}
            </button>
          </div>
          {error && <p className="error-text" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}
        </div>
      }
    />
  );
}
