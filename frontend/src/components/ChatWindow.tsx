import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, MessageSquare, ExternalLink, X } from "lucide-react";
import type { ChatMessage } from "../types";
import { createChatSession, sendChatMessage, getChatSession } from "../api";

interface ChatWindowProps {
  prefillIssueNumber: number | null;
  onClearPrefill: () => void;
}

interface ActiveSession {
  sessionId: string;
  issueNumber: number;
  url: string;
}

export default function ChatWindow({ prefillIssueNumber, onClearPrefill }: ChatWindowProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (prefillIssueNumber !== null) {
      setInput(`issue:${prefillIssueNumber} `);
      onClearPrefill();
    }
  }, [prefillIssueNumber, onClearPrefill]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const pollSession = useCallback(
    (sessionId: string) => {
      if (pollingRef.current) clearInterval(pollingRef.current);

      setPolling(true);
      pollingRef.current = setInterval(async () => {
        try {
          const session = await getChatSession(sessionId);
          const assistantMessages = session.messages.filter(
            (m) => m.role === "assistant"
          );

          if (assistantMessages.length > 0) {
            setMessages((prev) => {
              const userMessages = prev.filter((m) => m.role === "user");
              return [...userMessages, ...assistantMessages];
            });
          }

          if (
            session.status === "finished" ||
            session.status === "stopped" ||
            session.status === "error"
          ) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setPolling(false);
          }
        } catch {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setPolling(false);
        }
      }, 5000);
    },
    []
  );

  const parseIssueReference = (text: string): { issueNumber: number; question: string } | null => {
    const match = text.match(/issue:(\d+)\s*(.*)/i);
    if (match) {
      return {
        issueNumber: parseInt(match[1], 10),
        question: match[2].trim() || `Tell me about issue #${match[1]}`,
      };
    }
    return null;
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const parsed = parseIssueReference(trimmed);

      if (parsed) {
        if (activeSession && activeSession.issueNumber === parsed.issueNumber) {
          await sendChatMessage(activeSession.sessionId, parsed.question);
          pollSession(activeSession.sessionId);
        } else {
          const session = await createChatSession(parsed.issueNumber, parsed.question);
          setActiveSession({
            sessionId: session.sessionId,
            issueNumber: parsed.issueNumber,
            url: session.url,
          });
          pollSession(session.sessionId);
        }
      } else if (activeSession) {
        await sendChatMessage(activeSession.sessionId, trimmed);
        pollSession(activeSession.sessionId);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              'Please reference an issue using the format "issue:1234 your question here" to start a research session.',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearSession = () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    setActiveSession(null);
    setMessages([]);
    setPolling(false);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-blue-500" />
          <h2 className="text-sm font-semibold text-gray-800">Issue Research</h2>
        </div>
        <div className="flex items-center gap-2">
          {activeSession && (
            <>
              <a
                href={activeSession.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1"
              >
                Devin Session <ExternalLink size={12} />
              </a>
              <button
                onClick={handleClearSession}
                className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                title="Clear session"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <MessageSquare size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">
              Reference an issue to start researching
            </p>
            <p className="text-xs text-gray-300 mt-1">
              Example: issue:1234 What is the root cause of this bug?
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-xs lg:max-w-sm px-3 py-2 rounded-lg text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <p className="whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
          </div>
        ))}
        {(loading || polling) && (
          <div className="flex justify-start">
            <div className="bg-gray-100 px-3 py-2 rounded-lg flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-blue-500" />
              <span className="text-xs text-gray-500">
                {loading ? "Sending..." : "Devin is researching..."}
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-200">
        {activeSession && (
          <div className="text-xs text-gray-400 mb-2">
            Researching issue #{activeSession.issueNumber}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="issue:1234 Ask about an issue..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
