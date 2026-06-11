import { useCallback, useEffect, useRef, useState } from 'react';
import { ProjectWithDocuments, DocType, ProjectDocument } from '../types';
import { api } from '../services/api';
import { audienceLabel } from '../utils/audience';
import { formatRelative } from '../utils/date';
import StatusChip from '../components/ui/StatusChip';
import DocumentList from '../components/document/DocumentList';
import DocumentViewer from '../components/document/DocumentViewer';
import '../styles/project-detail.css';

interface ProjectDetailPageProps {
  projectId: string;
  onBack: () => void;
}

const HIGHLIGHT_MS = 3500;

/**
 * ProjectDetailPage
 * -----------------
 * Shows the captured project, two Generate buttons, the list of
 * documents, and an inline document viewer. All on one page — the
 * document viewer is not a separate route.
 *
 * Both the top-level "Generate [type]" buttons and the viewer's
 * "Regenerate" button call the same `api.generateDocument`
 * endpoint with the appropriate `doc_type`. We track the in-flight
 * type in `busyType` so only the matching button is disabled.
 */
export default function ProjectDetailPage({ projectId, onBack }: ProjectDetailPageProps) {
  const [project, setProject] = useState<ProjectWithDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyType, setBusyType] = useState<DocType | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null);
  const highlightTimer = useRef<number | null>(null);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { project } = await api.getProject(projectId);
        if (cancelled) return;
        setProject(project);
        // Auto-select the most recent document so the page is useful
        // the moment it loads (only if the user hasn't already
        // selected one — but this is the first load, so always).
        if (project.documents.length > 0) {
          setSelectedId(project.documents[0].id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load project');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Clear the just-created highlight after a few seconds.
  useEffect(() => {
    if (!justCreatedId) return;
    if (highlightTimer.current !== null) {
      window.clearTimeout(highlightTimer.current);
    }
    highlightTimer.current = window.setTimeout(() => {
      setJustCreatedId(null);
      highlightTimer.current = null;
    }, HIGHLIGHT_MS);
    return () => {
      if (highlightTimer.current !== null) {
        window.clearTimeout(highlightTimer.current);
        highlightTimer.current = null;
      }
    };
  }, [justCreatedId]);

  const generate = useCallback(
    async (docType: DocType) => {
      if (busyType) return; // already generating
      setBusyType(docType);
      setError(null);
      try {
        const { document } = await api.generateDocument(projectId, docType);
        // Append the new document to local state. We prepend so
        // newest is first, matching the list's sort order.
        setProject((prev) =>
          prev ? { ...prev, documents: [document, ...prev.documents] } : prev,
        );
        setSelectedId(document.id);
        setJustCreatedId(document.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Generation failed');
      } finally {
        setBusyType(null);
      }
    },
    [busyType, projectId],
  );

  if (loading && !project) {
    return (
      <div className="project-detail-page project-detail-page--loading">
        <button type="button" className="ghost-button" onClick={onBack}>
          <span aria-hidden="true">←</span> Back to projects
        </button>
        <p className="muted">Loading project…</p>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="project-detail-page">
        <button type="button" className="ghost-button" onClick={onBack}>
          <span aria-hidden="true">←</span> Back to projects
        </button>
        <p className="error-text">⚠ {error}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-page">
        <button type="button" className="ghost-button" onClick={onBack}>
          <span aria-hidden="true">←</span> Back to projects
        </button>
        <p className="error-text">Project not found.</p>
      </div>
    );
  }

  const hasProposal = project.documents.some((d) => d.doc_type === 'proposal');
  const hasTechScope = project.documents.some((d) => d.doc_type === 'tech_scope');
  const proposalCount = project.documents.filter((d) => d.doc_type === 'proposal').length;
  const techScopeCount = project.documents.filter((d) => d.doc_type === 'tech_scope').length;

  const selectedDoc = selectedId
    ? project.documents.find((d) => d.id === selectedId) ?? null
    : null;

  return (
    <div className="project-detail-page">
      <button type="button" className="ghost-button back-button" onClick={onBack}>
        <span aria-hidden="true">←</span> Back to projects
      </button>

      <header className="project-detail-header">
        <div className="project-detail-eyebrow">Project</div>
        <h1 className="project-detail-title">{project.name}</h1>
        {project.client_name && (
          <div className="project-detail-client muted">for {project.client_name}</div>
        )}

        <div className="project-detail-chips">
          <StatusChip tone="audience" label={audienceLabel(project.audience)} />
          {project.project_type && (
            <StatusChip tone="type" label={project.project_type} />
          )}
          <span className="muted project-detail-time">
            created {formatRelative(project.created_at)}
          </span>
        </div>

        {project.raw_requirement && (
          <details className="project-detail-requirement" open>
            <summary className="muted">Raw requirement</summary>
            <p>{project.raw_requirement}</p>
          </details>
        )}
      </header>

      {error && (
        <div className="project-detail-error">
          <strong>Something went wrong.</strong> {error}
        </div>
      )}

      <section className="project-detail-generate" aria-label="Generate a document">
        <h2 className="project-detail-section-title">Generate</h2>
        <div className="generate-row">
          <button
            type="button"
            className="primary-button"
            onClick={() => generate('proposal')}
            disabled={busyType !== null}
          >
            {busyType === 'proposal'
              ? 'Generating…'
              : hasProposal
                ? `Regenerate Non-Technical Proposal · ${proposalCount} on file`
                : 'Generate Non-Technical Proposal'}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => generate('tech_scope')}
            disabled={busyType !== null}
          >
            {busyType === 'tech_scope'
              ? 'Generating…'
              : hasTechScope
                ? `Regenerate Technical Proposal · ${techScopeCount} on file`
                : 'Generate Technical Proposal'}
          </button>
        </div>
        <p className="muted generate-hint">
          Same intake, two proposal variants — one for a non-technical
          client, one for a technical client.{' '}
          {project.audience === 'non_tecnico'
            ? 'This project is set to a non-technical client — the non-technical proposal is the natural pick.'
            : 'This project is set to a technical client — the technical proposal is the natural pick.'}
        </p>
      </section>

      <section className="project-detail-documents" aria-label="Generated documents">
        <h2 className="project-detail-section-title">Documents</h2>
        <DocumentList
          documents={project.documents}
          selectedId={selectedId}
          justCreatedId={justCreatedId}
          onSelect={(id) => setSelectedId((prev) => (prev === id ? null : id))}
        />
      </section>

      {selectedDoc && (
        <section className="project-detail-viewer" aria-label="Document viewer">
          <DocumentViewer
            doc={selectedDoc}
            project={project}
            regenerating={busyType === selectedDoc.doc_type}
            onRegenerate={(dt) => generate(dt)}
            onClose={() => setSelectedId(null)}
          />
        </section>
      )}
    </div>
  );
}

// Keep an unused-import guard: ProjectDocument is re-exported by the
// types module so future code can use it without a re-import.
export type { ProjectDocument };
