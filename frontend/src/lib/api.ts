import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export interface Repository {
  id: string;
  name: string;
  source_type: "zip" | "git";
  status: string;
  created_at: string;
}

export interface Issue {
  file_path: string;
  line_number: number | null;
  severity: "critical" | "high" | "medium" | "low" | "info";
  source: string;
  rule: string;
  description: string;
}

export interface ReviewJob {
  id: string;
  status: "queued" | "active" | "completed" | "failed" | "cancelled";
  progress: number;
  current_stage: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiFinding {
  issue: string;
  suggestion: string;
  confidence: number;
  explanation: string;
  category: string;
  lineNumber: number | null;
}

export interface Symbol {
  path: string;
  type: "function" | "class" | "import" | "comment";
  name: string | null;
  line_number: number | null;
}

export interface DocEntry {
  doc_type: "readme" | "architecture" | "api";
  content: string;
  generated_at: string;
}