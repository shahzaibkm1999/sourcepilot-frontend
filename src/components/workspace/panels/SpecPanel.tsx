import { api } from '../../../services/api';
import StagePanelShell from '../StagePanelShell';

interface SpecPanelProps {
  projectId: string;
  onAfterChange: () => void;
}

/**
 * SpecPanel
 * ---------
 * Stub for the legacy specification stage. The full spec viewer
 * lives in the original /api/specifications/generate flow and is
 * reachable via the dashboard's old path. This panel surfaces that
 * as a "Generate new spec" action using the existing endpoint.
 */
export default function SpecPanel({ projectId }: SpecPanelProps) {
  const handleGenerate = async () => {
    const projectIdShort = projectId.slice(0, 8);
    const idea = window.prompt('One-line project idea for the new spec:', `Project ${projectIdShort}`);
    if (!idea) return;
    try {
      await api.generateSpec(idea);
      // The legacy endpoint saves to the existing project by name. A
      // refresh of the workspace would be a Phase 6 addition.
      window.alert('Spec generated. It will appear in the lineage drawer after a refresh.');
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Generation failed');
    }
  };

  return (
    <StagePanelShell
      eyebrow="Stage 8 of 8"
      title="Specification"
      statusLabel="not yet generated"
      actions={
        <button type="button" className="primary-button" onClick={handleGenerate}>
          Generate new spec
        </button>
      }
      body={
        <div className="panel-shell-empty">
          <h3>Specification stage</h3>
          <p>
            Click <strong>Generate new spec</strong> to run the legacy
            spec-kit flow against this project. The spec will be saved
            to Supabase and appear in the lineage drawer on refresh.
          </p>
          <p className="muted" style={{ marginTop: 'var(--space-3)', fontSize: '0.85rem' }}>
            The full Spec-Kit stage with workspace embedding ships in
            the next push.
          </p>
        </div>
      }
    />
  );
}
