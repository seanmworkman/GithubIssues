import { GitHubIssue } from "./types";

const GITHUB_API_BASE = "https://api.github.com";
const REPO_OWNER = "wso2";
const REPO_NAME = "financial-services-accelerator";
const ISSUES_PER_PAGE = 100;
const MAX_ISSUES = 400;

export async function fetchOpenIssues(
  token?: string
): Promise<GitHubIssue[]> {
  const allIssues: GitHubIssue[] = [];
  const totalPages = Math.ceil(MAX_ISSUES / ISSUES_PER_PAGE);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "github-issues-triage-app",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  for (let page = 1; page <= totalPages; page++) {
    const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=open&per_page=${ISSUES_PER_PAGE}&page=${page}&sort=created&direction=desc`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `GitHub API error (${response.status}): ${errorText}`
      );
    }

    const issues = await response.json() as GitHubIssue[];

    if (issues.length === 0) break;

    const filteredIssues = issues.filter(
      (issue) => !("pull_request" in issue)
    );

    allIssues.push(...filteredIssues);

    if (allIssues.length >= MAX_ISSUES) break;
  }

  return allIssues.slice(0, MAX_ISSUES);
}

export async function fetchSingleIssue(
  issueNumber: number,
  token?: string
): Promise<GitHubIssue> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "github-issues-triage-app",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${GITHUB_API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GitHub API error (${response.status}): ${errorText}`
    );
  }

  return response.json() as Promise<GitHubIssue>;
}
