"""
FastAPI Backend for GitHub Actions Detective / Log Extractor
Refactored architecture supporting Next.js frontend with CORS, clean endpoints,
intelligent log parsing, and GitHub REST API integration.
"""

import os
import re
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="GitHub Actions Detective API",
    description="Backend API for fetching repositories, workflows, and parsing failed CI/CD logs.",
    version="2.0.0",
)

# CORS Configuration for Next.js frontend
cors_env = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GITHUB_API_URL = "https://api.github.com"


# -------------------------------------------------------------
# Models
# -------------------------------------------------------------
class RepoItem(BaseModel):
    id: Optional[int] = None
    full_name: str
    owner: str
    name: str
    private: bool = False
    default_branch: Optional[str] = "main"
    html_url: Optional[str] = None
    updated_at: Optional[str] = None


class FailedStep(BaseModel):
    name: Optional[str] = None
    number: Optional[int] = None
    status: Optional[str] = None
    conclusion: Optional[str] = None


class ParsedLogSummary(BaseModel):
    status: str = "failed"
    job: str
    failed_step: str
    exit_code: Optional[int] = None
    root_cause: str
    category: str
    confidence: float
    auto_fix: str


class FailedJobLog(BaseModel):
    run_id: int
    run_name: str
    workflow_id: Optional[int] = None
    workflow_path: Optional[str] = None
    run_number: Optional[int] = None
    branch: Optional[str] = None
    commit: Optional[str] = None
    event: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    run_url: Optional[str] = None
    job_id: int
    job_name: str
    job_url: Optional[str] = None
    job_status: Optional[str] = None
    job_conclusion: Optional[str] = None
    failed_steps: List[FailedStep] = []
    logs: str
    parsed_summary: Optional[ParsedLogSummary] = None


class LogsResponse(BaseModel):
    repository: str
    status: str
    message: Optional[str] = None
    failure_count: int
    extracted_logs: List[FailedJobLog] = []


