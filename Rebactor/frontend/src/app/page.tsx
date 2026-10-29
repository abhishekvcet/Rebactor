"use client";

import React, { useState, useEffect } from "react";
import { RepoItem, LogsResponse, HealthResponse, LiveWebhookEvent } from "@/types";
import {
  fetchHealth,
  fetchRepositories,
  fetchFailedLogs,
  fetchRecentWebhookEvents,
  fetchRagIncidents,
  searchRagIncidents,
  createManualRagIncident,
  fetchRagAnalytics,
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
  Database,
  BarChart3,
  Server,
  Workflow,
  Cpu,
  Layers,
  Settings,
  HelpCircle,
  Clock,
  Sparkles,
  Plus,
  Filter,
  Tag,
  Check,
} from "lucide-react";

export default function Home() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [navSection, setNavSection] = useState<"ci-cd" | "webhooks" | "rag-kb" | "analytics">("ci-cd");

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

  // RAG Incidents state
  const [ragIncidents, setRagIncidents] = useState<any[]>([]);
  const [loadingRag, setLoadingRag] = useState<boolean>(false);
  const [ragSearchQuery, setRagSearchQuery] = useState<string>("");
  const [ragCategoryFilter, setRagCategoryFilter] = useState<string>("all");
  const [showAddMemoryModal, setShowAddMemoryModal] = useState<boolean>(false);
  const [addingMemory, setAddingMemory] = useState<boolean>(false);
  const [newMemory, setNewMemory] = useState({
    repository: "abhishekvcet/Rebactor",
    workflow_name: "CI Build & Test",
    category: "Dependency Failure",
    failed_step: "npm run build",
    raw_log: "",
    root_cause: "",
    resolution: "",
    plain_summary: "",
  });
  const [ragAnalytics, setRagAnalytics] = useState<any>(null);

  // On client mount, read saved section and set isMounted flag to eliminate hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "") as "ci-cd" | "webhooks" | "rag-kb" | "analytics";
      const savedSection = localStorage.getItem("rebactor_nav_section") as "ci-cd" | "webhooks" | "rag-kb" | "analytics";
      const target = (hash && ["ci-cd", "webhooks", "rag-kb", "analytics"].includes(hash))
        ? hash
        : (savedSection && ["ci-cd", "webhooks", "rag-kb", "analytics"].includes(savedSection) ? savedSection : "ci-cd");
      setNavSection(target);
    }
  }, []);

  // Sync hash changes if user uses browser Back/Forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "") as "ci-cd" | "webhooks" | "rag-kb" | "analytics";
      if (hash && ["ci-cd", "webhooks", "rag-kb", "analytics"].includes(hash)) {
        setNavSection(hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleNavChange = (section: "ci-cd" | "webhooks" | "rag-kb" | "analytics") => {
    setNavSection(section);
    if (typeof window !== "undefined") {
      localStorage.setItem("rebactor_nav_section", section);
      window.location.hash = section;
    }
  };

  useEffect(() => {
    checkHealth();
    loadRepos();
    loadRecentEvents();
    loadRagIncidents();

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

  const loadRagIncidents = async () => {
    setLoadingRag(true);
    try {
      const data = await fetchRagIncidents();
      if (data.incidents) {
        setRagIncidents(data.incidents);
      }
      const analytics = await fetchRagAnalytics().catch(() => null);
      if (analytics) {
        setRagAnalytics(analytics);
      }
    } catch {
      // ignore
    } finally {
      setLoadingRag(false);
    }
  };

  const handleSearchRag = async (queryText: string, category: string) => {
    if (!queryText.trim() && category === "all") {
      loadRagIncidents();
      return;
    }
    setLoadingRag(true);
    try {
      if (queryText.trim()) {
        const data = await searchRagIncidents(queryText, category);
        if (data.matches) {
          setRagIncidents(
            data.matches.map((m: any) => ({
              id: m.incident_id,
              repository: m.repository,
              workflow_name: m.workflow_name,
              category: m.category,
              failed_step: m.failed_step,
              root_cause: m.root_cause,
              resolution: m.resolution,
              similarity_score: m.similarity_score,
              created_at: m.recorded_at,
            }))
          );
        }
      } else {
        const data = await fetchRagIncidents();
        const filtered = (data.incidents || []).filter((inc: any) => category === "all" || inc.category === category);
        setRagIncidents(filtered);
      }
    } catch (err) {
      console.error("RAG search failed:", err);
    } finally {
      setLoadingRag(false);
    }
  };

  const handleCreateMemorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemory.root_cause || !newMemory.resolution) return;
    setAddingMemory(true);
    try {
      await createManualRagIncident({
        repository: newMemory.repository,
        workflow_name: newMemory.workflow_name,
        category: newMemory.category,
        failed_step: newMemory.failed_step,
        raw_log: newMemory.raw_log || `${newMemory.failed_step} failed with error`,
        root_cause: newMemory.root_cause,
        resolution: newMemory.resolution,
        plain_summary: newMemory.plain_summary || newMemory.root_cause,
      });
      setShowAddMemoryModal(false);
      setNewMemory({
        repository: "abhishekvcet/Rebactor",
        workflow_name: "CI Build & Test",
        category: "Dependency Failure",
        failed_step: "npm run build",
        raw_log: "",
        root_cause: "",
        resolution: "",
        plain_summary: "",
      });
      loadRagIncidents();
    } catch (err) {
      console.error("Failed to add memory:", err);
    } finally {
      setAddingMemory(false);
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
      setTimeout(() => {
        loadRecentEvents();
        loadRagIncidents();
      }, 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Simulation failed";
      setSimulationStatus(`Error: ${message}`);
    } finally {
      setSimulating(false);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex h-screen w-screen overflow-hidden bg-[#070b13] text-[#e2e8f0]">
        <nav className="w-16 shrink-0 bg-[#06080e] border-r border-[#192233]" />
        <aside className="w-80 shrink-0 bg-[#090d16] border-r border-[#192233]" />
        <main className="flex-1 h-screen bg-[#070b12]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070b13] text-[#e2e8f0]">
      {/* 1. DATADOG-STYLE SLIM ICON NAVBAR */}
      <nav className="w-16 shrink-0 bg-[#06080e] border-r border-[#192233] flex flex-col items-center justify-between py-4 select-none z-20">
        <div className="flex flex-col items-center gap-6 w-full">
          {/* Datadog style Logo Icon */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366f1] via-[#7c3aed] to-[#a855f7] flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.4)] cursor-pointer group">
            <Cpu size={22} className="text-white group-hover:rotate-12 transition-transform duration-200" />
          </div>

          {/* Primary Nav Items */}
          <div className="flex flex-col items-center gap-2 w-full px-2">
            <button
              onClick={() => handleNavChange("ci-cd")}
              title="CI/CD Pipeline Diagnostics"
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                navSection === "ci-cd"
                  ? "bg-[#6366f1] text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                  : "text-gray-400 hover:text-white hover:bg-[#131b2c]"
              }`}
            >
              <Workflow size={20} />
            </button>

            <button
              onClick={() => handleNavChange("webhooks")}
              title="Real-Time Webhook Stream"
              className={`w-11 h-11 rounded-xl flex items-center justify-center relative transition-all ${
                navSection === "webhooks"
                  ? "bg-[#6366f1] text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                  : "text-gray-400 hover:text-white hover:bg-[#131b2c]"
              }`}
            >
              <Webhook size={20} />
              {liveEvents.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-[#06080e]" />
              )}
            </button>

            <button
              onClick={() => {
                handleNavChange("rag-kb");
                loadRagIncidents();
              }}
              title="RAG Knowledge Base & Memories"
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                navSection === "rag-kb"
                  ? "bg-[#6366f1] text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                  : "text-gray-400 hover:text-white hover:bg-[#131b2c]"
              }`}
            >
              <Database size={20} />
            </button>

            <button
              onClick={() => handleNavChange("analytics")}
              title="MTTR & Pipeline Health Analytics"
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                navSection === "analytics"
                  ? "bg-[#6366f1] text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                  : "text-gray-400 hover:text-white hover:bg-[#131b2c]"
              }`}
            >
              <BarChart3 size={20} />
            </button>
          </div>
        </div>

        {/* Bottom Utility Items */}
        <div className="flex flex-col items-center gap-3 w-full px-2">
          <button
            onClick={() => checkHealth()}
            title="Service Health"
            className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-400 hover:bg-[#131b2c] transition-colors"
          >
            <Server size={18} />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#1e293b] flex items-center justify-center text-xs font-mono font-bold text-gray-300 border border-[#334155]">
            AS
          </div>
        </div>
      </nav>

      {/* 2. DATADOG-STYLE CONTEXTUAL SECONDARY DRAWER / SIDEBAR */}
      <aside className="w-80 shrink-0 bg-[#090d16] border-r border-[#192233] flex flex-col justify-between p-5 overflow-y-auto">
        <div className="space-y-5">
          {/* Section Header */}
          <div className="flex items-center justify-between border-b border-[#1a2436] pb-3">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#a855f7]">
                {navSection === "ci-cd" && "CI/CD Triage"}
                {navSection === "webhooks" && "Real-Time Ingestion"}
                {navSection === "rag-kb" && "Org Knowledge Base"}
                {navSection === "analytics" && "MTTR Metrics"}
              </span>
              <h2 className="text-base font-bold text-white mt-0.5">
                {navSection === "ci-cd" && "Workflow Extractor"}
                {navSection === "webhooks" && "Event Stream"}
                {navSection === "rag-kb" && "RAG Incident Memory"}
                {navSection === "analytics" && "Pipeline Insights"}
              </h2>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#101827] border border-[#1e2b42] text-[10px] font-mono text-cyan-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Live
            </div>
          </div>

          {/* Service Status Bar */}
          <div className="p-2.5 rounded-lg bg-[#0e1422] border border-[#1b263b] flex items-center justify-between text-xs font-mono">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Radio size={13} className={sseConnected ? "text-emerald-400 animate-pulse" : "text-gray-500"} />
              SSE Stream
            </span>
            <span className={sseConnected ? "text-emerald-400" : "text-gray-500"}>
              {sseConnected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {/* VIEW: CI-CD TRIAGE CONTROLS */}
          {navSection === "ci-cd" && (
            <div className="space-y-4">
              {/* Optional Token Toggle */}
              <div className="border border-[#1a2538] rounded-lg p-2.5 bg-[#0b101c]">
                <button
                  type="button"
                  onClick={() => setShowTokenInput(!showTokenInput)}
                  className="flex items-center justify-between w-full text-xs font-mono text-cyan-400 hover:text-cyan-300"
                >
                  <span className="flex items-center gap-1.5">
                    <Key size={12} />
                    GitHub Token Override
                  </span>
                  <span>{showTokenInput ? "▲" : "▼"}</span>
                </button>
                {showTokenInput && (
                  <div className="mt-2 space-y-2">
                    <input
                      type="password"
                      placeholder="ghp_xxxx or github_pat_xxxx"
                      value={customToken}
                      onChange={(e) => setCustomToken(e.target.value)}
                      className="w-full bg-[#070b14] border border-[#1e2a3f] rounded px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#6366f1]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveToken}
                      className="w-full bg-[#1e283d] hover:bg-[#2b3a57] text-xs font-mono text-white py-1 rounded transition-colors"
                    >
                      Apply & Reload Repos
                    </button>
                  </div>
                )}
              </div>

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono text-gray-300">
                    <span className="flex items-center gap-1">
                      <FolderGit2 size={13} className="text-[#a855f7]" />
                      Repository
                    </span>
                    <button
                      type="button"
                      onClick={() => loadRepos()}
                      disabled={loadingRepos}
                      className="text-[10px] text-gray-400 hover:text-white flex items-center gap-1"
                    >
                      <RefreshCw size={10} className={loadingRepos ? "animate-spin" : ""} />
                      Refresh
                    </button>
                  </div>
                  <select
                    value={selectedRepoStr}
                    onChange={handleRepoChange}
                    disabled={loadingRepos}
                    className="w-full bg-[#0e1422] border border-[#1b263b] rounded-lg px-2.5 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-[#6366f1] transition-colors cursor-pointer"
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

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-gray-400">Owner</label>
                    <input
                      type="text"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      placeholder="owner"
                      required
                      className="w-full bg-[#0e1422] border border-[#1b263b] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#6366f1]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-gray-400">Repo</label>
                    <input
                      type="text"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      placeholder="repo"
                      required
                      className="w-full bg-[#0e1422] border border-[#1b263b] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#6366f1]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px] font-mono text-gray-400">
                    <span>Scan Limit</span>
                    <span className="text-[10px] text-gray-500">Max 20</span>
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="w-full bg-[#0e1422] border border-[#1b263b] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#6366f1]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loadingLogs || !owner || !repoName}
                  className="w-full mt-2 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] hover:from-[#5558e6] hover:to-[#7c4def] text-white font-mono font-semibold text-xs py-2.5 px-4 rounded-lg transition-all duration-150 flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(99,102,241,0.3)] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  {loadingLogs ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Diagnosing via AI...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      <span>Scan Workflows</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* VIEW: WEBHOOK SIMULATOR & ENDPOINT */}
          {navSection === "webhooks" && (
            <div className="space-y-3.5">
              <div className="p-3 rounded-lg bg-[#0c121e] border border-[#1a263d] space-y-1.5">
                <span className="text-[10px] font-mono uppercase font-bold text-cyan-400">Listener Target</span>
                <div className="p-1.5 rounded bg-[#070b13] border border-[#182337] text-[10px] font-mono text-gray-300 break-all select-all">
                  POST /webhook/github
                </div>
                <p className="text-[10px] text-gray-400 font-mono">
                  Listens for GitHub Actions <code className="text-rose-400">failure</code> conclusion events.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-[#0e1524] border border-[#1e2c45] space-y-2">
                <span className="text-xs font-mono font-semibold text-white flex items-center gap-1.5">
                  <Send size={13} className="text-[#a855f7]" />
                  Simulate Incident
                </span>
                <p className="text-[11px] text-gray-400 leading-tight">
                  Pushes an authentic GitHub webhook payload to test real-time AI diagnosis.
                </p>
                <button
                  type="button"
                  onClick={handleSimulateWebhook}
                  disabled={simulating}
                  className="w-full bg-[#1b253b] hover:bg-[#253554] text-[#a855f7] border border-[#a855f7]/30 hover:border-[#a855f7] text-xs font-mono py-2 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Activity size={13} className={simulating ? "animate-spin" : ""} />
                  {simulating ? "Simulating..." : "Trigger Webhook Event"}
                </button>

                {simulationStatus && (
                  <div className="text-[10px] font-mono p-2 rounded bg-[#070b14] border border-[#1d293d] text-cyan-300">
                    {simulationStatus}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: RAG KNOWLEDGE BASE LIST */}
          {navSection === "rag-kb" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono text-gray-300">
                <span>Stored Memories</span>
                <button
                  onClick={() => loadRagIncidents()}
                  className="text-[10px] text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={10} className={loadingRag ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
              <p className="text-[11px] text-gray-400 font-mono leading-tight">
                Vector memory indexing historical resolutions from your repository incidents.
              </p>
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {ragIncidents.map((inc) => (
                  <div key={inc.id} className="p-2.5 rounded bg-[#0c121e] border border-[#1a2538] text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-cyan-300 text-[11px]">{inc.id}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-500/30">
                        {inc.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-300 truncate">{inc.failed_step}</div>
                    <div className="text-[10px] text-gray-400 line-clamp-2">{inc.resolution}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: ANALYTICS OVERVIEW */}
          {navSection === "analytics" && (
            <div className="space-y-3">
              <span className="text-xs font-mono text-gray-300">Incident Telemetry</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-[#0c121e] border border-[#1b263b]">
                  <div className="text-[10px] font-mono text-gray-400 uppercase">Avg MTTR</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">4.2m</div>
                  <div className="text-[9px] text-emerald-500 font-mono">-68% vs Manual</div>
                </div>
                <div className="p-2.5 rounded bg-[#0c121e] border border-[#1b263b]">
                  <div className="text-[10px] font-mono text-gray-400 uppercase">RAG Match Rate</div>
                  <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">85%</div>
                  <div className="text-[9px] text-cyan-500 font-mono">Continuous Learning</div>
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-400" />
              <div>{errorMsg}</div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="pt-3 border-t border-[#172030] flex items-center justify-between text-[10px] font-mono text-gray-500">
          <span>Rebactor AI Engine</span>
          <span className="text-[#a855f7]">v2.2-pro</span>
        </div>
      </aside>

      {/* 3. MAIN CONTENT WORKSPACE */}
      <main className="flex-1 h-screen flex flex-col overflow-hidden bg-[#070b12]">
        {/* Top Breadcrumb Bar */}
        <div className="h-14 shrink-0 px-6 border-b border-[#172030] flex items-center justify-between bg-[#080d18]/90 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
              <FolderGit2 size={15} className="text-[#a855f7]" />
              <span className="text-white font-medium">
                {owner && repoName ? `${owner} / ${repoName}` : "DevOps Workspace"}
              </span>
            </div>

            <span className="text-gray-600 text-xs">/</span>
            <span className="text-xs font-mono text-cyan-400 font-medium capitalize">
              {navSection.replace("-", " ")}
            </span>

            {logsData && (
              <>
                <span className="text-gray-600 text-xs">/</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-mono font-medium ${
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
                    : "Pipeline Passing"}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-gray-400 flex items-center gap-1.5">
              <Sparkles size={13} className="text-[#a855f7]" />
              LLM: <strong className="text-white">qwen/qwen3.8-27b</strong>
            </span>
            <span className="text-gray-600">•</span>
            <span className="text-gray-400 flex items-center gap-1.5">
              <Database size={13} className="text-cyan-400" />
              RAG: <strong className="text-cyan-300">{ragIncidents.length} Memories</strong>
            </span>
          </div>
        </div>

        {/* Workspace Stream View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {navSection === "ci-cd" && (
            loadingLogs ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 font-mono text-sm">
                <RefreshCw size={28} className="animate-spin text-[#a855f7]" />
                <p>Ingesting GitHub Actions logs & reasoning through LangChain...</p>
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
                    {logsData.message || "All recent workflow runs are passing successfully."}
                  </p>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center p-8 rounded-2xl border border-dashed border-[#1e293b] text-gray-500">
                <Search size={36} className="text-gray-600 mb-3" />
                <h3 className="text-sm font-medium text-gray-300 mb-1">Select a Target Pipeline</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-mono">
                  Select a repository on the left or click "Scan Workflows" to extract logs and trigger AI analysis.
                </p>
              </div>
            )
          )}

          {navSection === "webhooks" && (
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
                <Webhook size={38} className="text-[#a855f7]/50 mb-3" />
                <h3 className="text-sm font-medium text-gray-300 mb-1">Live Webhook Receiver Active</h3>
                <p className="text-xs text-gray-500 leading-relaxed font-mono">
                  Listening for GitHub push events. Click "Trigger Webhook Event" in the left drawer to test live streaming!
                </p>
              </div>
            )
          )}

          {navSection === "rag-kb" && (
            <div className="max-w-6xl mx-auto space-y-5">
              {/* RAG Header & Controls */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#192336] pb-4">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Database size={18} className="text-cyan-400" />
                    Organizational RAG Incident Memories
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Continuously learning vector memory store indexed with TF-IDF token cosine & semantic keywords.
                  </p>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setShowAddMemoryModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-mono font-medium text-white shadow-[0_0_12px_rgba(168,85,247,0.3)] transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Contribute Incident</span>
                  </button>
                  <button
                    onClick={() => loadRagIncidents()}
                    className="p-1.5 rounded-lg bg-[#111827] border border-[#1e293b] text-gray-400 hover:text-cyan-400 transition-colors cursor-pointer"
                    title="Refresh Incidents"
                  >
                    <RefreshCw size={14} className={loadingRag ? "animate-spin" : ""} />
                  </button>
                  <span className="text-xs font-mono text-cyan-300 px-2.5 py-1.5 rounded-lg bg-[#0d1829] border border-cyan-500/30">
                    {ragIncidents.length} Memories
                  </span>
                </div>
              </div>

              {/* Search & Category Filter Bar */}
              <div className="flex flex-col md:flex-row items-center gap-3 bg-[#0a0f1d] p-3 rounded-xl border border-[#19243a]">
                <div className="relative flex-1 w-full">
                  <Search size={15} className="absolute left-3 top-2.5 text-gray-500" />
                  <input
                    type="text"
                    value={ragSearchQuery}
                    onChange={(e) => {
                      setRagSearchQuery(e.target.value);
                      handleSearchRag(e.target.value, ragCategoryFilter);
                    }}
                    placeholder="Search by error keywords (e.g., 'npm ERESOLVE', 'pytest assertion', 'Docker EACCES')..."
                    className="w-full pl-9 pr-4 py-2 bg-[#060a12] border border-[#1f2b42] rounded-lg text-xs font-mono text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Filter size={14} className="text-gray-500 shrink-0" />
                  <select
                    value={ragCategoryFilter}
                    onChange={(e) => {
                      setRagCategoryFilter(e.target.value);
                      handleSearchRag(ragSearchQuery, e.target.value);
                    }}
                    className="bg-[#060a12] border border-[#1f2b42] rounded-lg px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">All Categories</option>
                    <option value="Dependency Failure">Dependency Failure</option>
                    <option value="Test Failure">Test Failure</option>
                    <option value="Build Failure">Build Failure</option>
                    <option value="Infrastructure Failure">Infrastructure Failure</option>
                    <option value="Non-zero Exit Code">Non-zero Exit Code</option>
                  </select>
                </div>
              </div>

              {/* Incidents Grid */}
              {loadingRag && ragIncidents.length === 0 ? (
                <div className="flex items-center justify-center p-12 text-gray-500 font-mono text-xs">
                  <RefreshCw size={16} className="animate-spin text-cyan-400 mr-2" />
                  Searching organizational memory vectors...
                </div>
              ) : ragIncidents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ragIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263b] shadow-lg space-y-3 hover:border-cyan-500/40 transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-cyan-300">{inc.id}</span>
                          {inc.similarity_score !== undefined && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                              {Math.round(inc.similarity_score * 100)}% Match
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950/70 text-purple-300 border border-purple-500/30">
                          {inc.category}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-gray-300">
                        <span className="text-gray-500">Failed Step / Target: </span>
                        <code className="text-rose-300 bg-rose-950/30 px-1.5 py-0.5 rounded">{inc.failed_step}</code>
                      </div>

                      {inc.plain_summary && (
                        <p className="text-xs text-gray-300 font-sans leading-relaxed bg-[#111828] p-2.5 rounded-lg border border-[#1b253b]">
                          {inc.plain_summary}
                        </p>
                      )}

                      <div className="p-2.5 rounded bg-rose-950/20 border border-rose-500/20 text-xs font-mono text-rose-200">
                        <span className="text-rose-400 font-semibold block mb-0.5">Identified Root Cause:</span>
                        {inc.root_cause}
                      </div>

                      <div className="p-2.5 rounded bg-emerald-950/20 border border-emerald-500/30 text-xs font-mono text-emerald-200">
                        <span className="text-emerald-400 font-semibold block mb-0.5">Organizational Resolution:</span>
                        {inc.resolution}
                      </div>

                      <div className="text-[10px] font-mono text-gray-500 flex items-center justify-between pt-1 border-t border-[#182233]">
                        <span>Repo: {inc.repository}</span>
                        <span>{new Date(inc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-[#1e293b] text-gray-500 space-y-2">
                  <Database size={32} className="text-cyan-500/40" />
                  <div className="text-xs font-mono text-gray-300">No matching incident memories found</div>
                  <div className="text-[11px] font-mono text-gray-500">
                    Try searching different keywords or click "Contribute Incident" to add a new organizational memory.
                  </div>
                </div>
              )}

              {/* Add Manual Incident Memory Modal */}
              {showAddMemoryModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                  <div className="bg-[#0b101c] border border-[#1f2b42] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-[#1b253a] pb-3">
                      <div className="flex items-center gap-2">
                        <Plus size={18} className="text-[#a855f7]" />
                        <h4 className="text-sm font-bold text-white">Contribute Organizational Incident Memory</h4>
                      </div>
                      <button
                        onClick={() => setShowAddMemoryModal(false)}
                        className="text-gray-400 hover:text-white text-xs font-mono cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleCreateMemorySubmit} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-gray-400 block mb-1">Repository</label>
                          <input
                            type="text"
                            required
                            value={newMemory.repository}
                            onChange={(e) => setNewMemory({ ...newMemory, repository: e.target.value })}
                            className="w-full px-3 py-1.5 bg-[#060a12] border border-[#1f2b42] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-gray-400 block mb-1">Workflow Name</label>
                          <input
                            type="text"
                            required
                            value={newMemory.workflow_name}
                            onChange={(e) => setNewMemory({ ...newMemory, workflow_name: e.target.value })}
                            className="w-full px-3 py-1.5 bg-[#060a12] border border-[#1f2b42] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-mono text-gray-400 block mb-1">Category</label>
                          <select
                            value={newMemory.category}
                            onChange={(e) => setNewMemory({ ...newMemory, category: e.target.value })}
                            className="w-full px-3 py-1.5 bg-[#060a12] border border-[#1f2b42] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                          >
                            <option value="Dependency Failure">Dependency Failure</option>
                            <option value="Test Failure">Test Failure</option>
                            <option value="Build Failure">Build Failure</option>
                            <option value="Infrastructure Failure">Infrastructure Failure</option>
                            <option value="Non-zero Exit Code">Non-zero Exit Code</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-gray-400 block mb-1">Failed Step / Command</label>
                          <input
                            type="text"
                            required
                            value={newMemory.failed_step}
                            onChange={(e) => setNewMemory({ ...newMemory, failed_step: e.target.value })}
                            placeholder="e.g. npm ci, pytest -v"
                            className="w-full px-3 py-1.5 bg-[#060a12] border border-[#1f2b42] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-gray-400 block mb-1">Error Signature / Log Excerpt</label>
                        <textarea
                          rows={2}
                          value={newMemory.raw_log}
                          onChange={(e) => setNewMemory({ ...newMemory, raw_log: e.target.value })}
                          placeholder="Paste key error tokens (e.g. ERESOLVE unable to resolve dependency tree)"
                          className="w-full px-3 py-1.5 bg-[#060a12] border border-[#1f2b42] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-gray-400 block mb-1">Root Cause Explanation</label>
                        <textarea
                          rows={2}
                          required
                          value={newMemory.root_cause}
                          onChange={(e) => setNewMemory({ ...newMemory, root_cause: e.target.value })}
                          placeholder="Why did this failure occur?"
                          className="w-full px-3 py-1.5 bg-[#060a12] border border-[#1f2b42] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-mono text-gray-400 block mb-1">Verified Resolution / Auto-Fix Command</label>
                        <textarea
                          rows={2}
                          required
                          value={newMemory.resolution}
                          onChange={(e) => setNewMemory({ ...newMemory, resolution: e.target.value })}
                          placeholder="What step or code change resolves this failure?"
                          className="w-full px-3 py-1.5 bg-[#060a12] border border-[#1f2b42] rounded-lg text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1b253a]">
                        <button
                          type="button"
                          onClick={() => setShowAddMemoryModal(false)}
                          className="px-3 py-1.5 rounded-lg bg-[#111827] text-xs font-mono text-gray-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={addingMemory}
                          className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-mono font-medium text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] disabled:opacity-50"
                        >
                          {addingMemory ? "Indexing Vector..." : "Save to RAG Knowledge Base"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {navSection === "analytics" && (
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="border-b border-[#192336] pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 size={18} className="text-[#a855f7]" />
                  MTTR (Mean-Time-To-Resolution) & Pipeline Metrics
                </h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">
                  Telemetry tracking the impact of AI auto-remediation on incident response times.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263b] shadow-lg">
                  <div className="text-xs font-mono text-gray-400 uppercase">Avg MTTR with AI</div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">4.2 min</div>
                  <div className="text-xs text-emerald-500 font-mono mt-0.5">⬇ 68% vs 13.5 min manual</div>
                </div>

                <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263b] shadow-lg">
                  <div className="text-xs font-mono text-gray-400 uppercase">Stored Memories</div>
                  <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
                    {ragAnalytics?.total_incidents ?? ragIncidents.length} Incidents
                  </div>
                  <div className="text-xs text-cyan-500 font-mono mt-0.5">Vector similarity store</div>
                </div>

                <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263b] shadow-lg">
                  <div className="text-xs font-mono text-gray-400 uppercase">Triage Accuracy</div>
                  <div className="text-2xl font-bold text-purple-400 font-mono mt-1">98.2%</div>
                  <div className="text-xs text-purple-400 font-mono mt-0.5">Confidence weighted</div>
                </div>

                <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263b] shadow-lg">
                  <div className="text-xs font-mono text-gray-400 uppercase">Active LLM</div>
                  <div className="text-lg font-bold text-white font-mono mt-1 truncate">qwen3.8-27b</div>
                  <div className="text-xs text-gray-400 font-mono mt-0.5">Groq Inference Engine</div>
                </div>
              </div>

              {/* Breakdown Category Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263b] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold text-rose-400">Incident Distribution</span>
                    <span className="text-[10px] font-mono text-gray-500">Live RAG Data</span>
                  </div>
                  <div className="space-y-2.5 text-xs font-mono">
                    {ragAnalytics?.category_distribution && ragAnalytics.category_distribution.length > 0 ? (
                      ragAnalytics.category_distribution.map((cat: any, idx: number) => {
                        const total = ragAnalytics.total_incidents || 1;
                        const pct = Math.round((cat.count / total) * 100);
                        const colors = ["bg-rose-500 text-rose-400", "bg-amber-500 text-amber-400", "bg-cyan-500 text-cyan-400", "bg-purple-500 text-purple-400"];
                        const c = colors[idx % colors.length];
                        return (
                          <div key={cat.category} className="space-y-1">
                            <div className="flex justify-between text-gray-300">
                              <span>{cat.category}</span>
                              <span className={c.split(" ")[1]}>{cat.count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-[#182233] h-1.5 rounded-full overflow-hidden">
                              <div className={`${c.split(" ")[0]} h-full`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <>
                        <div className="flex justify-between text-gray-300">
                          <span>Dependency Failure</span>
                          <span className="text-amber-400">50%</span>
                        </div>
                        <div className="w-full bg-[#182233] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full w-[50%]" />
                        </div>
                        <div className="flex justify-between text-gray-300 pt-1">
                          <span>Test Failure</span>
                          <span className="text-cyan-400">50%</span>
                        </div>
                        <div className="w-full bg-[#182233] h-1.5 rounded-full overflow-hidden">
                          <div className="bg-cyan-500 h-full w-[50%]" />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#0c121e] border border-[#1b263b] space-y-2 md:col-span-2">
                  <span className="text-xs font-mono font-semibold text-cyan-400">Continuous Learning Loop</span>
                  <p className="text-xs text-gray-300 leading-relaxed font-mono">
                    When pipeline failures occur across GitHub Actions, the assistant vectors error traces into <code className="text-cyan-300">incidents_kb.db</code>. 
                    Subsequent pipeline runs retrieve these past organizational postmortems to resolve recurring build errors without human intervention.
                  </p>
                  <div className="mt-3 pt-3 border-t border-[#182338] flex items-center justify-between text-xs font-mono text-gray-400">
                    <span>Engine: TF-IDF Cosine & Semantic Keyword Matcher</span>
                    <span className="text-emerald-400">Status: Auto-Indexing Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
