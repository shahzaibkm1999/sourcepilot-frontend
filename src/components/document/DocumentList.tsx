import { ProjectDocument } from '../../types';
import { docTypeLabel } from '../../utils/audience';
import { formatRelative } from '../../utils/date';
import StatusChip from '../ui/StatusChip';
import '../../styles/document-list.css';

interface DocumentListProps {
  documents: ProjectDocument[];
  selectedId: string | null;
  /** id of a document that was just generated — used to briefly highlight it */
  justCreatedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * DocumentList
 * ------------
 * Renders every document for a project, newest first. Each row has
 * a doc_type chip, a relative timestamp, and a "view / hide" toggle.
 * The currently selected row is marked active.
 */
export default function DocumentList({
  documents,
  selectedId,
  justCreatedId,
  onSelect,
}: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="document-list-empty">
        <p className="muted">
          No documents yet. Use the buttons above to generate a
          <strong> Proposal</strong> or a <strong>Technical Scope</strong>.
        </p>
      </div>
    );
  }

  return (
    <ul className="document-list">
      {documents.map((doc) => {
        const isSelected = doc.id === selectedId;
        const isJustCreated = doc.id === justCreatedId;
        const className = [
          'document-list-item',
          isSelected && 'document-list-item--active',
          isJustCreated && 'document-list-item--just-created',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <li key={doc.id} className={className}>
            <div className="document-list-item-main">
              <div className="document-list-item-chips">
                <StatusChip tone="doc" label={docTypeLabel(doc.doc_type)} />
              </div>
              <time
                className="document-list-item-time muted"
                dateTime={doc.created_at}
              >
                generated {formatRelative(doc.created_at)}
              </time>
            </div>
            <div className="document-list-item-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => onSelect(doc.id)}
                aria-pressed={isSelected}
              >
                {isSelected ? 'Hide' : 'View'}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
