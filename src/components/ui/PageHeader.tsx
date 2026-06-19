import { ReactNode } from 'react';
import '../../styles/page-header.css';

interface PageHeaderProps {
  /** Small all-caps mono text above the title — the "eyebrow". */
  eyebrow?: string;
  /** Main serif title. Italic + balance, large. */
  title: string;
  /** Optional subtitle paragraph. */
  subtitle?: string;
  /** Optional action row (e.g. "+ New Project" button) on the right. */
  actions?: ReactNode;
  /** Optional extra content rendered below the title (chips, etc.). */
  children?: ReactNode;
}

/**
 * PageHeader
 * ----------
 * The header at the top of every page. Eyebrow → italic serif
 * title → subtitle, with a fading rule underneath. Optional
 * actions sit on the right, vertically aligned to the title.
 *
 * Mirrors the editorial header pattern used across the app
 * (Projects page, Create page, Detail page) so all three pages
 * feel like a single magazine.
 */
export default function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-inner">
        <div className="page-header-text">
          {eyebrow && <div className="page-header-eyebrow">{eyebrow}</div>}
          <h1 className="page-header-title">{title}</h1>
          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
          {children && <div className="page-header-extra">{children}</div>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
    </header>
  );
}
