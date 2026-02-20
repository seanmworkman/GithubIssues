import { useEffect, useRef, useState } from "react";
import type { AnalyzedIssue, SortField, SortDirection } from "../types";
import { PRIORITY_ORDER, DIFFICULTY_ORDER } from "../types";
import IssueCard from "./IssueCard";

interface IssueListProps {
  issues: AnalyzedIssue[];
  starredNumbers: Set<number>;
  sortField: SortField;
  sortDirection: SortDirection;
  filterFeatures: Set<string>;
  filterPriorities: Set<string>;
  filterDifficulties: Set<string>;
  onToggleStar: (issueNumber: number) => void;
  onChatAbout: (issueNumber: number) => void;
}

function sortIssues(
  issues: AnalyzedIssue[],
  field: SortField,
  direction: SortDirection
): AnalyzedIssue[] {
  const sorted = [...issues];
  sorted.sort((a, b) => {
    let comparison = 0;
    switch (field) {
      case "priority":
        comparison = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
        break;
      case "difficulty":
        comparison = DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
        break;
      case "feature":
        comparison = a.feature.localeCompare(b.feature);
        break;
    }
    return direction === "asc" ? comparison : -comparison;
  });
  return sorted;
}

function groupByFeature(issues: AnalyzedIssue[]): Map<string, AnalyzedIssue[]> {
  const groups = new Map<string, AnalyzedIssue[]>();
  for (const issue of issues) {
    const feature = issue.feature || "uncategorized";
    const existing = groups.get(feature) || [];
    existing.push(issue);
    groups.set(feature, existing);
  }
  return groups;
}

function AnimatedCard({
  issue,
  isStarred,
  onToggleStar,
  onChatAbout,
}: {
  issue: AnalyzedIssue;
  isStarred: boolean;
  onToggleStar: (n: number) => void;
  onChatAbout: (n: number) => void;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      ref={ref}
      className="transition-all duration-300 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.97)",
      }}
    >
      <IssueCard
        issue={issue}
        isStarred={isStarred}
        onToggleStar={onToggleStar}
        onChatAbout={onChatAbout}
      />
    </div>
  );
}

export default function IssueList({
  issues,
  starredNumbers,
  sortField,
  sortDirection,
  filterFeatures,
  filterPriorities,
  filterDifficulties,
  onToggleStar,
  onChatAbout,
}: IssueListProps) {
  const unstarredIssues = issues.filter((i) => !starredNumbers.has(i.number));

  let filtered = unstarredIssues;
  if (filterFeatures.size > 0) {
    filtered = filtered.filter((i) => filterFeatures.has(i.feature));
  }
  if (filterPriorities.size > 0) {
    filtered = filtered.filter((i) => filterPriorities.has(i.priority));
  }
  if (filterDifficulties.size > 0) {
    filtered = filtered.filter((i) => filterDifficulties.has(i.difficulty));
  }

  const sorted = sortIssues(filtered, sortField, sortDirection);

  if (sortField === "feature" && filterFeatures.size === 0) {
    const grouped = groupByFeature(sorted);
    const sortedGroups = Array.from(grouped.entries()).sort(([a], [b]) =>
      sortDirection === "asc" ? a.localeCompare(b) : b.localeCompare(a)
    );

    return (
      <div className="space-y-6">
        {sortedGroups.map(([feature, groupIssues]) => (
          <div key={feature}>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-blue-400" />
              {feature}
              <span className="text-xs font-normal text-gray-400">
                ({groupIssues.length})
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groupIssues.map((issue) => (
                <AnimatedCard
                  key={issue.number}
                  issue={issue}
                  isStarred={starredNumbers.has(issue.number)}
                  onToggleStar={onToggleStar}
                  onChatAbout={onChatAbout}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {sorted.map((issue) => (
        <AnimatedCard
          key={issue.number}
          issue={issue}
          isStarred={starredNumbers.has(issue.number)}
          onToggleStar={onToggleStar}
          onChatAbout={onChatAbout}
        />
      ))}
    </div>
  );
}