# -------------------------------------------------------------
# Helper Functions
# -------------------------------------------------------------
def get_github_headers(token: str) -> Dict[str, str]:
    return {
        "Accept": "application/vnd.github+json",
        "Authorization": f"Bearer {token}",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def get_github_token(header_token: Optional[str]) -> str:
    token = header_token or os.getenv("GITHUB_TOKEN")
    if not token or token == "your_personal_access_token_here":
        raise HTTPException(
            status_code=401,
            detail="GitHub token not configured. Please supply X-GitHub-Token header or set GITHUB_TOKEN in backend .env",
        )
    return token


def parse_log_summary(raw_text: str, job_name: str = "unknown-job") -> ParsedLogSummary:
    """Analyze and generate structured diagnostic summary from CI log output."""
    if not raw_text:
        return ParsedLogSummary(
            status="failed",
            job=job_name,
            failed_step=job_name,
            exit_code=None,
            root_cause="No log content available to diagnose.",
            category="Unknown",
            confidence=0.5,
            auto_fix="Check if the runner produced logs before aborting.",
        )

    # Clean ANSI codes and normalise
    text = re.sub(r"\x1b\[[0-9;]*[a-zA-Z]", "", raw_text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.strip() for line in text.split("\n") if line.strip()]

    failed_step = job_name or "unknown-job"
    exit_code = None
    root_cause = "Workflow failed during step execution."
    category = "Workflow Failure"
    auto_fix = "Inspect the failed command output and dependencies before re-running."

    # Look for exit code patterns
    exit_match = re.search(r"(?:exit(?: status|\s+code)?|process exited with code|status)\s*[:=]?\s*(\d+)", text, re.I)
    if exit_match:
        try:
            exit_code = int(exit_match.group(1))
        except ValueError:
            pass

    # Look for run command
    for line in reversed(lines):
        if re.search(r"^(##\[group\]|##\[command\]|Run\s+)", line, re.I):
            clean_cmd = re.sub(r"^(##\[group\]|##\[command\]|Run\s+)", "", line, flags=re.I).strip()
            if clean_cmd:
                failed_step = clean_cmd
                break

    # Look for primary error line
    for line in lines:
        if re.search(r"##\[error\]|error:|fatal:|command failed|failed with exit code", line, re.I):
            detail = re.sub(r"^(##\[error\]|Error:\s*)", "", line, flags=re.I).strip()
            if detail:
                failed_step = detail[:80] + ("..." if len(detail) > 80 else "")
                root_cause = detail
                break

    if exit_code is not None:
        root_cause = f"Process terminated with non-zero exit status code ({exit_code})."
        category = "Non-zero Exit Code"
        auto_fix = "Fix the command or syntax error triggering the exit code and re-run."

    if re.search(r"npm|yarn|pnpm|pip|poetry|pipenv|requirements\.txt|package\.json|go test|mvn|gradle", text, re.I):
        category = "Dependency or Build Script Failure"
        auto_fix = "Verify lockfile consistency, package versions, and install dependencies locally to reproduce."
    elif re.search(r"docker|permission denied|no such file or directory|syntax error|undefined variable|not found", text, re.I):
        category = "Environment or Configuration Failure"
        auto_fix = "Verify directory paths, environment secrets, and container image compatibility."

    confidence = 1.0 if (exit_code is not None or "##[error]" in text) else 0.85

    return ParsedLogSummary(
        status="failed",
        job=job_name,
        failed_step=failed_step,
        exit_code=exit_code,
        root_cause=root_cause,
        category=category,
        confidence=confidence,
        auto_fix=auto_fix,
    )


# -------------------------------------------------------------
# Endpoints
# -------------------------------------------------------------
@app.get("/health")
async def health_check():
    """Service health and token status check."""
    token_present = bool(os.getenv("GITHUB_TOKEN") and os.getenv("GITHUB_TOKEN") != "your_personal_access_token_here")
    return {
        "status": "healthy",
        "service": "GitHub Actions Detective API",
        "has_token_configured": token_present,
    }


@app.get("/repos")
async def get_user_repos(
    token: Optional[str] = Header(None, alias="X-GitHub-Token", description="GitHub Personal Access Token"),
):
    """Fetch user repositories sorted by recent activity."""
    github_token = get_github_token(token)
    headers = get_github_headers(github_token)
    repos_url = f"{GITHUB_API_URL}/user/repos"
    params = {
        "sort": "updated",
        "direction": "desc",
        "per_page": 100,
        "affiliation": "owner,collaborator,organization_member",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(repos_url, headers=headers, params=params)
            if resp.status_code != 200:
                raise HTTPException(
                    status_code=resp.status_code,
                    detail=f"GitHub API Error: {resp.text}",
                )

            data = resp.json()
            repos: List[Dict[str, Any]] = []
            for r in data:
                repos.append({
                    "id": r.get("id"),
                    "full_name": r.get("full_name"),
                    "owner": r.get("owner", {}).get("login"),
                    "name": r.get("name"),
                    "private": r.get("private", False),
                    "default_branch": r.get("default_branch", "main"),
                    "html_url": r.get("html_url"),
                    "updated_at": r.get("updated_at"),
                })

            return {"count": len(repos), "repos": repos}
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"Failed to connect to GitHub API: {str(exc)}")


@app.get("/logs/{owner}/{repo}/failed", response_model=LogsResponse)
async def get_failed_logs(
    owner: str,
    repo: str,
    token: Optional[str] = Header(None, alias="X-GitHub-Token", description="GitHub Personal Access Token"),
    limit: int = Query(5, ge=1, le=20, description="Max failed workflows to inspect"),
):
    """Retrieve failed workflow runs and auto-parsed error diagnostics for a repository."""
    github_token = get_github_token(token)
    headers = get_github_headers(github_token)
    runs_url = f"{GITHUB_API_URL}/repos/{owner}/{repo}/actions/runs"

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            runs_resp = await client.get(runs_url, headers=headers, params={"per_page": 100})
            if runs_resp.status_code != 200:
                raise HTTPException(
                    status_code=runs_resp.status_code,
                    detail=f"Failed to fetch workflow runs: {runs_resp.text}",
                )

            runs_data = runs_resp.json()
            all_runs = runs_data.get("workflow_runs", [])

            if not all_runs:
                return LogsResponse(
                    repository=f"{owner}/{repo}",
                    status="healthy",
                    message="No GitHub Actions workflow runs found for this repository.",
                    failure_count=0,
                    extracted_logs=[],
                )

            # Find latest run for each distinct workflow
            latest_runs: Dict[int, Dict[str, Any]] = {}
            for run in all_runs:
                wf_id = run.get("workflow_id")
                if wf_id is not None and wf_id not in latest_runs:
                    latest_runs[wf_id] = run

            # Filter only currently failing runs
            failing_runs = [r for r in latest_runs.values() if r.get("conclusion") == "failure"]
            failing_runs.sort(key=lambda r: r.get("created_at", ""), reverse=True)
            failed_target_runs = failing_runs[:limit]

            if not failed_target_runs:
                return LogsResponse(
                    repository=f"{owner}/{repo}",
                    status="healthy",
                    message="All workflows are currently passing! No unresolved failures detected.",
                    failure_count=0,
                    extracted_logs=[],
                )

            extracted_results: List[FailedJobLog] = []

            for run in failed_target_runs:
                run_id = run.get("id")
                jobs_url = f"{GITHUB_API_URL}/repos/{owner}/{repo}/actions/runs/{run_id}/jobs"
                jobs_resp = await client.get(jobs_url, headers=headers, params={"per_page": 100})

                if jobs_resp.status_code != 200:
                    continue

                jobs_data = jobs_resp.json()
                failed_jobs = [j for j in jobs_data.get("jobs", []) if j.get("conclusion") == "failure"]

                for job in failed_jobs:
                    job_id = job.get("id")
                    job_name = job.get("name", "Unknown Job")

                    # Retrieve logs for failed job
                    logs_url = f"{GITHUB_API_URL}/repos/{owner}/{repo}/actions/jobs/{job_id}/logs"
                    logs_resp = await client.get(logs_url, headers=headers, follow_redirects=True)

                    if logs_resp.status_code == 200:
                        raw_log = logs_resp.text
                    else:
                        raw_log = f"Failed to fetch job log output. Status: {logs_resp.status_code}"

                    # Step failures
                    failed_steps = [
                        FailedStep(
                            name=s.get("name"),
                            number=s.get("number"),
                            status=s.get("status"),
                            conclusion=s.get("conclusion"),
                        )
                        for s in job.get("steps", [])
                        if s.get("conclusion") == "failure"
                    ]

                    # Parse diagnostic summary
                    diagnostic = parse_log_summary(raw_log, job_name)

                    extracted_results.append(
                        FailedJobLog(
                            run_id=run_id,
                            run_name=run.get("name", "Unknown Workflow"),
                            workflow_id=run.get("workflow_id"),
                            workflow_path=run.get("path"),
                            run_number=run.get("run_number"),
                            branch=run.get("head_branch"),
                            commit=run.get("head_sha"),
                            event=run.get("event"),
                            created_at=run.get("created_at"),
                            updated_at=run.get("updated_at"),
                            run_url=run.get("html_url"),
                            job_id=job_id,
                            job_name=job_name,
                            job_url=job.get("html_url"),
                            job_status=job.get("status"),
                            job_conclusion=job.get("conclusion"),
                            failed_steps=failed_steps,
                            logs=raw_log,
                            parsed_summary=diagnostic,
                        )
                    )

            return LogsResponse(
                repository=f"{owner}/{repo}",
                status="failing",
                failure_count=len(extracted_results),
                extracted_logs=extracted_results,
            )

    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Network error communicating with GitHub: {str(exc)}",
        )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("BACKEND_PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
