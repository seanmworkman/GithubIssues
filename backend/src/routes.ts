import { Router, Request, Response } from "express";
import { fetchOpenIssues, fetchSingleIssue } from "./github";
import {
  createAnalysisSession,
  sendNextIssue,
  getSessionDetails,
  createResearchSession,
  sendSessionMessage,
  parseAnalysisFromMessage,
} from "./devin";
import {
  getStore,
  setIssues,
  addIssues,
  setAnalysisStatus,
  setAnalysisProgress,
  addAnalysisSession,
  addChatSession,
  getChatSession,
  getStarredIssues,
  starIssue,
  unstarIssue,
} from "./store";
import type { AnalyzedIssue, GitHubIssue, StaleReason } from "./types";

const router = Router();

router.get("/issues", (_req: Request, res: Response) => {
  const store = getStore();
  res.json({
    issues: store.issues,
    status: store.analysisStatus,
    error: store.analysisError,
    progress: store.analysisProgress,
  });
});

router.post("/issues/analyze", async (_req: Request, res: Response) => {
  const apiKey = process.env.DEVIN_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;
  const store = getStore();

  if (store.analysisStatus === "fetching" || store.analysisStatus === "analyzing") {
    res.json({
      message: "Analysis already in progress",
      status: store.analysisStatus,
      progress: store.analysisProgress,
    });
    return;
  }

  if (!apiKey) {
    res.status(500).json({ error: "DEVIN_API_KEY not configured" });
    return;
  }

  setAnalysisStatus("fetching");
  setIssues([]);

  res.json({ message: "Analysis started", status: "fetching" });

  try {
    const rawIssues = await fetchOpenIssues(githubToken);
    console.log(`Fetched ${rawIssues.length} issues from GitHub`);

    setAnalysisStatus("analyzing");
    setAnalysisProgress(0, rawIssues.length);

    console.log(`Creating Devin session with first issue (#${rawIssues[0].number})`);
    const session = await createAnalysisSession(rawIssues[0], apiKey);
    const sessionId = session.session_id;
    console.log(`Created analysis session ${sessionId}`);

    addAnalysisSession("analysis", sessionId, 0, rawIssues.map((i) => i.number));

    let lastMessageCount = 0;

    console.log(`[1/${rawIssues.length}] Waiting for analysis of #${rawIssues[0].number}...`);
    setAnalysisProgress(0, rawIssues.length, `#${rawIssues[0].number} ${rawIssues[0].title}`);
    const firstResult = await waitForNewAnalysis(sessionId, rawIssues[0].number, lastMessageCount, apiKey);
    if (firstResult) {
      lastMessageCount = firstResult.messageCount;
      const merged = mergeAnalysisWithOriginal([firstResult.analysis], rawIssues);
      addIssues(merged);
      console.log(`[1/${rawIssues.length}] Issue #${rawIssues[0].number} analyzed`);
    } else {
      console.log(`[1/${rawIssues.length}] Timed out waiting for #${rawIssues[0].number}`);
    }
    setAnalysisProgress(1, rawIssues.length);

    for (let i = 1; i < rawIssues.length; i++) {
      const issue = rawIssues[i];
      console.log(`[${i + 1}/${rawIssues.length}] Sending issue #${issue.number} to session...`);
      setAnalysisProgress(i, rawIssues.length, `#${issue.number} ${issue.title}`);

      try {
        await sendNextIssue(sessionId, issue, apiKey);
        const result = await waitForNewAnalysis(sessionId, issue.number, lastMessageCount, apiKey);
        if (result) {
          lastMessageCount = result.messageCount;
          const merged = mergeAnalysisWithOriginal([result.analysis], rawIssues);
          addIssues(merged);
          console.log(`[${i + 1}/${rawIssues.length}] Issue #${issue.number} analyzed`);
        } else {
          console.log(`[${i + 1}/${rawIssues.length}] Timed out waiting for #${issue.number}`);
        }
      } catch (err) {
        console.error(`[${i + 1}/${rawIssues.length}] Error analyzing issue #${issue.number}:`, err);
      }

      setAnalysisProgress(i + 1, rawIssues.length);
    }

    const analyzed = getStore().issues;
    const fallbackIssues = rawIssues.filter(
      (raw) => !analyzed.some((a) => a.number === raw.number)
    );
    if (fallbackIssues.length > 0) {
      console.log(`${fallbackIssues.length} issues not analyzed by Devin, using fallback`);
      addIssues(fallbackIssues.map((issue) => ({
        number: issue.number,
        title: issue.title,
        summary: (issue.body || "No description available").substring(0, 200),
        priority: "medium" as const,
        difficulty: "medium" as const,
        feature: inferFeatureFromLabels(issue),
        stale: false,
        staleReason: null,
        html_url: issue.html_url,
        labels: issue.labels,
        created_at: issue.created_at,
        comments: issue.comments,
      })));
    }

    setAnalysisStatus("complete");
    console.log(`Analysis complete. Total issues: ${getStore().issues.length}`);
  } catch (error) {
    console.error("Analysis failed:", error);
    setAnalysisStatus("error", error instanceof Error ? error.message : "Unknown error");
  }
});

