import type {
  IssuesResponse,
  ChatSessionResponse,
  CreateChatResponse,
} from "./types";

const API_BASE = "/api";

export async function fetchIssues(): Promise<IssuesResponse> {
  const res = await fetch(`${API_BASE}/issues`);
  if (!res.ok) throw new Error("Failed to fetch issues");
  return res.json();
}

export async function triggerAnalysis(): Promise<{ message: string; status: string }> {
  const res = await fetch(`${API_BASE}/issues/analyze`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error || "Failed to trigger analysis");
  }
  return res.json();
}

export async function fetchStarredIssues(): Promise<{ starred: number[] }> {
  const res = await fetch(`${API_BASE}/stars`);
  if (!res.ok) throw new Error("Failed to fetch starred issues");
  return res.json();
}

export async function starIssue(issueNumber: number): Promise<{ starred: number[] }> {
  const res = await fetch(`${API_BASE}/stars/${issueNumber}`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to star issue");
  return res.json();
}

export async function unstarIssue(issueNumber: number): Promise<{ starred: number[] }> {
  const res = await fetch(`${API_BASE}/stars/${issueNumber}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to unstar issue");
  return res.json();
}

export async function createChatSession(
  issueNumber: number,
  message: string
): Promise<CreateChatResponse> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ issueNumber, message }),
  });
  if (!res.ok) throw new Error("Failed to create chat session");
  return res.json();
}

export async function sendChatMessage(
  sessionId: string,
  message: string
): Promise<{ success: boolean }> {
  const res = await fetch(`${API_BASE}/chat/${sessionId}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
}

export async function getChatSession(
  sessionId: string
): Promise<ChatSessionResponse> {
  const res = await fetch(`${API_BASE}/chat/${sessionId}`);
  if (!res.ok) throw new Error("Failed to get chat session");
  return res.json();
}
