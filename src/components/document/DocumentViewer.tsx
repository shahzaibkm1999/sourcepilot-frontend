import { useState } from 'react';
import { ProjectDocument, Project, DocType } from '../../types';
import { renderMarkdown } from '../../utils/markdown';
import { docTypeLabel, slugify } from '../../utils/audience';
import StatusChip from '../ui/StatusChip';
import '../../styles/document-viewer.css';

interface DocumentViewerProps {
  doc: ProjectDocument;
  project: Project;
  regenerating: boolean;
  onRegenerate: (docType: DocType) => void;
  onClose: () => void;
}

/**
 * DocumentViewer
 * --------------
 * Renders a single document's `content_markdown` inline. Provides
 * a sticky action bar with Copy, Download .md, Regenerate, Close.
 *
 * Honest UI (Constitution Article IV): the backend persists before
 * returning, so every document in this viewer is durable server
 * state. There is no "unsaved preview" — only the in-flight
 * "Regenerating…" disabled state on the button.
 */
export default function DocumentViewer({
  doc,
  project,
  regenerating,
  onRegenerate,
  onClose,
}: DocumentViewerProps) {
  const [copied, setCopied] = useState(false);
  const html = renderMarkdown(doc.content_markdown);

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

  return (
    <article className="document-article" aria-label="Document viewer">
      <header className="document-article-header">
        <div className="document-article-stamp">
          <StatusChip tone="doc" label={docTypeLabel(doc.doc_type)} />
        </div>
        <h2 className="document-article-title">
          {project.name} — {docTypeLabel(doc.doc_type)}
        </h2>
        <div className="document-article-meta muted">
          Generated{' '}
          <time dateTime={doc.created_at}>
            {new Date(doc.created_at).toLocaleString()}
          </time>
        </div>
        <div className="document-article-actions">
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
            className="ghost-button primary"
            onClick={handleRegenerate}
            disabled={regenerating}
            title="Generate a new version of this document"
          >
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={onClose}
            title="Close the viewer"
          >
            Close
          </button>
        </div>
      </header>

      <div
        className="document-article-body"
        // The Markdown source comes from our own backend (Gemini).
        // renderMarkdown escapes all input before applying syntax.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
