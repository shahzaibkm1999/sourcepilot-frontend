import '../../styles/project-card.css';

export type ChipTone = 'audience' | 'type' | 'doc' | 'neutral';

interface StatusChipProps {
  /** Visual tone — also controls the modifier class. */
  tone?: ChipTone;
  /** Text to display. */
  label: string;
}

/**
 * StatusChip
 * ----------
 * Small, reusable chip used for audience / doc_type / project_type
 * labels. Reuses the existing `.chip` styles from project-card.css;
 * only the tone variant changes.
 */
export default function StatusChip({ tone = 'neutral', label }: StatusChipProps) {
  const className = `chip chip-${tone}`;
  return <span className={className}>{label}</span>;
}
