import { useState } from 'react';
import { LineageEntry } from '../../types';
import { STAGE_ORDER, LineageSnapshot } from '../../utils/stages';

interface LineageDrawerProps {
  lineage: LineageEntry[] | null;
}

/**
 * LineageDrawer
 * -------------
 * Collapsible panel showing the version-graph lineage for the
 * current project. One row per stage, with a present/absent dot
 * and the latest version number (if any).
 */
export default function LineageDrawer({ lineage }: LineageDrawerProps) {
  const [open, setOpen] = useState(true);

  const lookup = new Map((lineage ?? []).map((l) => [l.stage, l]));

  return (
    <section
      className={`lineage-drawer ${open ? 'lineage-drawer--open' : ''}`}
      aria-label="Project lineage"
    >
      <button
        type="button"
        className="lineage-drawer-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>Lineage</span>
        <span className="lineage-drawer-chevron" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="lineage-drawer-body">
          {STAGE_ORDER.map((stage) => {
            const entry = lookup.get(stage);
            const present = entry?.present ?? false;
            const version = present && entry && 'node' in entry ? entry.node.version : null;
            return (
              <div
                key={stage}
                className={`lineage-row ${present ? '' : 'lineage-row--absent'}`}
              >
                <span className="lineage-row-marker" aria-hidden="true" />
                <span>{LineageSnapshot[stage]}</span>
                <span className="lineage-row-version">
                  {present ? `v${version}` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