interface AnalysisResult {
  analysis: {
    number: number;
    summary: string;
    priority: "critical" | "high" | "medium" | "low";
    difficulty: "easy" | "medium" | "hard" | "expert";
    feature: string;
    stale: boolean;
    staleReason: string | null;
  };
  messageCount: number;
}

async function waitForNewAnalysis(
  sessionId: string,
  issueNumber: number,
  lastMessageCount: number,
  apiKey: string,
  maxAttempts = 60,
  intervalMs = 5000
): Promise<AnalysisResult | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    let details;
    try {
      details = await getSessionDetails(sessionId, apiKey);
    } catch (err) {
      console.error(`  Poll ${attempt}/${maxAttempts}: Error:`, err);
      continue;
    }

    const messages = details.messages || [];
    const statusEnum = details.status_enum || details.status;
    console.log(`  Poll ${attempt}/${maxAttempts}: status=${details.status}, status_enum=${statusEnum}, totalMessages=${messages.length} (last seen: ${lastMessageCount})`);

    if (messages.length > lastMessageCount) {
      for (let j = messages.length - 1; j >= lastMessageCount; j--) {
        const msg = messages[j];
        const msgText = msg.message || "";
        console.log(`  Message[${j}] type="${msg.type}" origin="${msg.origin}" text(first 300)="${msgText.substring(0, 300)}"`);
        if (msg.type === "user_message") continue;
        const parsed = parseAnalysisFromMessage(msgText);
        if (parsed) {
          console.log(`  Found analysis for #${parsed.number} in message ${j}`);
          return { analysis: parsed, messageCount: messages.length };
        }
      }
      console.log(`  New messages but no valid JSON for #${issueNumber}, updating lastMessageCount`);
      lastMessageCount = messages.length;
    }

    if (statusEnum === "finished" || statusEnum === "blocked" || statusEnum === "expired") {
      console.log(`  Session ended with status_enum=${statusEnum}`);
      return null;
    }
  }

  console.log(`  Timed out waiting for analysis of #${issueNumber}`);
  return null;
}

const VALID_STALE_REASONS = new Set(["outdated", "duplicate", "wont-fix", "not-reproducible", "already-resolved"]);

function mergeAnalysisWithOriginal(
  analyzed: Array<{
    number: number;
    summary: string;
    priority: "critical" | "high" | "medium" | "low";
    difficulty: "easy" | "medium" | "hard" | "expert";
    feature: string;
    stale?: boolean;
    staleReason?: string | null;
  }>,
  original: GitHubIssue[]
): AnalyzedIssue[] {
  const originalMap = new Map(original.map((i) => [i.number, i]));

  return analyzed
    .map((a) => {
      const orig = originalMap.get(a.number);
      if (!orig) return null;

      const staleReason = (a.staleReason && VALID_STALE_REASONS.has(a.staleReason))
        ? a.staleReason as StaleReason
        : null;

      return {
        number: a.number,
        title: orig.title,
        summary: a.summary || (orig.body || "No description").substring(0, 200),
        priority: a.priority || "medium",
        difficulty: a.difficulty || "medium",
        feature: a.feature || inferFeatureFromLabels(orig),
        stale: a.stale === true,
        staleReason,
        html_url: orig.html_url,
        labels: orig.labels,
        created_at: orig.created_at,
        comments: orig.comments,
      };
    })
    .filter((i): i is AnalyzedIssue => i !== null);
}

function inferFeatureFromLabels(issue: GitHubIssue): string {
  const labelNames = issue.labels.map((l) => l.name.toLowerCase());

  if (labelNames.some((l) => l.includes("bug"))) return "bug-fix";
  if (labelNames.some((l) => l.includes("enhancement") || l.includes("feature")))
    return "enhancement";
  if (labelNames.some((l) => l.includes("doc"))) return "documentation";
  if (labelNames.some((l) => l.includes("ui") || l.includes("frontend"))) return "ui";
  if (labelNames.some((l) => l.includes("api") || l.includes("backend"))) return "api";
  if (labelNames.some((l) => l.includes("test"))) return "testing";
  if (labelNames.some((l) => l.includes("infra") || l.includes("deploy")))
    return "infrastructure";

  return "general";
}

