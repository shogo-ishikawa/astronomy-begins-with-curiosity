import { useEffect, useRef } from "react";

export interface StageValidationIssue {
  id: string;
  label: string;
  sectionId: string;
}

export function StageValidationSummary({
  issues,
  onSelect,
}: {
  issues: readonly StageValidationIssue[];
  onSelect: (sectionId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (issues.length) ref.current?.focus({ preventScroll: true });
  }, [issues.length]);
  if (!issues.length) return null;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="validation-summary"
      role="alert"
      aria-labelledby="stage-validation-title"
    >
      <h2 id="stage-validation-title">確認が必要な項目があります</h2>
      <p>選択済みの内容はそのまま保持されています。</p>
      <ul>
        {issues.map((issue) => (
          <li key={issue.id}>
            <button
              type="button"
              className="link-button"
              onClick={() => onSelect(issue.sectionId)}
            >
              {issue.label}：まだ判断が記録されていません
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
