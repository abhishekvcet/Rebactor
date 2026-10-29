"use client";

import React, { useState, useEffect } from "react";
import { RepoItem, LogsResponse, HealthResponse, LiveWebhookEvent } from "@/types";
import {
  fetchHealth,
  fetchRepositories,
  fetchFailedLogs,
  fetchRecentWebhookEvents,
  simulateWebhookFailure,
  createEventSource,
} from "@/lib/api";
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
  Radio,
  Webhook,
  Activity,
  Send,
  Sparkles,
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"on-demand" | "webhooks">("on-demand");
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

  // Webhook and SSE states
  const [sseConnected, setSseConnected] = useState<boolean>(false);
  const [liveEvents, setLiveEvents] = useState<LiveWebhookEvent[]>([]);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simulationStatus, setSimulationStatus] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    checkHealth();
    loadRepos();
    loadRecentEvents();

    // Setup Server-Sent Events (SSE) listener
    let es: EventSource | null = null;
    try {
      es = createEventSource();
      es.onopen = () => setSseConnected(true);
      es.onerror = () => setSseConnected(false);

      es.addEventListener("failure_alert", (event) => {
        try {
          const newEvent: LiveWebhookEvent = JSON.parse(event.data);
          setLiveEvents((prev) => [newEvent, ...prev]);
        } catch (e) {
          console.error("Error parsing SSE event:", e);
        }
      });
    } catch (e) {
      console.error("SSE connection failed:", e);
    }

    return () => {
      if (es) es.close();
    };
  }, []);

  const checkHealth = async () => {
    try {
      const data = await fetchHealth(customToken);
      setHealthStatus(data);
    } catch {
      setHealthStatus(null);
    }
  };

  const loadRecentEvents = async () => {
    try {
      const data = await fetchRecentWebhookEvents();
      if (data.events) {
        setLiveEvents(data.events);
      }
    } catch {
      // ignore
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

  const handleSimulateWebhook = async () => {
    setSimulating(true);
    setSimulationStatus(null);
    try {
      const currentTarget = owner && repoName ? `${owner}/${repoName}` : "abhishekvcet/Rebactor";
      const result = await simulateWebhookFailure({
        repo: currentTarget,
        workflow: "CI Build & Test",
        branch: "main",
        conclusion: "failure",
      });
      setSimulationStatus(`Accepted: ${result.message}`);
      // Refresh recent events after 1s
      setTimeout(loadRecentEvents, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Simulation failed";
      setSimulationStatus(`Error: ${message}`);
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden">
      {/* SIDEBAR */}
      <aside className="w-full lg:w-[420px] shrink-0 bg-[#0a0e17] border-r border-[#1a2333] flex flex-col justify-between p-6 overflow-y-auto">
        <div className="flex flex-col gap-5">
          {/* Brand header */}
          <header className="border-b border-[#1a2333] pb-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#00f5d4]/10 border border-[#00f5d4]/30 text-[#00f5d4] mb-2.5">
              <Terminal size={14} />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider">
                DevOps Diagnostics 2.1
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white font-sans flex items-center gap-2">
              GitHub Actions Detective
            </h1>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              Real-time Webhook Ingestion & Automated Root-Cause Failure Advisor.
            </p>
          </header>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-[#111827] rounded-lg border border-[#1e293b]">
            <button
              onClick={() => setActiveTab("on-demand")}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-mono font-medium transition-all ${
                activeTab === "on-demand"
                  ? "bg-[#00f5d4] text-[#00382f] shadow-sm font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Zap size={13} />
              On-Demand (Pull)
            </button>
            <button
              onClick={() => setActiveTab("webhooks")}
              className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-xs font-mono font-medium transition-all ${
                activeTab === "webhooks"
                  ? "bg-[#00f5d4] text-[#00382f] shadow-sm font-semibold"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Webhook size={13} />
              Webhooks (Push)
              {liveEvents.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                  {liveEvents.length}
                </span>
              )}
            </button>
          </div>

          {/* System Status Indicators */}
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#111827] border border-[#1e293b] text-xs font-mono">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    healthStatus?.status === "healthy" ? "bg-emerald-400" : "bg-amber-400 animate-pulse"
                  }`}
                />
                <span className="text-gray-300">FastAPI Service</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
                {healthStatus?.has_token_configured ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck size={13} /> GitHub PAT Set
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Key size={13} /> Needs Token
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#111827] border border-[#1e293b] text-xs font-mono">
              <div className="flex items-center gap-2">
                <Radio
                  size={14}
                  className={sseConnected ? "text-emerald-400 animate-pulse" : "text-gray-500"}
                />
                <span className="text-gray-300">Live SSE Stream</span>
              </div>
              <span
                className={`text-[11px] px-2 py-0.5 rounded ${
                  sseConnected
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-gray-800 text-gray-500"
                }`}
              >
                {sseConnected ? "Connected" : "Reconnecting"}
              </span>
            </div>
          </div>

          {activeTab === "on-demand" ? (
            /* ON DEMAND PULL FORM */
            <div className="space-y-4">
              {/* Optional Token Toggle */}
              <div className="border border-[#1f293d] rounded-lg p-2.5 bg-[#0d1424]">
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
                  <div className="mt-2.5 space-y-2">
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

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-mono text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <FolderGit2 size={14} className="text-[#00f5d4]" />
                      Select Repository
                    </span>
                    <button
                      type="button"
                      onClick={() => loadRepos()}
                      disabled={loadingRepos}
                      className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <RefreshCw size={11} className={loadingRepos ? "animate-spin text-[#00f5d4]" : ""} />
                      Refresh
                    </button>
                  </div>

                  <select
                    value={selectedRepoStr}
                    onChange={handleRepoChange}
                    disabled={loadingRepos}
                    className="w-full bg-[#111827] border border-[#1f293d] rounded-lg px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-[#00f5d4] transition-colors cursor-pointer"
                  >
                    <option value="">
                      {loadingRepos ? "Loading accessible repos..." : "-- Choose Repository --"}
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

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-gray-400">Owner</label>
                    <input
                      type="text"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      placeholder="e.g. torvalds"
                      required
                      className="bg-[#111827] border border-[#1f293d] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#00f5d4]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-mono text-gray-400">Repo Name</label>
                    <input
                      type="text"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      placeholder="e.g. linux"
                      required
                      className="bg-[#111827] border border-[#1f293d] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#00f5d4]"
                    />
                  </div>
                </div>

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
                    className="bg-[#111827] border border-[#1f293d] rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#00f5d4]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingLogs || !owner || !repoName}
                  className="mt-1 w-full bg-[#00f5d4] hover:bg-[#26fedc] text-[#00382f] font-mono font-semibold text-xs py-2.5 px-4 rounded-lg transition-all duration-150 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,245,212,0.25)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
          ) : (
            /* WEBHOOKS PUSH INFO & SIMULATOR */
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-[#0e1626] border border-[#1d2b45] space-y-2">
                <div className="text-xs font-mono font-semibold text-cyan-300 flex items-center gap-1.5">
                  <Webhook size={14} />
                  Webhook Listener Active
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed font-mono">
                  GitHub pushes failures directly to:
                </p>
                <div className="p-2 rounded bg-[#070b13] border border-[#1a253a] text-[11px] font-mono text-[#00f5d4] select-all break-all">
                  POST http://localhost:8001/webhook/github
                </div>
                <div className="text-[10px] text-gray-500 font-mono">
                  Listens for: <code className="text-gray-300">workflow_run</code>,{" "}
                  <code className="text-gray-300">workflow_job</code> with conclusion:{" "}
                  <code className="text-rose-400 font-bold">failure</code>.
                </div>
              </div>

              {/* Simulation Box */}
              <div className="p-3.5 rounded-lg bg-[#141b2b] border border-[#23314d] space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-semibold text-white flex items-center gap-1.5">
                    <Send size={13} className="text-[#00f5d4]" />
                    Simulate CI/CD Failure
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">Dev Test</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Sends an authentic GitHub Actions failure webhook payload to test real-time diagnosis.
                </p>
                <button
                  type="button"
                  onClick={handleSimulateWebhook}
                  disabled={simulating}
                  className="w-full bg-[#1b2a47] hover:bg-[#253961] text-[#00f5d4] border border-[#00f5d4]/30 hover:border-[#00f5d4] text-xs font-mono font-medium py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Activity size={14} className={simulating ? "animate-spin" : ""} />
                  {simulating ? "Pushing Webhook..." : "Trigger Test Webhook Failure"}
                </button>

                {simulationStatus && (
                  <div className="text-[11px] font-mono p-2 rounded bg-[#0a0e17] border border-[#1f2c42] text-cyan-300 leading-tight">
                    {simulationStatus}
                  </div>
                )}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono leading-relaxed flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
              <div>{errorMsg}</div>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-[#1a2333] flex items-center justify-between text-[11px] font-mono text-gray-500">
          <span>Pillar 1: Push & Pull</span>
          <span className="text-[#00f5d4]">v2.1-stream</span>
        </div>
      </aside>

      {/* MAIN VIEW */}
      <main className="flex-1 h-screen flex flex-col overflow-hidden bg-[#070b12]">
        {/* Top header bar */}
        <div className="h-16 shrink-0 px-6 border-b border-[#1a2333] flex items-center justify-between bg-[#0a0e17]/80 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
              <FolderGit2 size={16} className="text-cyan-400" />
              <span className="text-white font-medium">
                {activeTab === "on-demand"
                  ? owner && repoName
                    ? `${owner} / ${repoName}`
                    : "No Repository Selected"
                  : "Live Ingested Webhook Stream"}
              </span>
            </div>

            {activeTab === "on-demand" && logsData && (
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

            {activeTab === "webhooks" && (
              <>
                <span className="text-gray-600 text-xs">/</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  {liveEvents.length} Captured Event(s)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Content stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === "on-demand" ? (
            /* ON DEMAND VIEW */
            loadingLogs ? (
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
                  <h3 className="text-lg font-semibold text-white mb-1">Clean Pipeline!</h3>
                  <p className="text-xs text-gray-400 leading-relaxed font-mono">
                    {logsData.message || "All recent workflow runs are passing successfully. No failed logs detected."}
                  </p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center p-8 rounded-2xl border border-dashed border-[#1e293b] text-gray-500">
                <Search size={36} className="text-gray-600 mb-3" />
                <h3 className="text-sm font-medium text-gray-300 mb-1">Awaiting Target Selection</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-mono">
                  Select a repository from the left panel or switch to Webhooks mode to view live automated failures.
                </p>
              </div>
            )
          ) : (
            /* WEBHOOK EVENTS STREAM VIEW */
            liveEvents.length > 0 ? (
              <div className="space-y-4 max-w-6xl mx-auto">
                {liveEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-xl border border-[#1e293b] bg-[#0c121e] p-5 shadow-xl transition-all hover:border-[#334155]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b263b] pb-3 mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-white font-mono">
                              {ev.repository}
                            </span>
                            <span className="text-gray-500 text-xs">/</span>
                            <span className="text-cyan-400 text-xs font-mono">{ev.run_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono mt-0.5">
                            <span>Run #{ev.run_id}</span>
                            <span>•</span>
                            <span>branch: {ev.branch || "main"}</span>
                            <span>•</span>
                            <span className="text-gray-500">by {ev.sender}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[11px] font-mono text-gray-500">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </div>
                    </div>

                    {/* Diagnosed Jobs within Webhook */}
                    {ev.diagnosed_jobs && ev.diagnosed_jobs.length > 0 ? (
                      <div className="space-y-3">
                        {ev.diagnosed_jobs.map((dj, idx) => (
                          <div
                            key={idx}
                            className="p-4 rounded-lg bg-[#111827] border border-[#1f293d] space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs font-medium text-rose-300">
                                Job: {dj.job_name}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                {dj.diagnostic.category}
                              </span>
                            </div>

                            <div className="p-3 rounded bg-rose-950/20 border border-rose-500/30 text-xs font-mono text-rose-200">
                              <span className="text-rose-400 font-semibold block mb-0.5">
                                Root Cause:
                              </span>
                              {dj.diagnostic.root_cause}
                            </div>

                            <div className="p-3 rounded bg-emerald-950/20 border border-emerald-500/30 text-xs font-mono text-emerald-200">
                              <span className="text-emerald-400 font-semibold block mb-0.5">
                                Auto-Fix Action:
                              </span>
                              {dj.diagnostic.auto_fix}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-xs font-mono text-gray-400 bg-[#111827] rounded-lg">
                        Webhook event accepted and processed. Workflow concluded in failure.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center p-8 rounded-2xl border border-dashed border-[#1e293b] text-gray-500">
                <Webhook size={38} className="text-cyan-400/50 mb-3" />
                <h3 className="text-sm font-medium text-gray-300 mb-1">
                  Listening for GitHub Webhooks
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed font-mono">
                  No webhook failure events captured yet. You can click{" "}
                  <strong className="text-cyan-400">"Trigger Test Webhook Failure"</strong> in the
                  sidebar to simulate a live failure event!
                </p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
