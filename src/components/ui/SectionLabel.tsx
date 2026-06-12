import '../../styles/section-label.css';

interface SectionLabelProps {
  /** Roman numeral, e.g. "I", "II", "III". */
  numeral?: string;
  /** Section title, e.g. "Generate", "Documents". */
  label: string;
  /** Optional meta — e.g. "showing 12 of 24". */
  meta?: string;
}

/**
 * SectionLabel
 * ------------
 * Small "§ II — Documents" label. Used between major blocks of
 * the detail page. The numeral is optional; without it the label
 * is just an uppercase mono heading. With it, you get the journal
 * feel the rest of the app already hints at.
 */
export default function SectionLabel({ numeral, label, meta }: SectionLabelProps) {
  return (
    <div className="section-label">
      <span className="section-label-main">
        {numeral && <span className="section-label-numeral">§ {numeral}</span>}
        <span className="section-label-text">{label}</span>
      </span>
      {meta && <span className="section-label-meta">{meta}</span>}
    </div>
  );
}
