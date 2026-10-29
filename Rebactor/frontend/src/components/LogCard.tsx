"use client";

import React, { useState } from "react";
import { FailedJobLog } from "@/types";
import {
  AlertTriangle,
  CheckCircle,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Terminal,
  FileCode,
  Check,
  Filter,
  AlertCircle,
  Search,
} from "lucide-react";

interface LogCardProps {
  log: FailedJobLog;
  onAnalyze?: (log: FailedJobLog) => void;
}

export function LogCard({ log }: LogCardProps) {
  const [viewMode, setViewMode] = useState<"summary" | "clean" | "raw">("summary");
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [summary, setSummary] = useState(log.parsed_summary);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [logFilterQuery, setLogFilterQuery] = useState("");

  // Formats raw terminal logs by stripping ANSI sequences and extracting structured log entries
  const cleanLog = (text: string) => {
    return text
      .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();
  };

  // Parses raw logs into structured lines with line numbers, timestamp detection, and error categorization
  const formatLogLines = (text: string) => {
    const cleaned = cleanLog(text);
    return cleaned.split("\n").map((line, idx) => {
      // Extract ISO timestamp if present at start (e.g. 2026-10-29T21:40:12.1234567Z)
      const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\s*(.*)$/);
      let timestamp = "";
      let content = line;

      if (timestampMatch) {
        timestamp = timestampMatch[1];
        content = timestampMatch[2];
      }

      const isError =
        /\b(error|fatal|fail|failed|failure|exception|err!|panic|severe)\b/i.test(content) ||
        content.startsWith("##[error]");
      const isWarning =
        /\b(warn|warning)\b/i.test(content) || content.startsWith("##[warning]");
      const isStepHeader =
        content.startsWith("##[group]") ||
        content.startsWith("##[section]") ||
        /^==+>/.test(content) ||
        /^\[\s*(step|job|build)\s*\]/i.test(content);
      const isCommand = content.startsWith("$") || content.startsWith(">") || content.startsWith("Run ");

      // Clean GitHub Actions special workflow command annotations
      const displayContent = content.replace(/^##\[(error|warning|group|endgroup|section)\]\s*/i, "");

      return {
        lineNum: idx + 1,
        timestamp,
        content: displayContent,
        isError,
        isWarning,
        isStepHeader,
        isCommand,
      };
    });
  };

  // Generates clean formatted log text matching the user's active formatted view (including line numbers and any active error filters)
  const getFormattedLogText = () => {
    const formatted = formatLogLines(log.logs)
      .filter((l) => (!onlyErrors || l.isError) && (!logFilterQuery || l.content.toLowerCase().includes(logFilterQuery.toLowerCase())))
      .map((l) => {
        const timePart = l.timestamp ? ` [${l.timestamp.slice(11, 19)}] ` : " ";
        const prefix = l.isError ? "[ERROR] " : l.isWarning ? "[WARN]  " : "";
        return `${String(l.lineNum).padStart(4, " ")} |${timePart}${prefix}${l.content}`;
      });
    return formatted.join("\n");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCurrentView = () => {
    if (viewMode === "summary") {
      copyToClipboard(summary ? JSON.stringify(summary, null, 2) : "AI Diagnosis not yet generated.");
    } else if (viewMode === "clean") {
      copyToClipboard(getFormattedLogText());
    } else {
      copyToClipboard(log.logs);
    }
  };

  const handleRunAiAnalysis = async () => {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const { analyzeSingleLog } = await import("@/lib/api");
      const result = await analyzeSingleLog({
        raw_log: log.logs,
        job_name: log.job_name,
        repository: log.run_name || "ci-cd-repo",
        run_id: log.run_id,
      });
      setSummary(result);
      setViewMode("summary");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to run AI analysis";
      setAnalyzeError(msg);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="rounded-xl border border-[#1e293b] bg-[#0c121e] overflow-hidden shadow-xl transition-all duration-200 hover:border-[#334155]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-[#111827]/70 border-b border-[#1e293b]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>

          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)] animate-pulse" />

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-white tracking-wide">
                {log.run_name}
              </span>
              <span className="text-gray-500 text-xs">/</span>
              <span className="text-rose-400 font-mono text-xs font-medium">
                {log.job_name}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 font-mono">
              <span>Run #{log.run_number || log.run_id}</span>
              {log.branch && (
                <>
                  <span>•</span>
                  <span className="text-cyan-400">branch: {log.branch}</span>
                </>
              )}
              {log.commit && (
                <>
                  <span>•</span>
                  <span className="text-gray-500">{log.commit.slice(0, 7)}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* View mode switcher & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Segmented View Mode Tabs */}
          <div className="flex items-center bg-[#070b13] p-1 rounded-lg border border-[#1b263b]">
            <button
              onClick={() => setViewMode("summary")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-mono transition-all ${
                viewMode === "summary"
                  ? "bg-[#6366f1]/20 text-[#a5b4fc] border border-[#6366f1]/40 shadow-sm font-semibold"
                  : "text-gray-400 hover:text-gray-200 border border-transparent"
              }`}
            >
              <Sparkles size={13} className={viewMode === "summary" ? "text-cyan-300" : "text-gray-400"} />
              <span>AI Diagnosis</span>
              {summary && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />}
            </button>
            <button
              onClick={() => setViewMode("clean")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-mono transition-all ${
                viewMode === "clean"
                  ? "bg-[#6366f1]/20 text-[#a5b4fc] border border-[#6366f1]/40 shadow-sm font-semibold"
                  : "text-gray-400 hover:text-gray-200 border border-transparent"
              }`}
            >
              <FileCode size={13} />
              <span>Formatted</span>
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md font-mono transition-all ${
                viewMode === "raw"
                  ? "bg-[#6366f1]/20 text-[#a5b4fc] border border-[#6366f1]/40 shadow-sm font-semibold"
                  : "text-gray-400 hover:text-gray-200 border border-transparent"
              }`}
            >
              <Terminal size={13} />
              <span>Raw Log</span>
            </button>
          </div>

          <div className="h-4 w-px bg-[#1e293b]" />

          {/* Quick Actions */}
          <button
            onClick={handleCopyCurrentView}
            title={
              viewMode === "summary"
                ? "Copy AI Diagnostic JSON"
                : viewMode === "clean"
                ? "Copy Formatted Structured Log"
                : "Copy Raw Terminal Log"
            }
            className="p-1.5 rounded-lg border border-[#1b263b] bg-[#070b13] text-gray-400 hover:text-cyan-300 hover:border-[#2b3a55] transition-colors"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          </button>

          {/* External Links */}
          {(log.html_url || log.job_url) && (
            <a
              href={log.html_url || log.job_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open GitHub Workflow Run"
              className="p-1.5 rounded-lg border border-[#1b263b] bg-[#070b13] text-gray-400 hover:text-cyan-300 hover:border-[#2b3a55] transition-colors"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      {isExpanded && (
        <div className="p-5">
          {viewMode === "summary" ? (
            summary ? (
              <div className="space-y-4">
                {/* Diagnosis Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-lg bg-[#131b2c] border border-[#1e2b45]">
                    <div className="text-[11px] font-mono uppercase text-gray-400 font-semibold mb-1">
                      Category
                    </div>
                    <div className="text-sm font-medium text-cyan-300">
                      {summary.category}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#131b2c] border border-[#1e2b45]">
                    <div className="text-[11px] font-mono uppercase text-gray-400 font-semibold mb-1">
                      Failed Step / Target
                    </div>
                    <div className="text-sm font-mono font-medium text-rose-300 truncate" title={summary.failed_step}>
                      {summary.failed_step}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#131b2c] border border-[#1e2b45]">
                    <div className="text-[11px] font-mono uppercase text-gray-400 font-semibold mb-1">
                      Exit Code / Confidence
                    </div>
                    <div className="text-sm font-mono font-medium text-amber-300">
                      {summary.exit_code !== null ? `Code ${summary.exit_code}` : "N/A"}{" "}
                      <span className="text-xs text-gray-400 font-sans">
                        ({Math.round(summary.confidence * 100)}% conf.)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plain English Summary Box if present */}
                {summary.plain_summary && (
                  <div className="p-3.5 rounded-lg bg-[#141f33] border border-[#233555] flex items-start gap-3">
                    <Sparkles size={16} className="text-[#00f5d4] shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[11px] font-mono uppercase text-[#00f5d4] font-semibold mb-0.5">
                        Plain-Language Summary ({summary.engine || "LLM Reasoning"})
                      </div>
                      <p className="text-sm text-gray-200 leading-relaxed font-sans">
                        {summary.plain_summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* RAG Memory Banner (Retrieved Historical Incident) */}
                {summary.rag_incident_match && (
                  <div className="p-4 rounded-lg bg-[#0e1d2f] border border-cyan-500/40 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-cyan-300">
                        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                        RAG Memory Match: {summary.rag_incident_match.incident_id} ({Math.round(summary.rag_incident_match.similarity_score * 100)}% Similarity)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                        Org Knowledge Base
                      </span>
                    </div>
                    <div className="text-xs font-mono text-gray-300">
                      <span className="text-cyan-400 font-medium">Historical Resolution: </span>
                      {summary.rag_incident_match.resolution}
                    </div>
                    <div className="text-[11px] font-mono text-gray-400">
                      Source: <code className="text-gray-300">{summary.rag_incident_match.repository}</code> • {summary.rag_incident_match.workflow_name}
                    </div>
                  </div>
                )}

                {/* Root Cause Box */}
                <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-500/30">
                  <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold uppercase mb-1.5">
                    <AlertTriangle size={15} />
                    Root Cause Analysis
                  </div>
                  <p className="text-sm text-rose-100 font-mono leading-relaxed">
                    {summary.root_cause}
                  </p>
                </div>

                {/* Auto Fix Box */}
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-semibold uppercase mb-1.5">
                    <CheckCircle size={15} />
                    Recommended Fix
                  </div>
                  <p className="text-sm text-emerald-100 leading-relaxed font-mono">
                    {summary.auto_fix}
                  </p>
                </div>

                {/* Failed steps chips if any */}
                {log.failed_steps && log.failed_steps.length > 0 && (
                  <div>
                    <div className="text-xs font-mono text-gray-400 mb-2">Step Details:</div>
                    <div className="flex flex-wrap gap-2">
                      {log.failed_steps.map((step, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e293b] border border-[#334155] text-xs font-mono text-rose-300"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                          {step.name || `Step #${step.number}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* ON-DEMAND AI PLACEHOLDER TO SAVE COSTS */
              <div className="py-7 px-6 rounded-xl bg-[#070b13]/80 border border-[#1b263b] text-center flex flex-col items-center justify-center space-y-4 shadow-sm">
                <div className="relative">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#6366f1]/20 to-[#a855f7]/20 border border-[#8b5cf6]/30 flex items-center justify-center">
                    <Sparkles size={20} className="text-[#c084fc] animate-pulse" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                </div>

                <div className="max-w-md space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1e1b4b] border border-[#4338ca] text-[11px] font-mono text-cyan-300">
                    <span>⚡ Fast Log Parser</span>
                    <span>•</span>
                    <span>DeepSeek / Groq</span>
                  </div>
                  <h4 className="text-sm font-semibold text-white tracking-wide font-mono pt-1">
                    AI Diagnostic Ready for Synthesis
                  </h4>
                  <p className="text-xs text-gray-400 font-sans leading-relaxed">
                    Logs were retrieved on-demand. Trigger the AI engine to generate root-cause analysis, step attribution, and automated fixes.
                  </p>
                </div>

                {analyzeError && (
                  <div className="text-xs font-mono text-rose-400 bg-rose-950/30 border border-rose-500/30 px-3 py-1.5 rounded-lg">
                    {analyzeError}
                  </div>
                )}

                <button
                  onClick={handleRunAiAnalysis}
                  disabled={analyzing}
                  className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:from-[#4f46e5] hover:to-[#7c3aed] text-white text-xs font-mono font-medium shadow-[0_0_15px_rgba(99,102,241,0.35)] transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  <Sparkles size={14} className={analyzing ? "animate-spin text-cyan-200" : "text-yellow-300"} />
                  <span>{analyzing ? "Synthesizing AI Diagnosis..." : "Run AI Diagnosis"}</span>
                </button>
              </div>
            )
          ) : viewMode === "clean" ? (
            /* FORMATTED LOG VIEW WITH SYNTAX HIGHLIGHTING, LINE NUMBERS & TIMESTAMPS */
            <div className="space-y-3">
              {/* Formatted Log Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 rounded-lg bg-[#070b13] border border-[#1b263b] text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-gray-400 font-medium flex items-center gap-1.5">
                    <FileCode size={13} className="text-cyan-400" />
                    Structured Log Stream
                  </span>
                  <span className="text-gray-600">|</span>
                  <button
                    onClick={() => setOnlyErrors(!onlyErrors)}
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                      onlyErrors
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                        : "bg-[#111928] text-gray-400 hover:text-white border border-[#1e2a3f]"
                    }`}
                  >
                    <AlertCircle size={11} className={onlyErrors ? "text-rose-400" : "text-gray-500"} />
                    <span>Errors Only</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Filter lines..."
                      value={logFilterQuery}
                      onChange={(e) => setLogFilterQuery(e.target.value)}
                      className="w-36 sm:w-44 pl-7 pr-2 py-1 rounded bg-[#0b101c] border border-[#1e2a3f] text-[11px] font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {formatLogLines(log.logs).length} lines
                  </span>
                  <button
                    onClick={() => copyToClipboard(getFormattedLogText())}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#111928] hover:bg-[#1a2538] border border-[#1e2a3f] hover:border-cyan-500/50 text-[11px] font-mono text-cyan-300 transition-colors cursor-pointer"
                    title="Copy formatted lines to clipboard"
                  >
                    {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copied ? "Copied" : "Copy Formatted"}</span>
                  </button>
                </div>
              </div>

              {/* Formatted Code Viewer */}
              <div className="rounded-lg bg-[#060a12] border border-[#1b2637] overflow-hidden">
                <div className="max-h-[500px] overflow-x-auto overflow-y-auto divide-y divide-[#101826] font-mono text-xs">
                  {formatLogLines(log.logs)
                    .filter((l) => (!onlyErrors || l.isError) && (!logFilterQuery || l.content.toLowerCase().includes(logFilterQuery.toLowerCase())))
                    .map((item) => (
                      <div
                        key={item.lineNum}
                        className={`flex items-start gap-3 px-3 py-1 hover:bg-[#0c1424] transition-colors ${
                          item.isError
                            ? "bg-rose-950/20 border-l-2 border-l-rose-500 text-rose-200"
                            : item.isWarning
                            ? "bg-amber-950/20 border-l-2 border-l-amber-500 text-amber-200"
                            : item.isStepHeader
                            ? "bg-cyan-950/20 text-cyan-300 font-semibold"
                            : item.isCommand
                            ? "text-emerald-400 font-medium"
                            : "text-gray-300"
                        }`}
                      >
                        {/* Line number */}
                        <span className="shrink-0 select-none text-[11px] font-mono text-gray-600 w-9 text-right pt-0.5">
                          {item.lineNum}
                        </span>

                        {/* Optional parsed timestamp */}
                        {item.timestamp && (
                          <span className="shrink-0 select-none text-[10px] text-gray-500 font-mono pt-0.5 hidden md:inline">
                            {item.timestamp.slice(11, 19)}
                          </span>
                        )}

                        {/* Line badge tag if special */}
                        {item.isError && (
                          <span className="shrink-0 px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 text-[10px] uppercase font-bold">
                            ERROR
                          </span>
                        )}
                        {item.isWarning && (
                          <span className="shrink-0 px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px] uppercase font-bold">
                            WARN
                          </span>
                        )}

                        {/* Content */}
                        <span className="break-all whitespace-pre-wrap leading-relaxed">
                          {item.content}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : (
            /* RAW UNPROCESSED LOG VIEW WITH EXACT BYTES & ANSI CODES */
            <div className="space-y-2">
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#070b13] border border-[#1b263b] text-xs font-mono text-gray-400">
                <span className="flex items-center gap-1.5 text-gray-300">
                  <Terminal size={13} className="text-[#a855f7]" />
                  Raw Standard Out / Terminal Output ({log.logs.length} bytes)
                </span>
                <span className="text-[10px] text-gray-500">Unfiltered ANSI stream</span>
              </div>
              <pre className="font-mono text-xs leading-relaxed p-4 rounded-lg bg-[#04070d] text-gray-400 border border-[#172033] overflow-x-auto max-h-[500px] select-all">
                {log.logs}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
