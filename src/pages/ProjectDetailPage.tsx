import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { ProjectWithDocuments, DocType, ProjectDocument } from '../types';
import { api } from '../services/api';
import { audienceLabel } from '../utils/audience';
import { formatRelative } from '../utils/date';
import { groupByDocType, versionNumber } from '../utils/documents';
import StatusChip from '../components/ui/StatusChip';
import ProjectForm, { ProjectFormValues } from '../components/project/ProjectForm';
import VersionHistory from '../components/document/VersionHistory';
// Lazy-load the viewer: it pulls in jspdf + html2canvas (~230 KB
// gzipped) which we don't need to ship on the projects list.
const DocumentViewer = lazy(() => import('../components/document/DocumentViewer'));
import '../styles/project-detail.css';

interface ProjectDetailPageProps {
  projectId: string;
  onBack: () => void;
}

const HIGHLIGHT_MS = 3500;

/**
 * Polling tuning. The interval is 2s so a typical 10-30s
 * generation surfaces within 2s of completing. The max-attempts
 * cap is the safety net for cases the backend reaper hasn't yet
 * caught (network partition, backend down). At 2s × 90 = 3 min we
 * exceed the backend's QUEUE_REAPER_MAX_AGE_MS (5 min) on the
 * pessimistic side, but well before forever.
 */
