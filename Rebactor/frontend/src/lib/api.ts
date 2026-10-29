const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export async function fetchHealth(customToken?: string) {
  const headers: Record<string, string> = {};
  if (customToken) headers["X-GitHub-Token"] = customToken;
  const res = await fetch(`${API_URL}/health`, { headers });
  if (!res.ok) throw new Error("Backend server is unreachable");
  return res.json();
}

export async function fetchRepositories(customToken?: string) {
  const headers: Record<string, string> = {};
  if (customToken) headers["X-GitHub-Token"] = customToken;

  const res = await fetch(`${API_URL}/repos`, { headers });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch repositories (${res.status})`);
  }
  return res.json();
}

export async function fetchFailedLogs(owner: string, repo: string, limit: number = 5, customToken?: string) {
  const headers: Record<string, string> = {};
  if (customToken) headers["X-GitHub-Token"] = customToken;

  const res = await fetch(`${API_URL}/logs/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/failed?limit=${limit}`, {
    headers,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to fetch logs (${res.status})`);
  }
  return res.json();
}

export async function fetchRecentWebhookEvents() {
  const res = await fetch(`${API_URL}/events/recent`);
  if (!res.ok) throw new Error("Failed to load recent events");
  return res.json();
}

export async function fetchRagIncidents() {
  const res = await fetch(`${API_URL}/rag/incidents`);
  if (!res.ok) throw new Error("Failed to load RAG incidents");
  return res.json();
}

export async function simulateWebhookFailure(payload: {
  repo: string;
  workflow: string;
  branch: string;
  conclusion: string;
}) {
  const [owner, name] = payload.repo.includes("/") ? payload.repo.split("/") : ["abhishekvcet", payload.repo];
  const fakeRunId = Math.floor(1000000 + Math.random() * 9000000);

  const mockPayload = {
    action: "completed",
    workflow_run: {
      id: fakeRunId,
      name: payload.workflow,
      head_branch: payload.branch,
      head_sha: "9f3a8b2c4e1d5",
      conclusion: payload.conclusion,
      triggering_actor: { login: "devops-engineer" },
    },
    repository: {
      full_name: `${owner}/${name}`,
      name: name,
      owner: { login: owner },
    },
  };

  const res = await fetch(`${API_URL}/webhook/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-GitHub-Event": "workflow_run",
    },
    body: JSON.stringify(mockPayload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Simulation request failed (${res.status})`);
  }

  return res.json();
}

export function createEventSource() {
  return new EventSource(`${API_URL}/events/stream`);
}
