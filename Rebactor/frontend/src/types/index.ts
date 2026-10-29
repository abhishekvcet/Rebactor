export interface RepoItem {
  id?: number;
  full_name: string;
  owner: string;
  name: string;
  private: boolean;
  default_branch?: string;
  html_url?: string;
  updated_at?: string;
}

export interface FailedStep {
  name?: string;
  number?: number;
  status?: string;
  conclusion?: string;
}

export interface ParsedLogSummary {
  status: string;
  job: string;
  failed_step: string;
  exit_code?: number | null;
  plain_summary?: string;
  root_cause: string;
  category: string;
  confidence: number;
  auto_fix: string;
  engine?: string;
}

export interface FailedJobLog {
  run_id: number;
  run_name: string;
  workflow_id?: number;
  workflow_path?: string;
  run_number?: number;
  branch?: string;
  commit?: string;
  event?: string;
  created_at?: string;
  updated_at?: string;
  run_url?: string;
  job_id: number;
  job_name: string;
  job_url?: string;
  job_status?: string;
  job_conclusion?: string;
  failed_steps: FailedStep[];
  logs: string;
  parsed_summary?: ParsedLogSummary;
}

export interface LogsResponse {
  repository: string;
  status: "healthy" | "failing" | string;
  message?: string;
  failure_count: number;
  extracted_logs: FailedJobLog[];
}

export interface HealthResponse {
  status: string;
  service: string;
  has_token_configured: boolean;
  webhook_endpoint?: string;
  has_webhook_secret?: boolean;
}

export interface WebhookDiagnosedJob {
  job_id: number;
  job_name: string;
  job_url?: string;
  diagnostic: ParsedLogSummary;
  raw_log_preview?: string;
}

export interface LiveWebhookEvent {
  id: string;
  timestamp: string;
  event_type: string;
  repository: string;
  run_id: number;
  run_name: string;
  branch?: string;
  commit?: string;
  sender?: string;
  diagnosed_jobs: WebhookDiagnosedJob[];
  status: string;
}
