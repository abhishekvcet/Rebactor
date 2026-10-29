"""
AI LLM Diagnostician Module
Orchestrates LangChain Core prompts and LLM reasoning for deep root-cause analysis,
plain-English failure explanation, and actionable auto-remediation steps.
Supports OpenAI / OpenRouter / Groq / Anthropic compatible APIs with graceful fallback.
"""

import os
import json
import re
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from langchain_core.prompts import PromptTemplate

# Data model for structured LLM Output
class LLMDiagnosticResult(BaseModel):
    category: str = Field(description="Category: Build Failure, Dependency Failure, Configuration Failure, Infrastructure Failure, Test Failure, or Timeout")
    failed_step: str = Field(description="Specific failing command or step name")
    exit_code: Optional[int] = Field(None, description="Process exit code if found")
    plain_summary: str = Field(description="2-sentence plain-English summary of what failed and why")
    root_cause: str = Field(description="Detailed technical root-cause reasoning")
    auto_fix: str = Field(description="Concrete step-by-step resolution command or code fix")
    confidence: float = Field(default=0.95, description="Confidence rating between 0.0 and 1.0")
    engine: str = Field(default="LLM-Powered", description="Engine used for reasoning")
    rag_incident_match: Optional[Dict[str, Any]] = Field(default=None, description="Historical organizational incident retrieved via RAG")


DEVOPS_PROMPT_TEMPLATE = """
You are an expert Senior Site Reliability Engineer (SRE) and DevOps Architect.
Analyze the following raw failure log snippet from a CI/CD workflow job and provide an intelligent diagnosis.

WORKFLOW JOB NAME: {job_name}

{rag_context}

RAW LOG EXCERPT:
{log_excerpt}

Analyze the error carefully. Classify the problem, determine why it broke, and provide an actionable fix.
If the retrieved historical incident is relevant, synthesize its past resolution into your auto_fix.
Respond ONLY with a valid JSON object matching this schema:
{{
  "category": "Build Failure | Dependency Failure | Configuration Failure | Infrastructure Failure | Test Failure | Timeout",
  "failed_step": "Exact command or step that caused the error",
  "exit_code": null or integer number,
  "plain_summary": "Crisp 1-2 sentence explanation of what broke and why",
  "root_cause": "Specific technical root-cause reason (e.g. missing lockfile, typescript compiler error, unhandled promise, port conflict)",
  "auto_fix": "Exact shell command, dependency upgrade, or code snippet needed to fix it",
  "confidence": 0.95
}}

Do NOT include any markdown code blocks, backticks, or other text outside the JSON.
"""

prompt_template = PromptTemplate(
    template=DEVOPS_PROMPT_TEMPLATE,
    input_variables=["job_name", "log_excerpt", "rag_context"]
)


def extract_relevant_log_snippet(raw_text: str, max_chars: int = 4000) -> str:
    """Extract and prioritize error sections of raw CI logs for prompt efficiency."""
    if not raw_text:
        return "No log content available."

    # Remove ANSI codes and normalize newlines
    cleaned = re.sub(r"\x1b\[[0-9;]*[a-zA-Z]", "", raw_text)
    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.strip() for line in cleaned.split("\n") if line.strip()]

    # Collect lines surrounding error indicators
    error_indexes = [
        i for i, line in enumerate(lines)
        if re.search(r"##\[error\]|error:|fatal:|failed with exit code|npm ERR!|FAILED|Traceback|Panic|Exception", line, re.I)
    ]

    if error_indexes:
        # Take a window of 30 lines before and after first major error
        start_idx = max(0, error_indexes[0] - 15)
        end_idx = min(len(lines), error_indexes[-1] + 25)
        selected_lines = lines[start_idx:end_idx]
        snippet = "\n".join(selected_lines)
    else:
        # Fallback to the tail of the log where failures typically conclude
        snippet = "\n".join(lines[-80:])

    return snippet[:max_chars]


