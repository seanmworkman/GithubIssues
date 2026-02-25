import { Star } from "lucide-react";
import type { AnalyzedIssue } from "../types";
import IssueCard from "./IssueCard";

interface StarredSectionProps {
  issues: AnalyzedIssue[];
  starredNumbers: Set<number>;
  onToggleStar: (issueNumber: number) => void;
  onChatAbout: (issueNumber: number) => void;
}

export default function StarredSection({
  issues,
  starredNumbers,
  onToggleStar,
  onChatAbout,
}: StarredSectionProps) {
  const starredIssues = issues.filter((i) => starredNumbers.has(i.number));

  if (starredIssues.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Star size={18} className="text-yellow-500" fill="currentColor" />
        <h2 className="text-lg font-bold text-gray-900">
          Starred Issues ({starredIssues.length})
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
        {starredIssues.map((issue) => (
          <IssueCard
            key={issue.number}
            issue={issue}
            isStarred={true}
            onToggleStar={onToggleStar}
            onChatAbout={onChatAbout}
          />
        ))}
      </div>
    </div>
  );
}
