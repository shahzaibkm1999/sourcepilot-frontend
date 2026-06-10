import { useEffect, useState } from 'react';
import { Proposal } from '../../../types';
import { api } from '../../../services/api';
import StagePanelShell from '../StagePanelShell';

interface ProposalPanelProps {
  projectId: string;
  onAfterChange: () => void;
}

export default function ProposalPanel({ projectId, onAfterChange }: ProposalPanelProps) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await api.getProposal(projectId).catch(() => null);
        if (!cancelled) setProposal(result?.proposal ?? null);
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
      const { proposal } = await api.generateProposal(projectId);
      setProposal(proposal);
      onAfterChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!proposal?.content) return;
    const blob = new Blob([proposal.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposal-v${proposal.version}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <StagePanelShell eyebrow="Stage 7 of 8" title="Proposal" body={<p className="muted">Loading…</p>} />;
  }
  if (!proposal) {
    return (
      <StagePanelShell
        eyebrow="Stage 7 of 8"
        title="Proposal"
        actions={
          <button type="button" className="primary-button" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate Proposal'}
          </button>
        }
        body={
          <div className="panel-shell-empty">
            <h3>No proposal yet</h3>
            <p>
              Click <strong>Generate Proposal</strong> to produce a client-ready
              proposal that wraps the entire pre-spec pipeline.
            </p>
            {error && <p className="error-text" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}
          </div>
        }
      />
    );
  }

  return (
    <StagePanelShell
      eyebrow="Stage 7 of 8"
      title="Proposal"
      version={proposal.version}
      createdAt={proposal.created_at}
      statusLabel="complete"
      statusTone="complete"
      actions={
        <>
          <button type="button" className="ghost-button" onClick={handleDownload} title="Download as Markdown">
            ↓ .md
          </button>
          <button type="button" className="ghost-button" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Regenerating…' : 'Regenerate'}
          </button>
        </>
      }
      body={
        <div>
          {proposal.executivo_summary && (
            <div className="proposal-hero">
              <div className="proposal-hero-summary">{proposal.executivo_summary}</div>
            </div>
          )}

          <h3 className="panel-section-title">Deliverables</h3>
          <ul className="panel-list">
            {(proposal.deliverables ?? []).map((d, i) => <li key={i}>{d}</li>)}
          </ul>

          {proposal.understanding && (
            <div className="proposal-section">
              <div className="proposal-section-title">Understanding</div>
              <p className="proposal-section-body">{proposal.understanding}</p>
            </div>
          )}

          {proposal.scope_summary && (
            <div className="proposal-section">
              <div className="proposal-section-title">Scope summary</div>
              <p className="proposal-section-body">{proposal.scope_summary}</p>
            </div>
          )}

          {proposal.content && (
            <>
              <h3 className="panel-section-title">Full proposal</h3>
              <pre className="proposal-content">{proposal.content}</pre>
            </>
          )}
          {error && <p className="error-text" style={{ marginTop: 'var(--space-3)' }}>{error}</p>}
        </div>
      }
    />
  );
}
