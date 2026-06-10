import { Completeness } from '../../types';

interface CompletenessBadgeProps {
  completeness: Completeness | null;
}

/**
 * CompletenessBadge
 * ----------------
 * SVG ring showing the project's 0-100 score, with a "Missing"
 * list underneath. Shows 0 + "no data yet" if completeness hasn't
 * been loaded yet.
 */
export default function CompletenessBadge({ completeness }: CompletenessBadgeProps) {
  const score = completeness?.score ?? 0;
  const missing = completeness?.missing ?? [];
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="completeness-badge" aria-label="Project completeness">
      <div className="completeness-ring" role="img" aria-label={`${score}% complete`}>
        <svg width="84" height="84" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r={radius} className="completeness-ring-bg" />
          <circle
            cx="42"
            cy="42"
            r={radius}
            className="completeness-ring-fg"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="completeness-ring-label">{score}%</div>
      </div>
      <div className="completeness-title">Completeness</div>
      {missing.length === 0 && score === 100 ? (
        <div className="completeness-complete">complete ✓</div>
      ) : (
        <ul className="completeness-missing">
          {missing.length === 0 ? (
            <li>loading…</li>
          ) : (
            missing.map((m) => <li key={m}>{m}</li>)
          )}
        </ul>
      )}
    </div>
  );
}
