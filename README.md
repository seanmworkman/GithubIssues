# GitHub Issues Triage

Triage, classify, and prioritize GitHub issues using AI-powered analysis via [Devin](https://devin.ai).

This app pulls open issues from [openclaw/openclaw](https://github.com/openclaw/openclaw), uses the Devin API to summarize, prioritize, assess difficulty, and categorize each issue by feature area. A React-based UI displays the results with sorting, filtering, starring, and an integrated chat window for deep-diving into individual issues.

## Architecture

```
GithubIssues/
├── backend/          # Node.js + Express + TypeScript API server
│   └── src/
│       ├── index.ts      # Express server setup with CORS
│       ├── routes.ts     # All API route handlers
│       ├── github.ts     # GitHub REST API client
│       ├── devin.ts      # Devin API client (sessions, messages, structured output)
│       ├── store.ts      # In-memory data store
│       └── types.ts      # Shared TypeScript interfaces
├── frontend/         # React + Vite + TypeScript + Tailwind CSS
│   └── src/
│       ├── App.tsx              # Main app layout
│       ├── api.ts               # Frontend API client
│       ├── types.ts             # Shared types and constants
│       └── components/
│           ├── IssueCard.tsx        # Individual issue card
│           ├── IssueList.tsx        # Sorted/grouped issue list
│           ├── StarredSection.tsx   # Pinned starred issues area
│           ├── SortControls.tsx     # Sort by priority/difficulty/feature
│           ├── FeatureFilter.tsx    # Filter by feature category
│           ├── AnalysisStatus.tsx   # Analysis progress indicator
│           └── ChatWindow.tsx       # Devin-powered issue research chat
└── README.md
```

## Features

- **AI-Powered Issue Analysis**: Uses Devin API to analyze up to 400 open issues, providing summaries, priority levels, difficulty ratings, and feature categorization
- **Sort & Filter**: Sort issues by priority, difficulty, or feature; filter by feature category
- **Star/Pin Issues**: Star any issue to pin it to a dedicated section at the top of the page
- **Issue Research Chat**: Right-side chat panel powered by Devin for deep-diving into specific issues using `issue:1234` syntax
- **Real-Time Progress**: Live progress bar and status updates during analysis
- **Grouped Views**: When sorting by feature, issues are automatically grouped under category headers

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/issues` | Returns all analyzed issues with analysis status and progress |
| `POST` | `/api/issues/analyze` | Triggers Devin to fetch and analyze the top 400 open issues |
| `GET` | `/api/issues/:issueNumber` | Returns details for a single issue |
| `GET` | `/api/stars` | Returns all starred issue numbers |
| `POST` | `/api/stars/:issueNumber` | Stars an issue |
| `DELETE` | `/api/stars/:issueNumber` | Unstars an issue |
| `POST` | `/api/chat` | Creates a new Devin research session for an issue |
| `POST` | `/api/chat/:sessionId/message` | Sends a follow-up message to an existing session |
| `GET` | `/api/chat/:sessionId` | Returns session status and messages |

## Prerequisites

- **Node.js** >= 18
- **Devin API Key** ([generate one here](https://app.devin.ai/settings/api-keys))
- **GitHub Token** (optional, increases rate limits)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/seanmworkman/GithubIssues.git
cd GithubIssues
```

### 2. Set up the backend

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and add your API keys:

```
DEVIN_API_KEY=your_devin_api_key_here
GITHUB_TOKEN=your_github_token_here   # optional
PORT=3001
```

Start the backend:

```bash
npm run dev
```

The server starts at `http://localhost:3001`.

### 3. Set up the frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:5173` and proxies `/api` requests to the backend.

### 4. Analyze issues

Open `http://localhost:5173` in your browser, then click **Start Analysis** to begin. Devin will fetch the top 400 open issues from openclaw/openclaw and analyze each batch.

## Usage

### Sorting & Filtering

- Click the **Priority**, **Difficulty**, or **Feature** sort buttons to reorder issues
- Click a sort button again to toggle ascending/descending
- Use the feature filter chips to show only issues in a specific category

### Starring Issues

- Click the star icon on any issue card to pin it to the top
- Starred issues appear in a highlighted section above the main list
- Click the star again to unpin

### Chat / Issue Research

- Use the chat panel on the right side of the screen
- Reference an issue: `issue:1234 What is the root cause of this bug?`
- Follow-up messages are sent to the same Devin session
- A link to the full Devin session is available in the chat header

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DEVIN_API_KEY` | Yes | Devin API bearer token for issue analysis and chat |
| `GITHUB_TOKEN` | No | GitHub personal access token (increases API rate limits) |
| `PORT` | No | Backend server port (default: `3001`) |
| `FRONTEND_URL` | No | Allowed CORS origin (default: `http://localhost:5173`) |

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Lucide Icons
- **APIs**: GitHub REST API, Devin API v1 (sessions, messages, structured output)
- **Analysis**: Devin AI for summarization, prioritization, difficulty assessment, and feature categorization
