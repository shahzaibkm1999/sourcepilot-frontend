import { Project, ProjectDocument } from '../../types';
import { docTypeLabel } from '../../utils/audience';
import '../../styles/sign-off.css';

interface SignOffBlockProps {
  project: Project;
  doc: ProjectDocument;
}

/**
 * SignOffBlock
 * ------------
 * The closing block of a finished proposal. Editorial in tone:
 * italic "Ready to proceed?" headline, then a small meta grid
 * with the project name, client, and the document's generation
 * date. Doubles as the visual "stamp" of a real proposal — the
 * moment the client knows the document is done.
 *
 * Renders inside the article so it's part of the PDF export.
 */
export default function SignOffBlock({ project, doc }: SignOffBlockProps) {
  const dateLong = new Date(doc.created_at).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <section className="sign-off" aria-label="Sign-off">
      <div className="sign-off-rule" aria-hidden="true" />
      <h2 className="sign-off-headline">Ready to proceed?</h2>
      <p className="sign-off-body">
        This {docTypeLabel(doc.doc_type).toLowerCase()} is ready for
        review. Reply with any questions, requested changes, or a
        confirmation to begin.
      </p>
      <dl className="sign-off-meta">
        <div className="sign-off-meta-row">
          <dt>Project</dt>
          <dd>{project.name}</dd>
        </div>
        {project.client_name && (
          <div className="sign-off-meta-row">
            <dt>Prepared for</dt>
            <dd>{project.client_name}</dd>
          </div>
        )}
        <div className="sign-off-meta-row">
          <dt>Issued</dt>
          <dd>
            <time dateTime={doc.created_at}>{dateLong}</time>
          </dd>
        </div>
      </dl>
    </section>
  );
}
