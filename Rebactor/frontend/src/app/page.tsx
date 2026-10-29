"use client";

import React, { useState, useEffect } from "react";
import { RepoItem, LogsResponse, HealthResponse } from "@/types";
import { fetchHealth, fetchRepositories, fetchFailedLogs } from "@/lib/api";
import { LogCard } from "@/components/LogCard";
import {
  Terminal,
  RefreshCw,
  Search,
  Key,
  FolderGit2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Zap,
} from "lucide-react";

export default function Home() {
  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [selectedRepoStr, setSelectedRepoStr] = useState<string>("");
  const [owner, setOwner] = useState<string>("");
  const [repoName, setRepoName] = useState<string>("");
  const [limit, setLimit] = useState<number>(5);
  const [customToken, setCustomToken] = useState<string>("");
  const [showTokenInput, setShowTokenInput] = useState<boolean>(false);

  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [loadingLogs, setLoadingLogs] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logsData, setLogsData] = useState<LogsResponse | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthResponse | null>(null);

  // Initial load
  useEffect(() => {
    checkHealth();
    loadRepos();
  }, []);

  const checkHealth = async () => {
    try {
      const data = await fetchHealth(customToken);
      setHealthStatus(data);
    } catch {
      setHealthStatus(null);
    }
  };

  const loadRepos = async (tokenToUse?: string) => {
    setLoadingRepos(true);
    setErrorMsg(null);
    try {
      const data = await fetchRepositories(tokenToUse || customToken);
      setRepos(data.repos || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load repositories";
      setErrorMsg(message);
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleRepoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedRepoStr(val);
    if (!val) return;

    try {
      const parsed = JSON.parse(val);
      setOwner(parsed.owner);
      setRepoName(parsed.name);
      // Trigger fetch automatically
      fetchLogsForRepo(parsed.owner, parsed.name, limit);
    } catch {
      // ignore
    }
  };

  const fetchLogsForRepo = async (targetOwner: string, targetRepo: string, targetLimit: number) => {
    if (!targetOwner || !targetRepo) {
      setErrorMsg("Please specify both repository owner and name.");
      return;
    }

    setLoadingLogs(true);
    setErrorMsg(null);
    setLogsData(null);

    try {
      const result = await fetchFailedLogs(targetOwner, targetRepo, targetLimit, customToken);
      setLogsData(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to retrieve logs";
      setErrorMsg(message);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogsForRepo(owner, repoName, limit);
  };

  const handleSaveToken = () => {
    checkHealth();
    loadRepos(customToken);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-full lg:w-[420px] shrink-0 bg-[#0a0e17] border-r border-[#1a2333] flex flex-col justify-between p-6 overflow-y-auto">
        <div className="flex flex-col gap-6">
          {/* Brand header */}
          <header className="border-b border-[#1a2333] pb-5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-[#00f5d4] mb-3">
              <Terminal size={14} />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider">
                DevOps Diagnostics 2.0
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
              GitHub Actions Detective
            </h1>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Automated failure root cause analyzer & real-time log inspector.
            </p>
          </header>

          {/* Backend Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-[#111827] border border-[#1e293b] text-xs font-mono">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  healthStatus?.status === "healthy" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                }`}
              />
              <span className="text-gray-300">FastAPI Backend</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
              {healthStatus?.has_token_configured ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck size={13} /> Token Configured
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <Key size={13} /> Needs Token
                </span>
              )}
            </div>
          </div>

          {/* Optional Token Toggle */}
          <div className="border border-[#1f293d] rounded-lg p-3 bg-[#0d1424]">
            <button
              type="button"
              onClick={() => setShowTokenInput(!showTokenInput)}
              className="flex items-center justify-between w-full text-xs font-mono text-cyan-400 hover:text-cyan-300"
            >
              <span className="flex items-center gap-1.5">
                <Key size={13} />
                Override GitHub Token
              </span>
              <span>{showTokenInput ? "▲" : "▼"}</span>
            </button>
            {showTokenInput && (
              <div className="mt-3 space-y-2">
                <input
                  type="password"
                  placeholder="ghp_xxxx or github_pat_xxxx"
                  value={customToken}
                  onChange={(e) => setCustomToken(e.target.value)}
                  className="w-full bg-[#080d1a] border border-[#202c42] rounded px-3 py-1.5 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#00f5d4]"
                />
                <button
                  type="button"
                  onClick={handleSaveToken}
                  className="w-full bg-[#16233a] hover:bg-[#203152] text-xs font-mono text-white py-1.5 rounded transition-colors"
                >
                  Apply & Reload Repos
                </button>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono leading-relaxed flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
            {/* Repository Select */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-gray-300">
                <span className="flex items-center gap-1.5">
                  <FolderGit2 size={14} className="text-[#00f5d4]" />
                  Your Repositories
                </span>
                <button
                  type="button"
                  onClick={() => loadRepos()}
                  disabled={loadingRepos}
                  className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                  title="Refresh Repositories"
                >
                  <RefreshCw size={11} className={loadingRepos ? "animate-spin text-[#00f5d4]" : ""} />
                  Refresh
                </button>
              </div>

              <select
                value={selectedRepoStr}
                onChange={handleRepoChange}
                disabled={loadingRepos}
                className="w-full bg-[#111827] border border-[#1f293d] rounded-lg px-3 py-2.5 text-xs font-mono text-gray-200 focus:outline-none focus:border-[#00f5d4] transition-colors cursor-pointer"
              >
                <option value="">
                  {loadingRepos ? "Loading accessible repos..." : "-- Select a Repository --"}
                </option>
                {repos.map((r) => (
                  <option
                    key={r.id || r.full_name}
                    value={JSON.stringify({ owner: r.owner, name: r.name })}
                  >
                    {r.full_name} {r.private ? "🔒" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Manual Owner / Repo fallback */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-gray-400">Owner</label>
                <input
                  type="text"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  placeholder="e.g. torvalds"
                  required
                  className="bg-[#111827] border border-[#1f293d] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00f5d4]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-mono text-gray-400">Repository</label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="e.g. linux"
                  required
                  className="bg-[#111827] border border-[#1f293d] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00f5d4]"
                />
              </div>
            </div>

            {/* Limit */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-xs font-mono text-gray-400">
                <span>Runs Limit</span>
                <span className="text-[11px] text-gray-500">Max 20</span>
              </div>
              <input
                type="number"
                min={1}
                max={20}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-[#111827] border border-[#1f293d] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#00f5d4]"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loadingLogs || !owner || !repoName}
              className="mt-2 w-full bg-[#00f5d4] hover:bg-[#26fedc] text-[#00382f] font-mono font-semibold text-xs py-3 px-4 rounded-lg transition-all duration-150 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,245,212,0.25)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loadingLogs ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Diagnosing Failures...</span>
                </>
              ) : (
                <>
                  <Zap size={15} />
                  <span>Scan Failed Workflows</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-[#1a2333] flex items-center justify-between text-[11px] font-mono text-gray-500">
          <span>Next.js + FastAPI</span>
          <span className="text-[#00f5d4]">v2.0-refactored</span>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 h-screen flex flex-col overflow-hidden bg-[#070b12]">
        {/* Top bar */}
        <div className="h-16 shrink-0 px-6 border-b border-[#1a2333] flex items-center justify-between bg-[#0a0e17]/80 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
              <FolderGit2 size={16} className="text-cyan-400" />
              <span className="text-white font-medium">
                {owner && repoName ? `${owner} / ${repoName}` : "No Target Selected"}
              </span>
            </div>

            {logsData && (
              <>
                <span className="text-gray-600 text-xs">/</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${
                    logsData.status === "failing"
                      ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      logsData.status === "failing" ? "bg-rose-400 animate-pulse" : "bg-emerald-400"
                    }`}
                  />
                  {logsData.status === "failing"
                    ? `${logsData.failure_count} Failed Run(s)`
                    : "All Green"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Log stream / results */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loadingLogs ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 font-mono text-sm">
              <RefreshCw size={28} className="animate-spin text-[#00f5d4]" />
              <p>Analyzing GitHub Actions runs and extracting failure traces...</p>
            </div>
          ) : logsData ? (
            logsData.extracted_logs && logsData.extracted_logs.length > 0 ? (
              <div className="space-y-5 max-w-6xl mx-auto">
                {logsData.extracted_logs.map((log, index) => (
                  <LogCard key={`${log.run_id}-${log.job_id}-${index}`} log={log} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center p-8 rounded-2xl bg-[#0c121e] border border-[#1e293b]">
                <CheckCircle2 size={42} className="text-emerald-400 mb-3" />
                <h3 className="text-lg font-semibold text-white mb-1">
                  Clean Pipeline!
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed font-mono">
                  {logsData.message || "All recent workflow runs are passing successfully. No failed logs detected."}
                </p>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center p-8 rounded-2xl border border-dashed border-[#1e293b] text-gray-500">
              <Search size={36} className="text-gray-600 mb-3" />
              <h3 className="text-sm font-medium text-gray-300 mb-1">
                Awaiting Target Selection
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed font-mono">
                Select a repository from the left panel or input owner/name to inspect failed CI runs.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
