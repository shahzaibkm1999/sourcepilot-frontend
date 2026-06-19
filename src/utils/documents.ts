import { DocType, ProjectDocument } from '../types';
import { docTypeLabel } from './audience';

export interface VersionedGroup {
  docType: DocType;
  /** Human-readable label, e.g. "Non-Technical Proposal". */
  label: string;
  /** Versions of this doc_type, sorted newest-first. */
  versions: ProjectDocument[];
  /** The most recent version of this doc_type (== versions[0]). */
  current: ProjectDocument;
}

/**
 * Fixed display order for the version-history groups. Non-Technical
 * comes before Technical because the form is laid out in that order
 * and the natural audience order matches the project's audience.
 */
const DOC_TYPE_ORDER: DocType[] = ['proposal', 'tech_scope'];

/**
 * Group a flat list of project documents into one VersionedGroup per
 * doc_type, sorted newest-first within each group, and in the
 * canonical Non-Technical → Technical order between groups. The
 * caller can render the array as-is and trust the order.
 *
 * Each group always has a `current` (== its newest version), even
 * if there's only one version — we still render the CURRENT badge
 * for a single version so the UI is consistent.
 */
export function groupByDocType(docs: ProjectDocument[]): VersionedGroup[] {
  const byType = new Map<DocType, ProjectDocument[]>();
  for (const doc of docs) {
    const list = byType.get(doc.doc_type) ?? [];
    list.push(doc);
    byType.set(doc.doc_type, list);
  }
  // Sort within each group: newest first.
  for (const list of byType.values()) {
    list.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
  // Emit in canonical order, only including types that have docs.
  return DOC_TYPE_ORDER.filter((t) => byType.has(t)).map((docType) => {
    const versions = byType.get(docType)!;
    return {
      docType,
      label: docTypeLabel(docType),
      versions,
      current: versions[0],
    };
  });
}

/**
 * Compute the human version number for a document within its group.
 * Versions are numbered 1..N starting at the OLDEST. The newest
 * (current) version gets the highest number. So if there are 3
 * versions, the rows are v3 (newest), v2, v1 (oldest).
 */
export function versionNumber(
  group: VersionedGroup,
  doc: ProjectDocument,
): number {
  // Newest first → reverse the index so v1 is at the bottom.
  const indexFromTop = group.versions.findIndex((d) => d.id === doc.id);
  return group.versions.length - indexFromTop;
}
