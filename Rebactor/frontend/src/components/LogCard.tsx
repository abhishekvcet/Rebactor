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

  const cleanLog = (text: string) => {
    return text
      .replace(/\u001b\[[0-9;]*[a-zA-Z]/g, "")
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <div className="flex items-center gap-2">
          {/* Quick On-Demand AI Analyze Button if not analyzed yet */}
          {!summary && (
            <button
              onClick={handleRunAiAnalysis}
              disabled={analyzing}
              title="Run AI Root Cause Diagnosis"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#ec4899] hover:from-[#4f46e5] hover:via-[#7c3aed] hover:to-[#db2777] text-white text-xs font-mono font-medium shadow-[0_0_15px_rgba(139,92,246,0.5)] transition-all cursor-pointer active:scale-95 disabled:opacity-60"
            >
              <Sparkles size={14} className={analyzing ? "animate-spin text-cyan-200" : "animate-pulse text-yellow-300"} />
              <span>{analyzing ? "Analyzing Log..." : "Analyze with AI"}</span>
            </button>
          )}

          <div className="flex items-center bg-[#172033] p-0.5 rounded-lg border border-[#24334d]">
            <button
              onClick={() => setViewMode("summary")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                viewMode === "summary"
                  ? "bg-[#00f5d4]/20 text-[#00f5d4] shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Sparkles size={13} />
              AI Diagnosis
              {summary && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
            </button>
            <button
              onClick={() => setViewMode("clean")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                viewMode === "clean"
                  ? "bg-[#00f5d4]/20 text-[#00f5d4] shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <FileCode size={13} />
              Formatted
            </button>
            <button
              onClick={() => setViewMode("raw")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                viewMode === "raw"
                  ? "bg-[#00f5d4]/20 text-[#00f5d4] shadow-sm"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Terminal size={13} />
              Raw Log
            </button>
          </div>

          <button
            onClick={() =>
              copyToClipboard(
                viewMode === "summary" && summary
                  ? JSON.stringify(summary, null, 2)
                  : cleanLog(log.logs)
              )
            }
            className="p-1.5 rounded-lg bg-[#172033] hover:bg-[#202c44] text-gray-400 hover:text-white border border-[#24334d] transition-colors"
            title="Copy to clipboard"
          >
            {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
          </button>

          {log.job_url && (
            <a
              href={log.job_url}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-[#172033] hover:bg-[#202c44] text-gray-400 hover:text-cyan-400 border border-[#24334d] transition-colors"
              title="Open job in GitHub"
            >
              <ExternalLink size={15} />
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
              <div className="py-8 px-6 rounded-xl bg-gradient-to-b from-[#0b101c] to-[#070b14] border border-[#1b263b] text-center flex flex-col items-center justify-center space-y-4 shadow-inner">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6366f1] to-[#a855f7] flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div className="max-w-md">
                  <h4 className="text-sm font-semibold text-white tracking-wide font-mono">
                    AI Diagnostic Engine Ready
                  </h4>
                  <p className="text-xs text-gray-400 font-sans mt-1 leading-relaxed">
                    To conserve LLM tokens and reduce API costs, logs are extracted on demand. Click below to analyze this failure using Groq/LangChain reasoning.
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
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#ec4899] hover:from-[#4f46e5] hover:via-[#7c3aed] hover:to-[#db2777] text-white text-xs font-mono font-medium shadow-[0_0_20px_rgba(139,92,246,0.5)] transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-60"
                >
                  <Sparkles size={15} className={analyzing ? "animate-spin text-cyan-200" : "text-yellow-300"} />
                  <span>{analyzing ? "Synthesizing AI Diagnosis..." : "Click to Run AI Diagnosis"}</span>
                </button>
              </div>
            )
          ) : (
            <div className="relative">
              <pre className="font-mono text-xs leading-relaxed p-4 rounded-lg bg-[#070b12] text-gray-300 border border-[#1b2637] overflow-x-auto max-h-[500px]">
                {viewMode === "clean" ? cleanLog(log.logs) : log.logs}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
