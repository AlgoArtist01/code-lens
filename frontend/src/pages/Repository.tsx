import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, Issue } from "../lib/api.js";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { ReviewJob } from "../lib/api.js";
import { Symbol } from "../lib/api.js";

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"] as const;
const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--critical)",
  high: "var(--high)",
  medium: "var(--medium)",
  low: "var(--low)",
  info: "var(--info)",
};

interface FileEntry {
  path: string;
  language: string | null;
  size_bytes: number;
  line_count: number;
}

function ChartsSection({ issues, files }: { issues: Issue[]; files: FileEntry[] }) {
  const severityData = SEVERITY_ORDER.map((sev) => ({
    name: sev,
    count: issues.filter((i) => i.severity === sev).length,
  })).filter((d) => d.count > 0);

  const languageMap = new Map<string, number>();
  files.forEach((f) => {
    const lang = f.language ?? "other";
    languageMap.set(lang, (languageMap.get(lang) ?? 0) + 1);
  });
  const languageData = Array.from(languageMap.entries()).map(([name, value]) => ({ name, value }));

  const complexityIssues = issues.filter((i) => i.rule === "cyclomatic-complexity");
  const complexityByFile = new Map<string, number>();
  complexityIssues.forEach((i) => {
    complexityByFile.set(i.file_path, (complexityByFile.get(i.file_path) ?? 0) + 1);
  });
  const complexityData = Array.from(complexityByFile.entries())
    .map(([name, count]) => ({ name: name.split("/").pop() ?? name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const securityIssues = issues.filter((i) => i.source === "bandit");
  const securityData = SEVERITY_ORDER.map((sev) => ({
    name: sev,
    count: securityIssues.filter((i) => i.severity === sev).length,
  })).filter((d) => d.count > 0);

  const PIE_COLORS = ["#5B8DEF", "#3DD68C", "#F5A623", "#E5484D", "#8B92A0", "#F5D90A"];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.5rem" }}>
      <ChartCard title="Issue distribution">
        {severityData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={severityData}>
              <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {severityData.map((entry, idx) => (
                  <Cell key={idx} fill={SEVERITY_COLORS[entry.name] ?? "var(--accent)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Languages">
        {languageData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={languageData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {languageData.map((_, idx) => (
                  <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Complexity (top files)">
        {complexityData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={complexityData} layout="vertical">
              <XAxis type="number" tick={{ fill: "var(--text-muted)", fontSize: 11 }} allowDecimals={false} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fill: "var(--text-muted)", fontSize: 10 }} className="mono" />
              <Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }} />
              <Bar dataKey="count" fill="var(--accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Security findings">
        {securityData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={securityData}>
              <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--text-muted)", fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {securityData.map((entry, idx) => (
                  <Cell key={idx} fill={SEVERITY_COLORS[entry.name] ?? "var(--critical)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, padding: "1rem" }}>
      <h3 style={{ fontSize: "0.9rem", margin: "0 0 0.5rem", color: "var(--text-muted)" }}>{title}</h3>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
      No data yet
    </div>
  );
}

export function Repository() {
  const { id } = useParams<{ id: string }>();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [job, setJob] = useState<ReviewJob | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<Symbol[]>([]);
  const [symbolTypeFilter, setSymbolTypeFilter] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [issuesRes, treeRes, symbolsRes] = await Promise.all([
          api.get(`/repo/${id}/issues`),
          api.get(`/repo/${id}/tree`),
          api.get(`/repo/${id}/symbols`),
        ]);
        setIssues(issuesRes.data.issues);
        setFiles(treeRes.data.files);
        setSymbols(symbolsRes.data.symbols);
      } catch {
        setError("Failed to load repository data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);
async function runParse() {
  setActionLoading("parse");
  setActionMsg(null);
  try {
    const res = await api.post(`/repo/${id}/parse`);
    setActionMsg(`Parsed: ${res.data.filesIndexed} files, ${res.data.symbolsExtracted} symbols`);
    const treeRes = await api.get(`/repo/${id}/tree`);
    setFiles(treeRes.data.files);
    const symbolsRes = await api.get(`/repo/${id}/symbols`);
    setSymbols(symbolsRes.data.symbols);
  } catch (err: any) {
    setActionMsg(err.response?.data?.error ?? "Parse failed");
  } finally {
    setActionLoading(null);
  }
}

async function runAnalyze(kind: "general" | "python" | "js") {
  setActionLoading(kind);
  setActionMsg(null);
  try {
    const res = await api.post(`/repo/${id}/analyze/${kind}`);
    setActionMsg(`${kind}: ${res.data.issuesFound} issues found`);
    const issuesRes = await api.get(`/repo/${id}/issues`);
    setIssues(issuesRes.data.issues);
  } catch (err: any) {
    setActionMsg(err.response?.data?.error ?? `${kind} analysis failed`);
  } finally {
    setActionLoading(null);
  }
}

async function startBackgroundReview() {
  setActionLoading("review");
  setActionMsg(null);
  try {
    const res = await api.post(`/repo/${id}/review`);
    setActionMsg("Background review queued");
    pollJob(res.data.jobId);
  } catch (err: any) {
    setActionMsg(err.response?.data?.error ?? "Failed to queue review");
    setActionLoading(null);
  }
}

function pollJob(jobId: string) {
  const interval = setInterval(async () => {
    try {
      const res = await api.get(`/repo/${id}/review/${jobId}`);
      setJob(res.data);
      if (res.data.status === "completed" || res.data.status === "failed" || res.data.status === "cancelled") {
        clearInterval(interval);
        setActionLoading(null);
        if (res.data.status === "completed") {
          const issuesRes = await api.get(`/repo/${id}/issues`);
          setIssues(issuesRes.data.issues);
          const treeRes = await api.get(`/repo/${id}/tree`);
          setFiles(treeRes.data.files);
        }
      }
    } catch {
      clearInterval(interval);
      setActionLoading(null);
    }
  }, 2000);
}

async function cancelJob() {
  if (!job) return;
  try {
    await api.post(`/repo/${id}/review/${job.id}/cancel`);
    setJob({ ...job, status: "cancelled" });
    setActionLoading(null);
  } catch {
    setActionMsg("Failed to cancel job");
  }
}

  const counts = SEVERITY_ORDER.reduce((acc, sev) => {
    acc[sev] = issues.filter((i) => i.severity === sev).length;
    return acc;
  }, {} as Record<string, number>);

  const total = issues.length;

  const filteredIssues = severityFilter ? issues.filter((i) => i.severity === severityFilter) : issues;
  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / PAGE_SIZE));
  const paginatedIssues = filteredIssues.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Loading repository...</p>;
  if (error) return <p style={{ color: "var(--critical)" }}>{error}</p>;

  return (
    <div>
      <Link to="/" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
        ← Back to repositories
      </Link>
      <h1 style={{ fontSize: "1.5rem", margin: "0.5rem 0 1.5rem" }}>Repository</h1>

      {/* Signature element: risk spectrum bar */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Risk spectrum</span>
          <span className="mono" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {total} issue{total !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", background: "var(--surface-raised)" }}>
          {total === 0 ? (
            <div style={{ width: "100%", background: "var(--low)" }} />
          ) : (
            SEVERITY_ORDER.map((sev) =>
              counts[sev] > 0 ? (
                <div
                  key={sev}
                  style={{ width: `${(counts[sev] / total) * 100}%`, background: SEVERITY_COLORS[sev] }}
                  title={`${sev}: ${counts[sev]}`}
                />
              ) : null
            )
          )}
        </div>
        <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
          {SEVERITY_ORDER.map((sev) => (
            <button
              key={sev}
              onClick={() => {
                setSeverityFilter(severityFilter === sev ? null : sev);
                setPage(1);
         }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontSize: "0.8rem",
                color: severityFilter === sev ? "var(--text)" : "var(--text-muted)",
                opacity: severityFilter && severityFilter !== sev ? 0.5 : 1,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: SEVERITY_COLORS[sev] }} />
              {sev} ({counts[sev]})
            </button>
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          flexWrap: "wrap",
          marginBottom: "1.5rem",
          alignItems: "center",
        }}
      >
        <button onClick={runParse} disabled={!!actionLoading} style={actionBtnStyle}>
          {actionLoading === "parse" ? "Parsing..." : "Parse"}
        </button>
        <button onClick={() => runAnalyze("general")} disabled={!!actionLoading} style={actionBtnStyle}>
          {actionLoading === "general" ? "Running..." : "General checks"}
        </button>
        <button onClick={() => runAnalyze("python")} disabled={!!actionLoading} style={actionBtnStyle}>
          {actionLoading === "python" ? "Running..." : "Python analysis"}
        </button>
        <button onClick={() => runAnalyze("js")} disabled={!!actionLoading} style={actionBtnStyle}>
          {actionLoading === "js" ? "Running..." : "JS/TS analysis"}
        </button>
        <button
          onClick={startBackgroundReview}
          disabled={!!actionLoading}
          style={{ ...actionBtnStyle, background: "var(--accent)", border: "none", color: "#fff" }}
        >
          {actionLoading === "review" ? "Queued..." : "Run full review (background)"}
        </button>
        <Link
          to={`/repository/${id}/review`}
          style={{ ...actionBtnStyle, textDecoration: "none", display: "inline-block" }}
        >
          AI Review →
        </Link>
      </div>

      {actionMsg && (
        <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>{actionMsg}</div>
      )}

      {job && (job.status === "queued" || job.status === "active") && (
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem" }}>
              {job.current_stage ?? job.status} — {job.progress}%
            </span>
            <button onClick={cancelJob} style={{ ...pageBtnStyle, color: "var(--critical)" }}>
              Cancel
            </button>
          </div>
          <div style={{ height: 6, background: "var(--surface-raised)", borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${job.progress}%`,
                background: "var(--accent)",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      )}
      <ChartsSection issues={issues} files={files} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "0.75rem" }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnStyle}>
          ← Prev
          </button>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", alignSelf: "center" }}>
            Page {page} of {totalPages}
          </span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pageBtnStyle}>
           Next →
          </button>
          </div>
        )}
        <section>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Issues</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 500, overflowY: "auto" }}>
            {filteredIssues.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No issues to show.</p>
            )}
            {paginatedIssues.map((issue, idx) => (
              <div
                key={idx}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity]}`,
                  borderRadius: 6,
                  padding: "0.6rem 0.8rem",
                  fontSize: "0.82rem",
                }}
              >
                <div className="mono" style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                  {issue.file_path}
                  {issue.line_number ? `:${issue.line_number}` : ""} · {issue.source}
                </div>
                <div style={{ marginTop: "0.25rem" }}>{issue.description}</div>
              </div>
            ))}
          </div>
        </section>
        
        <section>
  <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Symbols</h2>
  <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem", flexWrap: "wrap" }}>
    {["function", "class", "import", "comment"].map((type) => (
      <button
        key={type}
        onClick={() => setSymbolTypeFilter(symbolTypeFilter === type ? null : type)}
        style={{
          background: symbolTypeFilter === type ? "var(--surface-raised)" : "transparent",
          border: "1px solid var(--border)",
          borderRadius: 6,
          color: "var(--text-muted)",
          padding: "0.2rem 0.5rem",
          fontSize: "0.72rem",
          cursor: "pointer",
        }}
      >
        {type} ({symbols.filter((s) => s.type === type).length})
      </button>
    ))}
  </div>
  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", maxHeight: 500, overflowY: "auto" }}>
    {symbols
      .filter((s) => !symbolTypeFilter || s.type === symbolTypeFilter)
      .map((s, idx) => (
        <div
          key={idx}
          className="mono"
          style={{
            fontSize: "0.75rem",
            padding: "0.35rem 0.5rem",
            borderRadius: 4,
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ color: "var(--text-muted)", fontSize: "0.68rem" }}>
            {s.path}
            {s.line_number ? `:${s.line_number}` : ""}
          </div>
          <div style={{ color: "var(--text)" }}>
            <span style={{ color: "var(--accent)" }}>{s.type}</span> {s.name ?? "(unnamed)"}
          </div>
        </div>
      ))}
    {symbols.length === 0 && (
      <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>No symbols yet. Run Parse first.</p>
    )}
  </div>
</section>

        <section>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Files</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxHeight: 500, overflowY: "auto" }}>
            {files.map((f) => (
              <div
                key={f.path}
                className="mono"
                style={{
                  fontSize: "0.78rem",
                  padding: "0.35rem 0.5rem",
                  borderRadius: 4,
                  color: "var(--text-muted)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: "var(--text)" }}>{f.path}</span>
                <span>{f.language ?? "—"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

const pageBtnStyle: React.CSSProperties = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  padding: "0.35rem 0.75rem",
  cursor: "pointer",
  fontSize: "0.8rem",
};

const actionBtnStyle: React.CSSProperties = {
  background: "var(--surface-raised)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text)",
  padding: "0.5rem 0.9rem",
  cursor: "pointer",
  fontSize: "0.82rem",
  fontWeight: 500,
};