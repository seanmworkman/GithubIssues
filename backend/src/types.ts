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
  hasPR: boolean;
  startingPoint: string | null;
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

export interface DevinSessionMessage {
  type: string;
  event_id: string;
  message: string;
  timestamp: string;
  origin?: string | null;
  user_id?: string | null;
  username?: string | null;
}

export interface DevinSessionDetails {
  session_id: string;
  status: string;
  status_enum?: string | null;
  url: string;
  structured_output: Record<string, unknown> | null;
  messages: DevinSessionMessage[];
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
