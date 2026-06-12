import { useEffect, useRef, useState } from 'react';
import { ProjectDocument, Project, DocType } from '../../types';
import { docTypeLabel, slugify } from '../../utils/audience';
import { exportElementAsPdf } from '../../utils/pdfExport';
import StatusChip from '../ui/StatusChip';
import CoverPage from './CoverPage';
import RunningHeader from './RunningHeader';
import TableOfContents from './TableOfContents';
import StructuredBody from './StructuredBody';
import SignOffBlock from './SignOffBlock';
import '../../styles/document-viewer.css';

interface DocumentViewerProps {
  doc: ProjectDocument;
  project: Project;
  regenerating: boolean;
  onRegenerate: (docType: DocType) => void;
  onClose: () => void;
  /**
   * Save the edited body. Resolves on success; rejects on error so
   * the viewer can keep the textarea open and surface the failure.
   */
  onUpdateContent?: (markdown: string) => Promise<void>;
  /** Delete this document version. Parent owns the API + state. */
  onDelete?: () => void;
}

/**
 * DocumentViewer
 * --------------
 * Renders a single document's `content_markdown` inline. Provides
 * a sticky action bar with Copy, Download .md, Export PDF, Edit,
 * Delete, Regenerate, Close. In edit mode the body swaps from
 * rendered HTML to a raw `<textarea>` and the bar shows Save /
 * Cancel instead.
 *
 * Honest UI (Constitution Article IV): the backend persists before
 * returning, so every document in this viewer is durable server
 * state. There is no "unsaved preview" — only the in-flight
 * "Regenerating…" / "Exporting…" / "Saving…" disabled state on the
 * buttons.
 */
export default function DocumentViewer({
  doc,
  project,
  regenerating,
  onRegenerate,
  onClose,
  onUpdateContent,
  onDelete,
}: DocumentViewerProps) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(doc.content_markdown);
  const articleRef = useRef<HTMLElement>(null);

  // Keep the edit draft in sync with the parent's `doc` whenever it
  // changes (e.g. after a save, or when the user navigates to a
  // different version). Without this, switching versions while in
  // edit mode would show stale text.
  useEffect(() => {
    setDraft(doc.content_markdown);
  }, [doc.id, doc.content_markdown]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(doc.content_markdown);
      setCopied(true);
      // Reset the "Copied!" label after a couple of seconds.
      window.setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      // Clipboard API can fail in some browsers/permissions. Surface
      // the error so the user knows it didn't silently work.
      window.alert(
        err instanceof Error
          ? `Copy failed: ${err.message}`
          : 'Copy failed: clipboard unavailable',
      );
    }
  };

  const handleDownload = () => {
    const slug = slugify(project.name);
    const stamp = new Date(doc.created_at).toISOString().slice(0, 10);
    const filename = `${slug}-${doc.doc_type}-${stamp}.md`;
    const blob = new Blob([doc.content_markdown], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    // `window.document` — the prop is named `doc`, not `document`, so
    // the global DOM `Document` is reachable without a shadow.
    const a = window.document.createElement('a');
    a.href = url;
    a.download = filename;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleRegenerate = () => {
    onRegenerate(doc.doc_type);
  };

  const handleExportPdf = async () => {
    if (!articleRef.current || exporting) return;
    const slug = slugify(project.name);
    const stamp = new Date(doc.created_at).toISOString().slice(0, 10);
    const filename = `${slug}-${doc.doc_type}-${stamp}.pdf`;
    setExporting(true);
    try {
      await exportElementAsPdf(articleRef.current, filename);
    } catch (err) {
      // Mirror handleCopy: surface failures instead of swallowing.
      window.alert(
        err instanceof Error
          ? `PDF export failed: ${err.message}`
          : 'PDF export failed: an unknown error occurred',
      );
    } finally {
      setExporting(false);
    }
  };

  const handleStartEdit = () => {
    setDraft(doc.content_markdown);
    setEditing(true);
  };

  const handleCancelEdit = () => {
    setDraft(doc.content_markdown);
    setEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!onUpdateContent) return;
    // No-op saves are still saves: respect the user clicking Save.
    // But if the draft is identical to the current content, skip the
    // PATCH and just exit edit mode — avoids needless round-trips.
    if (draft === doc.content_markdown) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onUpdateContent(draft);
      setEditing(false);
    } catch (err) {
      // Parent already surfaced the error. Keep the editor open so
      // the user doesn't lose their changes.
      window.alert(
        err instanceof Error
          ? `Save failed: ${err.message}`
          : 'Save failed: an unknown error occurred',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    onDelete();
  };

  return (
    <article
      ref={articleRef}
      className="document-article"
      aria-label="Document viewer"
    >
      <RunningHeader project={project} doc={doc} />

      <CoverPage project={project} doc={doc} />

      <TableOfContents markdown={doc.content_markdown} />

      {editing ? (
        <textarea
          className="document-article-edit"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          disabled={saving}
          rows={24}
          spellCheck
        />
      ) : doc.status === 'pending' ? (
        <div className="document-article-pending">
          <div className="document-article-pending-spinner" aria-hidden="true" />
          <p>
            Generating your <strong>{docTypeLabel(doc.doc_type)}</strong>…
            this usually takes 10–30 seconds.
          </p>
        </div>
      ) : (
        <StructuredBody markdown={doc.content_markdown} />
      )}

      {!editing && doc.status !== 'pending' && (
        <SignOffBlock project={project} doc={doc} />
      )}

      <footer className="document-article-footer">
        <div className="document-article-footer-meta">
          <StatusChip tone="doc" label={docTypeLabel(doc.doc_type)} />
          <span className="muted">
            Generated <time dateTime={doc.created_at}>
              {new Date(doc.created_at).toLocaleString()}
            </time>
          </span>
        </div>
        <div className="document-article-actions">
          {editing ? (
            <>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancelEdit}
                disabled={saving}
                title="Discard changes and exit edit mode"
              >
                Cancel
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleSaveEdit}
                disabled={saving}
                title="Save the edited body"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="ghost-button"
                onClick={handleCopy}
                title="Copy the raw markdown to the clipboard"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={handleDownload}
                title="Download as a .md file"
              >
                ↓ .md
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={handleExportPdf}
                disabled={exporting}
                title="Download as a PDF file"
              >
                {exporting ? 'Exporting…' : '↓ PDF'}
              </button>
              {onUpdateContent && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={handleStartEdit}
                  title="Edit the body of this document version"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  className="ghost-button danger"
                  onClick={handleDelete}
                  title="Delete this document version"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                className="ghost-button"
                onClick={onClose}
                title="Close the viewer"
              >
                Close
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleRegenerate}
                disabled={regenerating || doc.status === 'pending' || doc.status === 'failed'}
                title={
                  doc.status === 'pending'
                    ? 'Wait for the current version to finish generating'
                    : doc.status === 'failed'
                      ? 'Retry — this version failed to generate'
                      : 'Generate a new version of this document'
                }
              >
                {regenerating
                  ? 'Regenerating…'
                  : doc.status === 'pending'
                    ? 'Generating…'
                    : doc.status === 'failed'
                      ? 'Retry'
                      : 'Regenerate'}
              </button>
            </>
          )}
        </div>
      </footer>
    </article>
  );
}
