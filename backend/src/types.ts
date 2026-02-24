export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  labels: Array<{ name: string; color: string }>;
  created_at: string;
  updated_at: string;
  comments: number;
  user: { login: string; avatar_url: string } | null;
}

export type StaleReason = "outdated" | "duplicate" | "wont-fix" | "not-reproducible" | "already-resolved" | null;

export interface AnalyzedIssue {
  number: number;
  title: string;
  summary: string;
  priority: "critical" | "high" | "medium" | "low";
  difficulty: "easy" | "medium" | "hard" | "expert";
  feature: string;
  stale: boolean;
  staleReason: StaleReason;
  html_url: string;
  labels: Array<{ name: string; color: string }>;
  created_at: string;
  comments: number;
}

export interface DevinSession {
  session_id: string;
  status: string;
  url: string;
  structured_output?: Record<string, unknown> | null;
}

export interface DevinSessionDetails {
  session_id: string;
  status: string;
  url: string;
  structured_output: Record<string, unknown> | null;
  messages: Array<{ role: string; content: string; created_at?: string }>;
}

export interface ChatSession {
  sessionId: string;
  issueNumber: number;
  status: string;
  messages: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
}

export interface AnalysisBatch {
  issues: Array<{
    number: number;
    summary: string;
    priority: "critical" | "high" | "medium" | "low";
    difficulty: "easy" | "medium" | "hard" | "expert";
    feature: string;
    stale: boolean;
    staleReason: string | null;
  }>;
}
