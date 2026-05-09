import type { DomainIssue, DomainSeverity } from "./types";

export function issue(
  severity: DomainSeverity,
  what: string,
  why: string,
  nextStep: string,
  field?: string,
): DomainIssue {
  return {
    id: `${severity}-${slug(`${what}-${why}-${field ?? ""}`)}`,
    severity,
    what,
    why,
    nextStep,
    field,
  };
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

export function issueKey(issueValue: DomainIssue) {
  return `${issueValue.severity}:${issueValue.what}:${issueValue.field ?? ""}`;
}

export function dedupeIssues(issues: DomainIssue[]) {
  const seen = new Set<string>();
  return issues.filter((item) => {
    const key = issueKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
