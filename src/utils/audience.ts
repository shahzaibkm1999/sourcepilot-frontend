import type { Audience, DocType } from '../types';

/** Convert an `Audience` enum to the human label we show in the UI. */
export function audienceLabel(a: Audience): string {
  switch (a) {
    case 'non_tecnico':
      return 'Non-Technical';
    case 'tecnico':
      return 'Technical';
  }
}

/**
 * Convert a `DocType` enum to the human label we show in the UI.
 * Both outputs are proposals — the qualifier distinguishes the
 * audience the document is written for. The underlying enum
 * values (`'proposal'`, `'tech_scope'`) and the backend are
 * unchanged; this is purely a UI label.
 */
export function docTypeLabel(d: DocType): string {
  switch (d) {
    case 'proposal':
      return 'Non-Technical Proposal';
    case 'tech_scope':
      return 'Technical Proposal';
  }
}

/** A project-name -> filesystem-slug helper, for download filenames. */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'project';
}
