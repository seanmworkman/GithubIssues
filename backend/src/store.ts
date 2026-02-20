import { AnalyzedIssue, ChatSession } from "./types";

interface Store {
  issues: AnalyzedIssue[];
  analysisSessions: Map<string, { sessionId: string; batchIndex: number; issueNumbers: number[] }>;
  chatSessions: Map<string, ChatSession>;
  starredIssues: Set<number>;
  analysisStatus: "idle" | "fetching" | "analyzing" | "complete" | "error";
  analysisError: string | null;
  analysisProgress: { completed: number; total: number };
}

const store: Store = {
  issues: [],
  analysisSessions: new Map(),
  chatSessions: new Map(),
  starredIssues: new Set(),
  analysisStatus: "idle",
  analysisError: null,
  analysisProgress: { completed: 0, total: 0 },
};

export function getStore(): Store {
  return store;
}

export function setIssues(issues: AnalyzedIssue[]): void {
  store.issues = issues;
}

export function addIssues(issues: AnalyzedIssue[]): void {
  const existingNumbers = new Set(store.issues.map((i) => i.number));
  const newIssues = issues.filter((i) => !existingNumbers.has(i.number));
  store.issues.push(...newIssues);
}

export function setAnalysisStatus(
  status: Store["analysisStatus"],
  error?: string
): void {
  store.analysisStatus = status;
  if (error) store.analysisError = error;
  if (status === "idle" || status === "fetching") {
    store.analysisError = null;
  }
}

export function setAnalysisProgress(completed: number, total: number): void {
  store.analysisProgress = { completed, total };
}

export function addAnalysisSession(
  key: string,
  sessionId: string,
  batchIndex: number,
  issueNumbers: number[]
): void {
  store.analysisSessions.set(key, { sessionId, batchIndex, issueNumbers });
}

export function addChatSession(sessionId: string, session: ChatSession): void {
  store.chatSessions.set(sessionId, session);
}

export function getChatSession(sessionId: string): ChatSession | undefined {
  return store.chatSessions.get(sessionId);
}

export function getStarredIssues(): number[] {
  return Array.from(store.starredIssues);
}

export function starIssue(issueNumber: number): void {
  store.starredIssues.add(issueNumber);
}

export function unstarIssue(issueNumber: number): void {
  store.starredIssues.delete(issueNumber);
}

export function isIssueStarred(issueNumber: number): boolean {
  return store.starredIssues.has(issueNumber);
}
