import { Loader2, AlertCircle, PlayCircle } from "lucide-react";

interface AnalysisStatusProps {
  status: "idle" | "fetching" | "analyzing" | "complete" | "error";
  error: string | null;
  progress: { completed: number; total: number; currentIssue: string | null };
  issueCount: number;
  onStartAnalysis: () => void;
}

export default function AnalysisStatus({
  status,
  error,
  progress,
  issueCount,
  onStartAnalysis,
}: AnalysisStatusProps) {
  if (status === "idle" && issueCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <PlayCircle size={48} className="text-blue-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Ready to Analyze Issues
        </h2>
        <p className="text-gray-500 mb-4 max-w-md">
          Click the button below to fetch and analyze the top 400 open issues from
          openclaw/openclaw using Devin AI.
        </p>
        <button
          onClick={onStartAnalysis}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          Start Analysis
        </button>
      </div>
    );
  }

  if (status === "fetching") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Loader2 size={18} className="text-blue-500 animate-spin" />
        <span className="text-sm text-blue-700 font-medium">
          Fetching issues from GitHub...
        </span>
      </div>
    );
  }

  if (status === "analyzing") {
    const pct =
      progress.total > 0
        ? Math.round((progress.completed / progress.total) * 100)
        : 0;
    return (
      <div className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-3 mb-2">
          <Loader2 size={18} className="text-blue-500 animate-spin" />
          <span className="text-sm text-blue-700 font-medium">
            Analyzing issues with Devin AI... ({progress.completed}/{progress.total}{" "}
            issues)
          </span>
        </div>
        {progress.currentIssue && (
          <p className="text-xs text-blue-600 mb-2 truncate">
            Currently analyzing: {progress.currentIssue}
          </p>
        )}
        <div className="w-full bg-blue-100 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle size={18} className="text-red-500" />
        <div className="flex-1">
          <span className="text-sm text-red-700 font-medium">Analysis failed</span>
          {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
        </div>
        <button
          onClick={onStartAnalysis}
          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}