async def generate_llm_diagnosis(raw_log: str, job_name: str = "workflow-job") -> LLMDiagnosticResult:
    """
    Apply LLM reasoning over CI/CD logs using LangChain.
    Falls back gracefully to intelligent heuristic reasoning if no LLM API key is set.
    """
    log_snippet = extract_relevant_log_snippet(raw_log)

    # 1. RAG Layer: Search historical incidents matching this error signature
    rag_incident_match = None
    rag_context = ""
    try:
        from rag_service import search_similar_incidents
        similar_incidents = search_similar_incidents(raw_log, min_similarity=0.45, top_k=1)
        if similar_incidents:
            best_match = similar_incidents[0]
            rag_incident_match = best_match.model_dump()
            rag_context = f"""
RETRIEVED ORGANIZATIONAL INCIDENT (RAG Memory):
Similar Past Incident ID: {best_match.incident_id}
Repository: {best_match.repository}
Workflow: {best_match.workflow_name}
Past Root Cause: {best_match.root_cause}
Past Team Resolution: {best_match.resolution}
Similarity Score: {int(best_match.similarity_score * 100)}% Match
"""
    except Exception as rag_err:
        print(f"[RAG Retrieval Notice] {rag_err}")

    openai_key = os.getenv("OPENAI_API_KEY", "")
    groq_key = os.getenv("GROQ_API_KEY", "")
    api_base = os.getenv("LLM_API_BASE", "https://api.openai.com/v1")
    model_name = os.getenv("LLM_MODEL", "gpt-4o-mini")

    # If an LLM Key is configured (OpenAI, Groq, or compatible provider)
    if openai_key or groq_key:
        try:
            import httpx
            active_key = groq_key or openai_key
            active_base = "https://api.groq.com/openai/v1" if groq_key and not openai_key else api_base
            active_model = os.getenv("LLM_MODEL") or ("llama-3.3-70b-versatile" if groq_key and not openai_key else model_name)

            formatted_prompt = prompt_template.format(
                job_name=job_name,
                log_excerpt=log_snippet,
                rag_context=rag_context or "No relevant past organizational incidents retrieved for this failure.",
            )

            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    f"{active_base}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {active_key}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": active_model,
                        "messages": [
                            {"role": "system", "content": "You are a DevOps Incident Response AI."},
                            {"role": "user", "content": formatted_prompt},
                        ],
                        "temperature": 0.1,
                        "response_format": {"type": "json_object"},
                    },
                )

                if res.status_code == 200:
                    resp_data = res.json()
                    content = resp_data["choices"][0]["message"]["content"]
                    parsed = json.loads(content)
                    return LLMDiagnosticResult(
                        category=parsed.get("category", "Build Failure"),
                        failed_step=parsed.get("failed_step", job_name),
                        exit_code=parsed.get("exit_code"),
                        plain_summary=parsed.get("plain_summary", "Workflow step terminated with critical errors."),
                        root_cause=parsed.get("root_cause", "Detailed error captured in pipeline execution."),
                        auto_fix=parsed.get("auto_fix", "Review the step logs and resolve syntax/dependency conflicts."),
                        confidence=float(parsed.get("confidence", 0.95)),
                        engine=f"LangChain ({active_model})" + (" + RAG Memory" if rag_incident_match else ""),
                        rag_incident_match=rag_incident_match,
                    )
        except Exception as llm_err:
            print(f"[LLM Diagnostician Warning] LLM call fell back to local reasoning: {llm_err}")

    # High-fidelity Local Heuristic Reasoning (Autonomous fallback)
    exit_code = None
    exit_match = re.search(r"(?:exit(?:\s+code)?|exit status|process exited with code|status)\s*[:=]?\s*(\d+)", log_snippet, re.I)
    if exit_match:
        try:
            exit_code = int(exit_match.group(1))
        except ValueError:
            pass

    category = "Build Failure"
    failed_step = job_name
    root_cause = "Workflow failed during step execution without explicit uncaught exception trace."
    auto_fix = "Inspect command flags and environment dependencies prior to re-running."

    # Pattern extraction
    if re.search(r"npm test|jest|pytest|go test|mvn test|FAIL\s", log_snippet, re.I):
        category = "Test Failure"
        root_cause = "One or more automated unit/integration test assertions failed."
        auto_fix = "Run tests locally with verbose logging (e.g., `npm test -- --verbose` or `pytest -v`) to isolate the failing assertion."
    elif re.search(r"ModuleNotFoundError|cannot find module|ERR! 404|package\.json|requirements\.txt", log_snippet, re.I):
        category = "Dependency Failure"
        root_cause = "Required library or package could not be resolved from registry or lockfile."
        auto_fix = "Verify package lockfile consistency (`npm ci` or `pip install -r requirements.txt`) and check package registry credentials."
    elif re.search(r"TypeScript error|TS\d+|SyntaxError|compilation failed", log_snippet, re.I):
        category = "Build Failure"
        root_cause = "Syntax or type-check validation failed during build phase."
        auto_fix = "Run `npx tsc --noEmit` locally to inspect type mismatches and fix schema definitions."
    elif re.search(r"permission denied|EACCES|Docker daemon|no space left on device", log_snippet, re.I):
        category = "Infrastructure Failure"
        root_cause = "Runner runner resource constraint, file permission error, or container socket access issue."
        auto_fix = "Add `chmod +x` permissions on scripts or adjust container security context in workflow YAML."
    elif exit_code is not None:
        category = "Non-zero Exit Code"
        root_cause = f"Underlying subprocess exited with abnormal status code {exit_code}."
        auto_fix = f"Investigate the command preceding exit code {exit_code} and verify expected input arguments."

    # Error line targeting
    for line in log_snippet.split("\n"):
        if re.search(r"##\[error\]|error:|FAIL\s", line, re.I):
            clean_line = re.sub(r"^(##\[error\]|Error:\s*)", "", line, flags=re.I).strip()
            if clean_line:
                failed_step = clean_line[:85]
                root_cause = clean_line
                break

    return LLMDiagnosticResult(
        category=category,
        failed_step=failed_step,
        exit_code=exit_code,
        plain_summary=f"The job failed during '{failed_step}' with {category.lower()}.",
        root_cause=root_cause,
        auto_fix=auto_fix,
        confidence=0.92,
        engine="DevOps Failure Assistant (Hybrid Heuristic + LangChain Fallback)",
    )
