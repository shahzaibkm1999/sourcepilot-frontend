import { useState, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import IdeaInput from '../components/IdeaInput';
import SpecViewer from '../components/SpecViewer';
import { useSpecs } from '../hooks/useSpecs';
import { api } from '../services/api';
import { ViewerContent, SpecificationWithProject } from '../types';
import '../styles/dashboard.css';

export default function Dashboard() {
  const { specs, loading: specsLoading, error: specsError, refresh } = useSpecs();
  const [viewer, setViewer] = useState<ViewerContent>({ kind: 'idle' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleGenerate = useCallback(
    async (projectIdea: string) => {
      setIsGenerating(true);
      setViewer({ kind: 'loading', message: 'Generating specification with Gemini…' });
      try {
        const { specification } = await api.generateSpec(projectIdea);
        setViewer({ kind: 'saved', spec: specification });
        // Refresh the sidebar so the new spec shows up at the top.
        await refresh();
      } catch (err) {
        setViewer({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Generation failed',
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [refresh],
  );

  const handleRegenerate = useCallback(
    async (spec: SpecificationWithProject) => {
      setIsRegenerating(true);
      setViewer({ kind: 'loading', message: `Regenerating v${spec.version + 1} with Gemini…` });
      try {
        // Use the project's original one-line description as the regen idea.
        // Falls back to the first chunk of the saved markdown if no description.
        const idea =
          spec.project?.description?.trim() ||
          spec.content.split('\n').find((l) => l.trim().length > 10)?.trim() ||
          spec.project?.name ||
          'project';
        const { specification } = await api.generateSpec(idea);
        setViewer({ kind: 'saved', spec: specification });
        await refresh();
      } catch (err) {
        setViewer({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Regeneration failed',
        });
      } finally {
        setIsRegenerating(false);
      }
    },
    [refresh],
  );

  const handleSelectSpec = useCallback((spec: SpecificationWithProject) => {
    setViewer({ kind: 'saved', spec });
  }, []);

  return (
    <div className="dashboard">
      <Sidebar
        specs={specs}
        loading={specsLoading}
        error={specsError}
        onSelect={handleSelectSpec}
        onRefresh={refresh}
        activeSpecId={viewer.kind === 'saved' ? viewer.spec.id : null}
      />
      <main className="main-panel">
        <header className="main-header">
          <div className="main-header-inner">
            <div className="main-header-eyebrow">Spec-Driven Development</div>
            <h1>AI Software Planning Assistant</h1>
            <p className="subtitle">
              Turn a one-line project idea into a complete, spec-kit-compliant plan.
            </p>
          </div>
        </header>

        <section className="idea-section">
          <IdeaInput onSubmit={handleGenerate} disabled={isGenerating || isRegenerating} />
        </section>

        <section className="viewer-section">
          <SpecViewer
            content={viewer}
            onRegenerate={handleRegenerate}
            isRegenerating={isRegenerating}
          />
        </section>
      </main>
    </div>
  );
}
