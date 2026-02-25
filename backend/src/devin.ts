import { DevinSession, DevinSessionDetails, GitHubIssue, AnalysisBatch } from "./types";

const DEVIN_API_BASE = "https://api.devin.ai/v1";

function getHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

const ANALYSIS_INSTRUCTIONS = `You are analyzing GitHub issues from the wso2/financial-services-accelerator repository. For each issue I send you, respond with ONLY a JSON object (no markdown, no explanation, no code fences) in this exact format:
{"number":123,"summary":"...","priority":"medium","difficulty":"medium","feature":"...","stale":false,"staleReason":null,"hasPR":false,"startingPoint":"..."}

Field values:
- number: the issue number (integer)
- summary: 1-2 sentence description (string)
- priority: "critical", "high", "medium", or "low"
- difficulty: "easy", "medium", "hard", or "expert"
- feature: a short label like "payments", "accounts", "consent-management", "api", "documentation", "authentication", "ui", "testing", "infrastructure", "integrations", "compliance", or similar
- stale: true if the issue seems outdated, duplicate, won't-fix, not-reproducible, or already-resolved
- staleReason: "outdated", "duplicate", "wont-fix", "not-reproducible", "already-resolved", or null
- hasPR: true if the issue appears to already have an associated pull request (check for PR references, "fixes #", linked PRs, or mentions of a PR in the issue body/comments)
- startingPoint: a brief 1-2 sentence suggestion for where a developer should start working on this issue (e.g. which files, modules, or components to look at), or null if unclear

Respond with ONLY the JSON object. Nothing else.`;

function formatIssueForPrompt(issue: GitHubIssue): string {
  return `Analyze this issue and respond with ONLY the JSON object:

#${issue.number}: "${issue.title}"
Labels: ${issue.labels.map((l) => l.name).join(", ") || "none"}
Comments: ${issue.comments}
Created: ${issue.created_at}
Body: ${(issue.body || "No description").substring(0, 500)}`;
}

export async function createAnalysisSession(
  firstIssue: GitHubIssue,
  apiKey: string
): Promise<DevinSession> {
  const prompt = `${ANALYSIS_INSTRUCTIONS}

Here is the first issue to analyze:

${formatIssueForPrompt(firstIssue)}`;

  const response = await fetch(`${DEVIN_API_BASE}/sessions`, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Devin API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<DevinSession>;
}

export async function sendNextIssue(
  sessionId: string,
  issue: GitHubIssue,
  apiKey: string
): Promise<void> {
  const message = formatIssueForPrompt(issue);
  await sendSessionMessage(sessionId, message, apiKey);
}

export async function getSessionDetails(
  sessionId: string,
  apiKey: string
): Promise<DevinSessionDetails> {
  const response = await fetch(`${DEVIN_API_BASE}/sessions/${sessionId}`, {
    method: "GET",
    headers: getHeaders(apiKey),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Devin API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<DevinSessionDetails>;
}

export async function createResearchSession(
  issueNumber: number,
  issueTitle: string,
  issueBody: string,
  question: string,
  apiKey: string
): Promise<DevinSession> {
  const prompt = `You are researching a GitHub issue from the wso2/financial-services-accelerator repository.

Issue #${issueNumber}: "${issueTitle}"
Description: ${issueBody.substring(0, 2000)}

The user has the following question about this issue:
${question}

Please research this issue thoroughly using your knowledge of the wso2/financial-services-accelerator codebase and provide a helpful, detailed answer. If the question involves code, reference specific files or components where relevant.`;

  const response = await fetch(`${DEVIN_API_BASE}/sessions`, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify({
      prompt,
      idempotent: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Devin API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<DevinSession>;
}

export async function sendSessionMessage(
  sessionId: string,
  message: string,
  apiKey: string
): Promise<void> {
  const response = await fetch(
    `${DEVIN_API_BASE}/sessions/${sessionId}/message`,
    {
      method: "POST",
      headers: getHeaders(apiKey),
      body: JSON.stringify({ message }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Devin API error (${response.status}): ${errorText}`);
  }
}

interface SingleIssueAnalysis {
  number: number;
  summary: string;
  priority: "critical" | "high" | "medium" | "low";
  difficulty: "easy" | "medium" | "hard" | "expert";
  feature: string;
  stale: boolean;
  staleReason: string | null;
  hasPR: boolean;
  startingPoint: string | null;
}

export function parseAnalysisFromMessage(content: string): SingleIssueAnalysis | null {
  try {
    let jsonStr = content.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }
    const braceStart = jsonStr.indexOf("{");
    const braceEnd = jsonStr.lastIndexOf("}");
    if (braceStart === -1 || braceEnd === -1) return null;
    jsonStr = jsonStr.substring(braceStart, braceEnd + 1);

    const parsed = JSON.parse(jsonStr);
    if (typeof parsed.number === "number" && typeof parsed.summary === "string") {
      parsed.hasPR = parsed.hasPR === true;
      parsed.startingPoint = typeof parsed.startingPoint === "string" ? parsed.startingPoint : null;
      return parsed as SingleIssueAnalysis;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseAnalysisOutput(
  output: Record<string, unknown> | null
): AnalysisBatch | null {
  if (!output) return null;

  try {
    if (
      "issues" in output &&
      Array.isArray(output.issues)
    ) {
      return output as unknown as AnalysisBatch;
    }
    return null;
  } catch {
    return null;
  }
}
