import { DevinSession, DevinSessionDetails, GitHubIssue, AnalysisBatch } from "./types";

const DEVIN_API_BASE = "https://api.devin.ai/v1";

function getHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

const ANALYSIS_INSTRUCTIONS = `You are analyzing GitHub issues from the wso2/financial-services-accelerator repository. For the issue I give you, respond by updating structured_output with a JSON object containing an "issues" array. Each entry needs:
- number (integer)
- summary (1-2 sentence string)
- priority: "critical", "high", "medium", or "low"
- difficulty: "easy", "medium", "hard", or "expert"
- feature: a short label like "payments", "accounts", "consent-management", "api", "documentation", "authentication", "ui", "testing", "infrastructure", "integrations", "compliance", or similar
- stale (boolean): true if the issue seems outdated, duplicate, won't-fix, not-reproducible, or already-resolved
- staleReason: "outdated", "duplicate", "wont-fix", "not-reproducible", "already-resolved", or null

IMPORTANT: Each time I send you a new issue, ADD its analysis to the existing issues array in structured_output. Do NOT replace the array — append to it. Keep all previously analyzed issues in the array.`;

function formatIssueForPrompt(issue: GitHubIssue): string {
  return `Analyze this issue and ADD it to the structured_output issues array (keep all previous entries):

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
