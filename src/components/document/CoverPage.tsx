import { Project, ProjectDocument } from '../../types';
import { docTypeLabel } from '../../utils/audience';
import { formatRelative } from '../../utils/date';
import '../../styles/cover-page.css';

interface CoverPageProps {
  project: Project;
  doc: ProjectDocument;
}

/**
 * CoverPage
 * ---------
 * The first "page" of a generated proposal document. Editorial in
 * tone (large italic serif title, mono eyebrow, accent rule),
 * distinct from the body so the document has a clear front-matter.
 *
 * Renders as the first child of `.document-article`. The cover
 * page lives INSIDE the article so the PDF export snapshots it
 * together with the body — clients get a proper cover page on the
 * exported PDF.
 */
export default function CoverPage({ project, doc }: CoverPageProps) {
  const generatedDate = new Date(doc.created_at);
  const dateLong = generatedDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <section className="cover-page" aria-label="Cover page">
      <div className="cover-page-eyebrow">SourcePilot · {docTypeLabel(doc.doc_type)}</div>

      <h2 className="cover-page-title">{project.name}</h2>

      {project.client_name && (
        <div className="cover-page-client">
          <span className="cover-page-client-label">Prepared for</span>
          <span className="cover-page-client-name">{project.client_name}</span>
        </div>
      )}

      <div className="cover-page-rule" aria-hidden="true" />

      <dl className="cover-page-meta">
        {project.project_type && (
          <div className="cover-page-meta-row">
            <dt>Project type</dt>
            <dd>{project.project_type}</dd>
          </div>
        )}
        <div className="cover-page-meta-row">
          <dt>Audience</dt>
          <dd>{project.audience === 'tecnico' ? 'Technical' : 'Non-technical'}</dd>
        </div>
        <div className="cover-page-meta-row">
          <dt>Version</dt>
          <dd>
            <time dateTime={doc.created_at}>
              {dateLong} · {formatRelative(doc.created_at)}
            </time>
          </dd>
        </div>
      </dl>
    </section>
  );
}