const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 90;

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
  const [editing, setEditing] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [busyDocId, setBusyDocId] = useState<string | null>(null);
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
        // The backend now returns a `pending` row in <2s; the AI
        // call continues in the background and updates the row
        // to `ready`/`failed`. We append the pending row locally
        // and let the polling effect pick up the state change.
        const { document } = await api.generateDocument(projectId, docType);
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

  /**
   * Poll `GET /api/projects/:id` while any document is `pending`,
   * so the row flips from spinner to body without the user
   * needing to refresh. Stops as soon as every doc is terminal
   * (`ready` or `failed`).
   *
   * Implementation notes:
   *   - Depends on the *boolean* `hasPending`, not the documents
   *     array. The array gets a new reference on every successful
   *     poll, which would tear down + recreate the interval each
   *     tick and waste the first 2s of every cycle.
   *   - 404 on the project (deleted server-side, or never existed)
   *     stops polling immediately and surfaces the error — without
   *     this the spinner runs forever.
   *   - A max-attempts cap is the safety net for any other reason
   *     the row never reaches a terminal state (network down,
   *     backend reaper not running, etc.).
   */
  const hasPending = project?.documents.some((d) => d.status === 'pending') ?? false;

  useEffect(() => {
    if (!hasPending) return;

    let attempts = 0;
    let cancelled = false;

    const interval = window.setInterval(async () => {
      if (cancelled) return;
      attempts += 1;

      if (attempts > POLL_MAX_ATTEMPTS) {
        window.clearInterval(interval);
        setError(
          'Generation is taking longer than expected. Refresh the page ' +
            'to check again, or click Regenerate to retry.',
        );
        return;
      }

      try {
        const { project: fresh } = await api.getProject(projectId);
        if (!cancelled) setProject(fresh);
      } catch (err) {
        // 404 means the project is gone — stop polling. Anything
        // else is treated as transient: the next tick will retry.
        const message = err instanceof Error ? err.message : String(err);
        if (/404|not found/i.test(message)) {
          window.clearInterval(interval);
          if (!cancelled) {
            setError('This project no longer exists.');
            setProject(null);
          }
        }
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hasPending, projectId]);

  const handleUpdateProject = useCallback(
    async (values: ProjectFormValues) => {
      setSavingProject(true);
      setError(null);
      try {
        const { project: updated } = await api.updateProject(projectId, {
          name: values.name,
          client_name: values.client_name === '' ? null : values.client_name,
          audience: values.audience,
          project_type: values.project_type === '' ? null : values.project_type,
          raw_requirement: values.raw_requirement,
        });
        // Merge the response into local state. Preserve documents.
        setProject((prev) =>
          prev
            ? { ...prev, ...updated, documents: prev.documents }
            : prev,
        );
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save project');
      } finally {
        setSavingProject(false);
      }
    },
    [projectId],
  );

  const handleDeleteProject = useCallback(async () => {
    if (deletingProject) return;
    const confirmed = window.confirm(
      `Delete project "${project?.name ?? ''}"? This removes the project AND all of its documents. This cannot be undone.`,
    );
    if (!confirmed) return;
    setDeletingProject(true);
    setError(null);
    try {
      await api.deleteProject(projectId);
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      setDeletingProject(false);
    }
  }, [deletingProject, project?.name, projectId, onBack]);

  const handleUpdateDocumentContent = useCallback(
    async (id: string, contentMarkdown: string) => {
      setBusyDocId(id);
      setError(null);
      try {
        const { document: updated } = await api.updateDocument(id, contentMarkdown);
        setProject((prev) =>
          prev
            ? {
                ...prev,
                documents: prev.documents.map((d) => (d.id === id ? updated : d)),
              }
            : prev,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save document');
        throw err; // let the viewer exit edit mode only on success
      } finally {
        setBusyDocId(null);
      }
    },
    [],
  );

  const handleDeleteDocument = useCallback(
    (id: string) => async () => {
      if (busyDocId) return;
      const docs = project?.documents ?? [];
      const doc = docs.find((d) => d.id === id);
      const group = doc
        ? groupByDocType(docs).find((g) => g.docType === doc.doc_type)
        : undefined;
      const versionLabel = group && doc ? `v${versionNumber(group, doc)}` : 'this version';
      const confirmed = window.confirm(
        `Delete ${versionLabel}? This cannot be undone.`,
      );
      if (!confirmed) return;
      setBusyDocId(id);
      setError(null);
      try {
        await api.deleteDocument(id);
        setProject((prev) =>
          prev
            ? { ...prev, documents: prev.documents.filter((d) => d.id !== id) }
            : prev,
        );
        if (selectedId === id) setSelectedId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete document');
      } finally {
        setBusyDocId(null);
      }
    },
    [busyDocId, project?.documents, selectedId],
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
        <div className="project-detail-eyebrow-row">
          <div className="project-detail-eyebrow">Project</div>
          {!editing && (
            <div className="project-detail-eyebrow-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setEditing(true)}
                disabled={deletingProject}
              >
                Edit project
              </button>
              <button
                type="button"
                className="ghost-button danger"
                onClick={handleDeleteProject}
                disabled={deletingProject}
              >
                {deletingProject ? 'Deleting…' : 'Delete project'}
              </button>
            </div>
          )}
        </div>

        {editing ? (
          <ProjectForm
            initialValues={{
              name: project.name,
              client_name: project.client_name ?? '',
              audience: project.audience,
              project_type: project.project_type ?? '',
              raw_requirement: project.raw_requirement,
            }}
            submitLabel="Save Changes"
            submitting={savingProject}
            onSubmit={handleUpdateProject}
            onCancel={() => {
              setEditing(false);
              setError(null);
            }}
          />
        ) : (
          <>
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
          </>
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
                ? `Regenerate Non-Technical Proposal · v${proposalCount}`
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
                ? `Regenerate Technical Proposal · v${techScopeCount}`
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
        <VersionHistory
          documents={project.documents}
          selectedId={selectedId}
          justCreatedId={justCreatedId}
          onSelect={(id) => setSelectedId((prev) => (prev === id ? null : id))}
        />
      </section>

      {selectedDoc && (
        <section className="project-detail-viewer" aria-label="Document viewer">
          <Suspense
            fallback={
              <p className="muted project-detail-viewer-loading">
                Loading viewer…
              </p>
            }
          >
            <DocumentViewer
              doc={selectedDoc}
              project={project}
              regenerating={busyType === selectedDoc.doc_type}
              onRegenerate={(dt) => generate(dt)}
              onUpdateContent={(md) => handleUpdateDocumentContent(selectedDoc.id, md)}
              onDelete={handleDeleteDocument(selectedDoc.id)}
              onClose={() => setSelectedId(null)}
            />
          </Suspense>
        </section>
      )}
    </div>
  );
}

// Keep an unused-import guard: ProjectDocument is re-exported by the
// types module so future code can use it without a re-import.
export type { ProjectDocument };
