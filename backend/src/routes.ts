import { Router, Request, Response } from "express";
import { fetchOpenIssues, fetchSingleIssue } from "./github";
import {
  createSingleIssueAnalysisSession,
  getSessionDetails,
  createResearchSession,
  sendSessionMessage,
  parseAnalysisOutput,
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
import { AnalyzedIssue, GitHubIssue } from "./types";

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
    console.log(`Processing ${rawIssues.length} issues one-by-one`);

    for (let i = 0; i < rawIssues.length; i++) {
      const issue = rawIssues[i];
      setAnalysisProgress(i, rawIssues.length, `#${issue.number}: ${issue.title}`);

      try {
        const session = await createSingleIssueAnalysisSession(issue, apiKey);
        console.log(`[${i + 1}/${rawIssues.length}] Created session ${session.session_id} for issue #${issue.number}`);

        addAnalysisSession(
          `issue-${issue.number}`,
          session.session_id,
          i,
          [issue.number]
        );

        const analyzed = await pollForAnalysisResults(
          session.session_id,
          [issue],
          apiKey
        );

        addIssues(analyzed);
        setAnalysisProgress(i + 1, rawIssues.length);
        console.log(`[${i + 1}/${rawIssues.length}] Issue #${issue.number} analyzed`);
      } catch (issueError) {
        console.error(`[${i + 1}/${rawIssues.length}] Error analyzing issue #${issue.number}:`, issueError);

        addIssues([{
          number: issue.number,
          title: issue.title,
          summary: (issue.body || "No description available").substring(0, 200),
          priority: "medium" as const,
          difficulty: "medium" as const,
          feature: inferFeatureFromLabels(issue),
          html_url: issue.html_url,
          labels: issue.labels,
          created_at: issue.created_at,
          comments: issue.comments,
        }]);
        setAnalysisProgress(i + 1, rawIssues.length);
      }
    }

    setAnalysisStatus("complete");
    console.log(`Analysis complete. Total issues: ${getStore().issues.length}`);
  } catch (error) {
    console.error("Analysis failed:", error);
    setAnalysisStatus("error", error instanceof Error ? error.message : "Unknown error");
  }
});

async function pollForAnalysisResults(
  sessionId: string,
  originalIssues: GitHubIssue[],
  apiKey: string,
  maxAttempts = 60,
  intervalMs = 10000
): Promise<AnalyzedIssue[]> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    const details = await getSessionDetails(sessionId, apiKey);

    if (details.structured_output) {
      const parsed = parseAnalysisOutput(details.structured_output);
      if (parsed && parsed.issues.length > 0) {
        const completedIssues = parsed.issues.filter(
          (i) => i.summary && i.feature
        );

        if (completedIssues.length >= originalIssues.length * 0.5) {
          return mergeAnalysisWithOriginal(completedIssues, originalIssues);
        }
      }
    }

    if (details.status === "finished" || details.status === "stopped" || details.status === "error") {
      if (details.structured_output) {
        const parsed = parseAnalysisOutput(details.structured_output);
        if (parsed) {
          return mergeAnalysisWithOriginal(parsed.issues, originalIssues);
        }
      }

      return originalIssues.map((issue) => ({
        number: issue.number,
        title: issue.title,
        summary: (issue.body || "No description available").substring(0, 200),
        priority: "medium" as const,
        difficulty: "medium" as const,
        feature: inferFeatureFromLabels(issue),
        html_url: issue.html_url,
        labels: issue.labels,
        created_at: issue.created_at,
        comments: issue.comments,
      }));
    }
  }

  return originalIssues.map((issue) => ({
    number: issue.number,
    title: issue.title,
    summary: (issue.body || "No description available").substring(0, 200),
    priority: "medium" as const,
    difficulty: "medium" as const,
    feature: inferFeatureFromLabels(issue),
    html_url: issue.html_url,
    labels: issue.labels,
    created_at: issue.created_at,
    comments: issue.comments,
  }));
}

function mergeAnalysisWithOriginal(
  analyzed: Array<{
    number: number;
    summary: string;
    priority: "critical" | "high" | "medium" | "low";
    difficulty: "easy" | "medium" | "hard" | "expert";
    feature: string;
  }>,
  original: GitHubIssue[]
): AnalyzedIssue[] {
  const originalMap = new Map(original.map((i) => [i.number, i]));

  return analyzed
    .map((a) => {
      const orig = originalMap.get(a.number);
      if (!orig) return null;

      return {
        number: a.number,
        title: orig.title,
        summary: a.summary || (orig.body || "No description").substring(0, 200),
        priority: a.priority || "medium",
        difficulty: a.difficulty || "medium",
        feature: a.feature || inferFeatureFromLabels(orig),
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
      .filter((m) => m.role !== "user")
      .map((m) => ({
        role: "assistant",
        content: m.content,
        timestamp: m.created_at || new Date().toISOString(),
      }));

    const allMessages = localSession
      ? [...localSession.messages, ...devinMessages]
      : devinMessages;

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
