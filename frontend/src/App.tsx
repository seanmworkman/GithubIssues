import { useState, useEffect, useCallback } from "react";
import { Github, RefreshCw } from "lucide-react";
import { AnalyzedIssue, SortField, SortDirection } from "./types";
import { fetchIssues, triggerAnalysis, fetchStarredIssues, starIssue, unstarIssue } from "./api";
import AnalysisStatus from "./components/AnalysisStatus";
import SortControls from "./components/SortControls";
import FeatureFilter from "./components/FeatureFilter";
import StarredSection from "./components/StarredSection";
import IssueList from "./components/IssueList";
import ChatWindow from "./components/ChatWindow";

export default function App() {
  const [issues, setIssues] = useState<AnalyzedIssue[]>([]);
  const [status, setStatus] = useState<"idle" | "fetching" | "analyzing" | "complete" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [starredNumbers, setStarredNumbers] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterFeature, setFilterFeature] = useState<string | null>(null);
  const [chatIssueNumber, setChatIssueNumber] = useState<number | null>(null);

  const loadIssues = useCallback(async () => {
    try {
      const data = await fetchIssues();
      setIssues(data.issues);
      setStatus(data.status);
      setError(data.error);
      setProgress(data.progress);
    } catch (err) {
      console.error("Failed to load issues:", err);
    }
  }, []);

  const loadStars = useCallback(async () => {
    try {
      const data = await fetchStarredIssues();
      setStarredNumbers(new Set(data.starred));
    } catch (err) {
      console.error("Failed to load stars:", err);
    }
  }, []);

  useEffect(() => {
    loadIssues();
    loadStars();
  }, [loadIssues, loadStars]);

  useEffect(() => {
    if (status === "fetching" || status === "analyzing") {
      const interval = setInterval(loadIssues, 5000);
      return () => clearInterval(interval);
    }
  }, [status, loadIssues]);

  const handleStartAnalysis = async () => {
    try {
      await triggerAnalysis();
      setStatus("fetching");
      loadIssues();
    } catch (err) {
      console.error("Failed to start analysis:", err);
    }
  };

  const handleToggleStar = async (issueNumber: number) => {
    try {
      if (starredNumbers.has(issueNumber)) {
        const data = await unstarIssue(issueNumber);
        setStarredNumbers(new Set(data.starred));
      } else {
        const data = await starIssue(issueNumber);
        setStarredNumbers(new Set(data.starred));
      }
    } catch (err) {
      console.error("Failed to toggle star:", err);
    }
  };

  const handleSortChange = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleChatAbout = (issueNumber: number) => {
    setChatIssueNumber(issueNumber);
  };

  const handleClearPrefill = () => {
    setChatIssueNumber(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Github size={24} className="text-gray-800" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  GitHub Issues Triage
                </h1>
                <p className="text-xs text-gray-500">
                  openclaw/openclaw &middot; {issues.length} issues loaded
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {status === "complete" && (
                <button
                  onClick={handleStartAnalysis}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <RefreshCw size={14} />
                  Re-analyze
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-screen-2xl mx-auto flex h-[calc(100vh-57px)]">
        <main className="flex-1 overflow-y-auto p-4 min-w-0">
          <AnalysisStatus
            status={status}
            error={error}
            progress={progress}
            issueCount={issues.length}
            onStartAnalysis={handleStartAnalysis}
          />

          {issues.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-4 mt-4 mb-4">
                <SortControls
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSortChange={handleSortChange}
                />
              </div>

              <div className="mb-4">
                <FeatureFilter
                  issues={issues}
                  selectedFeature={filterFeature}
                  onSelectFeature={setFilterFeature}
                />
              </div>

              <StarredSection
                issues={issues}
                starredNumbers={starredNumbers}
                onToggleStar={handleToggleStar}
                onChatAbout={handleChatAbout}
              />

              <IssueList
                issues={issues}
                starredNumbers={starredNumbers}
                sortField={sortField}
                sortDirection={sortDirection}
                filterFeature={filterFeature}
                onToggleStar={handleToggleStar}
                onChatAbout={handleChatAbout}
              />
            </>
          )}
        </main>

        <aside className="w-96 border-l border-gray-200 bg-white flex-shrink-0 hidden lg:flex">
          <div className="w-full h-full">
            <ChatWindow
              prefillIssueNumber={chatIssueNumber}
              onClearPrefill={handleClearPrefill}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
