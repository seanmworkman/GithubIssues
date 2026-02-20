import { Star, ExternalLink, MessageSquare } from "lucide-react";
import type { AnalyzedIssue } from "../types";

interface IssueCardProps {
  issue: AnalyzedIssue;
  isStarred: boolean;
  onToggleStar: (issueNumber: number) => void;
  onChatAbout: (issueNumber: number) => void;
}

const PRIORITY_COLORS: Record<AnalyzedIssue["priority"], string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
};

const DIFFICULTY_COLORS: Record<AnalyzedIssue["difficulty"], string> = {
  easy: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-blue-100 text-blue-800 border-blue-200",
  hard: "bg-purple-100 text-purple-800 border-purple-200",
  expert: "bg-pink-100 text-pink-800 border-pink-200",
};

export default function IssueCard({
  issue,
  isStarred,
  onToggleStar,
  onChatAbout,
}: IssueCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-mono text-gray-500">#{issue.number}</span>
            <a
              href={issue.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-blue-500 transition-colors"
            >
              <ExternalLink size={14} />
            </a>
          </div>
          <h3 className="text-sm font-semibold text-gray-900 leading-tight mb-2 line-clamp-2">
            {issue.title}
          </h3>
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{issue.summary}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${PRIORITY_COLORS[issue.priority]}`}
            >
              {issue.priority}
            </span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${DIFFICULTY_COLORS[issue.difficulty]}`}
            >
              {issue.difficulty}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
              {issue.feature}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          <button
            onClick={() => onToggleStar(issue.number)}
            className={`p-1.5 rounded-md transition-colors ${
              isStarred
                ? "text-yellow-500 bg-yellow-50 hover:bg-yellow-100"
                : "text-gray-300 hover:text-yellow-400 hover:bg-gray-50"
            }`}
            title={isStarred ? "Unstar issue" : "Star issue"}
          >
            <Star size={16} fill={isStarred ? "currentColor" : "none"} />
          </button>
          <button
            onClick={() => onChatAbout(issue.number)}
            className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
            title="Ask about this issue"
          >
            <MessageSquare size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
