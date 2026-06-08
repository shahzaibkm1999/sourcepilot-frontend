import { SpecificationWithProject } from '../types';
import { formatRelative } from '../utils/date';
import '../styles/sidebar.css';

interface SidebarProps {
  specs: SpecificationWithProject[];
  loading: boolean;
  error: string | null;
  activeSpecId: string | null;
  onSelect: (spec: SpecificationWithProject) => void;
  onRefresh: () => void;
}

export default function Sidebar({
  specs,
  loading,
  error,
  activeSpecId,
  onSelect,
  onRefresh,
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Saved Specs</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onRefresh}
          aria-label="Refresh list"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {loading && <p className="sidebar-status">Loading…</p>}
      {error && <p className="sidebar-status error">⚠ {error}</p>}
      {!loading && !error && specs.length === 0 && (
        <p className="sidebar-status muted">
          No saved specs yet. Generate one to get started.
        </p>
      )}

      <ul className="spec-list">
        {specs.map((spec) => (
          <li key={spec.id}>
            <button
              type="button"
              className={`spec-item ${activeSpecId === spec.id ? 'active' : ''}`}
              onClick={() => onSelect(spec)}
            >
              <div className="spec-item-title">{spec.project?.name ?? 'Untitled'}</div>
              {spec.project?.description && (
                <div className="spec-item-desc">{spec.project.description}</div>
              )}
              <div className="spec-item-meta">
                <span>v{spec.version}</span>
                <span>·</span>
                <span>{formatRelative(spec.created_at)}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
