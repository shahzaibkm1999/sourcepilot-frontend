import { ProjectDocument } from '../../types';
import { formatRelative } from '../../utils/date';
import { groupByDocType, versionNumber } from '../../utils/documents';
import '../../styles/version-history.css';

interface VersionHistoryProps {
  documents: ProjectDocument[];
  selectedId: string | null;
  /** id of a document that was just generated — used to briefly highlight it */
  justCreatedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * VersionHistory
 * --------------
 * Renders a project's documents grouped by `doc_type` as versioned
 * histories. Each group has a header (label + version count) and a
 * list of rows, newest first. Within a group, versions are numbered
 * v1 (oldest) .. vN (newest), with the newest marked CURRENT.
 *
 * The current document is auto-marked for the just-created highlight
 * the same way the old DocumentList did — the highlight state lives
 * on the row, not the section, so behavior matches the old component.
 */
export default function VersionHistory({
  documents,
  selectedId,
  justCreatedId,
  onSelect,
}: VersionHistoryProps) {
  if (documents.length === 0) {
    return (
      <div className="version-history-empty">
        <p className="muted">
          No documents yet. Use the buttons above to generate a
          <strong> Non-Technical Proposal</strong> or a
          <strong> Technical Proposal</strong>.
        </p>
      </div>
    );
  }

  const groups = groupByDocType(documents);

  return (
    <div className="version-history">
      {groups.map((group) => {
        const count = group.versions.length;
        const countLabel = `${count} version${count === 1 ? '' : 's'}`;

        return (
          <section key={group.docType} className="version-history-group">
            <header className="version-history-group-header">
              <h3 className="version-history-group-label">{group.label}</h3>
              <span className="version-history-group-count muted">
                {countLabel}
              </span>
            </header>

            <ul className="version-history-list">
              {group.versions.map((doc) => {
                const version = versionNumber(group, doc);
                const isCurrent = doc.id === group.current.id;
                const isSelected = doc.id === selectedId;
                const isJustCreated = doc.id === justCreatedId;
                const className = [
                  'version-history-item',
                  isSelected && 'version-history-item--active',
                  isJustCreated && 'version-history-item--just-created',
                ]
                  .filter(Boolean)
                  .join(' ');

                return (
                  <li key={doc.id} className={className}>
                    <div className="version-history-item-main">
                      <div className="version-history-item-meta">
                        <span className="version-history-item-version">
                          v{version}
                        </span>
                        {isCurrent && (
                          <span className="version-history-item-current-badge">
                            current
                          </span>
                        )}
                        <span className="version-history-item-sep muted">·</span>
                        <time
                          className="version-history-item-time muted"
                          dateTime={doc.created_at}
                        >
                          generated {formatRelative(doc.created_at)}
                        </time>
                      </div>
                    </div>
                    <div className="version-history-item-actions">
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
          </section>
        );
      })}
    </div>
  );
}
