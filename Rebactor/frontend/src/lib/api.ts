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
