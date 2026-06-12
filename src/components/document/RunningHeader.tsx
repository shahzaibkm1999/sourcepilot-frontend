import { docTypeLabel } from '../../utils/audience';
import { Project, ProjectDocument } from '../../types';
import '../../styles/running-header.css';

interface RunningHeaderProps {
  project: Project;
  doc: ProjectDocument;
}

/**
 * RunningHeader
 * -------------
 * The thin "running" header that sticks to the top of the document
 * surface as the user scrolls. Editorial in tone: small mono
 * uppercase label + a thin accent rule on the right. Doubles as
 * a "you are in § [doc type]" cue.
 *
 * On the exported PDF, this header is removed in the onclone
 * callback in pdfExport.ts (it's UI chrome, not part of the
 * printable document). The page-numbered footer added by jsPDF
 * takes its place.
 */
export default function RunningHeader({ project, doc }: RunningHeaderProps) {
  return (
    <div className="running-header" aria-hidden="true">
      <span className="running-header-left">
        <span className="running-header-dot" />
        {project.name}
      </span>
      <span className="running-header-right">
        {docTypeLabel(doc.doc_type)}
      </span>
    </div>
  );
}
