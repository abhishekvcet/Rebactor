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
}

export function LogCard({ log }: LogCardProps) {
  const [viewMode, setViewMode] = useState<"summary" | "clean" | "raw">("summary");
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

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

  const summary = log.parsed_summary;

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
          {viewMode === "summary" && summary ? (
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
            <div className="relative">
              <pre className="font-mono text-xs leading-relaxed p-4 rounded-lg bg-[#070b12] text-gray-300 border border-[#1b2537] overflow-x-auto max-h-[500px]">
                {viewMode === "clean" ? cleanLog(log.logs) : log.logs}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
