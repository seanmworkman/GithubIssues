import { useState, useEffect, useCallback } from "react";
import { Github, RefreshCw } from "lucide-react";
import type { AnalyzedIssue, SortField, SortDirection } from "./types";
import { fetchIssues, triggerAnalysis, fetchStarredIssues, starIssue, unstarIssue } from "./api";
import AnalysisStatus from "./components/AnalysisStatus";
import SortControls from "./components/SortControls";
import MultiSelectDropdown from "./components/MultiSelectDropdown";
import StarredSection from "./components/StarredSection";
import IssueList from "./components/IssueList";
import ChatWindow from "./components/ChatWindow";

export default function App() {
  const [issues, setIssues] = useState<AnalyzedIssue[]>([]);
  const [status, setStatus] = useState<"idle" | "fetching" | "analyzing" | "complete" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, total: 0, currentIssue: null as string | null });
  const [starredNumbers, setStarredNumbers] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField>("priority");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filterFeatures, setFilterFeatures] = useState<Set<string>>(new Set());
  const [filterPriorities, setFilterPriorities] = useState<Set<string>>(new Set());
  const [filterDifficulties, setFilterDifficulties] = useState<Set<string>>(new Set());
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
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to start analysis");
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
                  wso2/financial-services-accelerator &middot; {issues.length} issues loaded
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
                <div className="h-6 w-px bg-gray-200" />
                <MultiSelectDropdown
                  label="Priority"
                  options={["critical", "high", "medium", "low"]}
                  selected={filterPriorities}
                  onChange={setFilterPriorities}
                  counts={new Map(issues.reduce<[string, number][]>((acc, i) => {
                    const existing = acc.find(([k]) => k === i.priority);
                    if (existing) existing[1]++;
                    else acc.push([i.priority, 1]);
                    return acc;
                  }, []))}
                  colorMap={{
                    critical: "bg-red-100 text-red-800",
                    high: "bg-orange-100 text-orange-800",
                    medium: "bg-yellow-100 text-yellow-800",
                    low: "bg-green-100 text-green-800",
                  }}
                />
                <MultiSelectDropdown
                  label="Difficulty"
                  options={["easy", "medium", "hard", "expert"]}
                  selected={filterDifficulties}
                  onChange={setFilterDifficulties}
                  counts={new Map(issues.reduce<[string, number][]>((acc, i) => {
                    const existing = acc.find(([k]) => k === i.difficulty);
                    if (existing) existing[1]++;
                    else acc.push([i.difficulty, 1]);
                    return acc;
                  }, []))}
                  colorMap={{
                    easy: "bg-emerald-100 text-emerald-800",
                    medium: "bg-blue-100 text-blue-800",
                    hard: "bg-purple-100 text-purple-800",
                    expert: "bg-pink-100 text-pink-800",
                  }}
                />
                <MultiSelectDropdown
                  label="Feature"
                  options={Array.from(new Set(issues.map((i) => i.feature))).sort()}
                  selected={filterFeatures}
                  onChange={setFilterFeatures}
                  counts={new Map(issues.reduce<[string, number][]>((acc, i) => {
                    const existing = acc.find(([k]) => k === i.feature);
                    if (existing) existing[1]++;
                    else acc.push([i.feature, 1]);
                    return acc;
                  }, []))}
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
                filterFeatures={filterFeatures}
                filterPriorities={filterPriorities}
                filterDifficulties={filterDifficulties}
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
