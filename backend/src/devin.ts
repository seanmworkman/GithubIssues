import { DevinSession, DevinSessionDetails, GitHubIssue, AnalysisBatch } from "./types";

const DEVIN_API_BASE = "https://api.devin.ai/v1";

function getHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

export async function createAnalysisSession(
  issues: GitHubIssue[],
  batchIndex: number,
  apiKey: string
): Promise<DevinSession> {
  const issuesSummary = issues
    .map(
      (i) =>
        `#${i.number}: "${i.title}" (labels: ${i.labels.map((l) => l.name).join(", ") || "none"}, comments: ${i.comments})\nBody excerpt: ${(i.body || "No description").substring(0, 300)}`
    )
    .join("\n\n");

  const prompt = `You are analyzing GitHub issues from the wso2/financial-services-accelerator repository (an open-source financial services accelerator toolkit). For each issue below, provide:
1. A concise 1-2 sentence summary
2. Priority: "critical", "high", "medium", or "low" (based on impact, number of comments, severity)
3. Difficulty: "easy", "medium", "hard", or "expert" (based on complexity, scope of changes needed)
4. Feature category: a short label like "payments", "accounts", "consent-management", "api", "documentation", "authentication", "ui", "testing", "infrastructure", "integrations", "compliance", or another relevant category

IMPORTANT: You MUST update your structured output with the analysis for ALL issues listed below. Update the structured output immediately as you analyze each issue.

Here are the issues (batch ${batchIndex + 1}):

${issuesSummary}`;

  const structuredOutputSchema = JSON.stringify({
    issues: issues.map((i) => ({
      number: i.number,
      summary: "",
      priority: "medium",
      difficulty: "medium",
      feature: "",
    })),
  });

  const response = await fetch(`${DEVIN_API_BASE}/sessions`, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify({
      prompt: `${prompt}\n\nPlease use this structured output format and update it as you work:\n${structuredOutputSchema}`,
      idempotent: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Devin API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<DevinSession>;
}

export async function createSingleIssueAnalysisSession(
  issue: GitHubIssue,
  apiKey: string
): Promise<DevinSession> {
  const prompt = `You are analyzing a single GitHub issue from the wso2/financial-services-accelerator repository (an open-source financial services accelerator toolkit).

Issue #${issue.number}: "${issue.title}"
Labels: ${issue.labels.map((l) => l.name).join(", ") || "none"}
Comments: ${issue.comments}
Created: ${issue.created_at}
Body: ${(issue.body || "No description").substring(0, 500)}

Provide:
1. A concise 1-2 sentence summary
2. Priority: "critical", "high", "medium", or "low" (based on impact, number of comments, severity)
3. Difficulty: "easy", "medium", "hard", or "expert" (based on complexity, scope of changes needed)
4. Feature category: a short label like "payments", "accounts", "consent-management", "api", "documentation", "authentication", "ui", "testing", "infrastructure", "integrations", "compliance", or another relevant category
5. Stale detection:Determine if this issue appears stale or should not be in the backlog. Set "stale" to true if the issue seems outdated, is likely a duplicate, won't be fixed, is not reproducible, or has already been resolved. If stale, set "staleReason" to one of: "outdated", "duplicate", "wont-fix", "not-reproducible", "already-resolved". Otherwise set stale to false and staleReason to null.

IMPORTANT: Update your structured output immediately with the analysis.`;

  const structuredOutputSchema = JSON.stringify({
    issues: [
      {
        number: issue.number,
        summary: "",
        priority: "medium",
        difficulty: "medium",
        feature: "",
        stale: false,
        staleReason: null,
      },
    ],
  });

  const response = await fetch(`${DEVIN_API_BASE}/sessions`, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify({
      prompt: `${prompt}\n\nPlease use this structured output format and update it as you work:\n${structuredOutputSchema}`,
      idempotent: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Devin API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<DevinSession>;
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