router.get("/issues/:issueNumber", async (req: Request, res: Response) => {
  const githubToken = process.env.GITHUB_TOKEN;
  const issueNumber = parseInt(req.params.issueNumber, 10);

  if (isNaN(issueNumber)) {
    res.status(400).json({ error: "Invalid issue number" });
    return;
  }

  try {
    const store = getStore();
    const cached = store.issues.find((i) => i.number === issueNumber);
    if (cached) {
      res.json(cached);
      return;
    }

    const issue = await fetchSingleIssue(issueNumber, githubToken);
    res.json({
      number: issue.number,
      title: issue.title,
      summary: (issue.body || "No description").substring(0, 200),
      priority: "medium",
      difficulty: "medium",
      feature: inferFeatureFromLabels(issue),
      stale: false,
      staleReason: null,
      html_url: issue.html_url,
      labels: issue.labels,
      created_at: issue.created_at,
      comments: issue.comments,
    });
  } catch (error) {
    console.error("Error fetching issue:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch issue",
    });
  }
});

router.get("/stars", (_req: Request, res: Response) => {
  res.json({ starred: getStarredIssues() });
});

router.post("/stars/:issueNumber", (req: Request, res: Response) => {
  const issueNumber = parseInt(req.params.issueNumber, 10);
  if (isNaN(issueNumber)) {
    res.status(400).json({ error: "Invalid issue number" });
    return;
  }
  starIssue(issueNumber);
  res.json({ success: true, starred: getStarredIssues() });
});

router.delete("/stars/:issueNumber", (req: Request, res: Response) => {
  const issueNumber = parseInt(req.params.issueNumber, 10);
  if (isNaN(issueNumber)) {
    res.status(400).json({ error: "Invalid issue number" });
    return;
  }
  unstarIssue(issueNumber);
  res.json({ success: true, starred: getStarredIssues() });
});

router.post("/chat", async (req: Request, res: Response) => {
  const apiKey = process.env.DEVIN_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!apiKey) {
    res.status(500).json({ error: "DEVIN_API_KEY not configured" });
    return;
  }

  const { issueNumber, message } = req.body;

  if (!issueNumber || !message) {
    res.status(400).json({ error: "issueNumber and message are required" });
    return;
  }

  try {
    const issue = await fetchSingleIssue(issueNumber, githubToken);

    const session = await createResearchSession(
      issueNumber,
      issue.title,
      issue.body || "No description",
      message,
      apiKey
    );

    const chatSession = {
      sessionId: session.session_id,
      issueNumber,
      status: "running",
      messages: [
        {
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    addChatSession(session.session_id, chatSession);

    res.json({
      sessionId: session.session_id,
      url: session.url,
      status: "running",
    });
  } catch (error) {
    console.error("Error creating chat session:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to create chat session",
    });
  }
});

router.post("/chat/:sessionId/message", async (req: Request, res: Response) => {
  const apiKey = process.env.DEVIN_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "DEVIN_API_KEY not configured" });
    return;
  }

  const { sessionId } = req.params;
  const { message } = req.body;

  if (!message) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  try {
    await sendSessionMessage(sessionId, message, apiKey);

    const session = getChatSession(sessionId);
    if (session) {
      session.messages.push({
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to send message",
    });
  }
});

router.get("/chat/:sessionId", async (req: Request, res: Response) => {
  const apiKey = process.env.DEVIN_API_KEY;

  if (!apiKey) {
    res.status(500).json({ error: "DEVIN_API_KEY not configured" });
    return;
  }

  const { sessionId } = req.params;

  try {
    const details = await getSessionDetails(sessionId, apiKey);
    const localSession = getChatSession(sessionId);

    const devinMessages = (details.messages || [])
      .filter((m) => m.type !== "user_message")
      .map((m) => ({
        role: "assistant",
        content: m.message,
        timestamp: m.timestamp || new Date().toISOString(),
      }));

    const localMessages = localSession ? localSession.messages : [];

    const allMessages = [...localMessages, ...devinMessages];
    allMessages.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    res.json({
      sessionId,
      status: details.status,
      url: details.url,
      messages: allMessages,
    });
  } catch (error) {
    console.error("Error getting chat session:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to get session",
    });
  }
});

export default router;
