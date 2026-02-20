export interface AnalyzedIssue {
  number: number;
  title: string;
  summary: string;
  priority: "critical" | "high" | "medium" | "low";
  difficulty: "easy" | "medium" | "hard" | "expert";
  feature: string;
  html_url: string;
  labels: Array<{ name: string; color: string }>;
  created_at: string;
  comments: number;
}

export interface IssuesResponse {
  issues: AnalyzedIssue[];
  status: "idle" | "fetching" | "analyzing" | "complete" | "error";
  error: string | null;
  progress: { completed: number; total: number; currentIssue: string | null };
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatSessionResponse {
  sessionId: string;
  status: string;
  url: string;
  messages: ChatMessage[];
}

export interface CreateChatResponse {
  sessionId: string;
  url: string;
  status: string;
}

export type SortField = "priority" | "difficulty" | "feature";
export type SortDirection = "asc" | "desc";

export const PRIORITY_ORDER: Record<AnalyzedIssue["priority"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export const DIFFICULTY_ORDER: Record<AnalyzedIssue["difficulty"], number> = {
  easy: 0,
  medium: 1,
  hard: 2,
  expert: 3,
};
