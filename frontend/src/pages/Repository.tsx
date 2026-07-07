import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, Issue } from "../lib/api.js";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { ReviewJob } from "../lib/api.js";
import { Symbol } from "../lib/api.js";
import { Folder, FolderOpen, File as FileIcon, ChevronRight as ChevronRightIcon, ChevronDown } from "lucide-react";
import { DocEntry } from "../lib/api.js";
import { FileText } from "lucide-react";

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
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: "1rem",
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--text-muted)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
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
  const [repoName, setRepoName] = useState<string>("");
  const [docs, setDocs] = useState<DocEntry[]>([]);
  const [docLoading, setDocLoading] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [issuesRes, treeRes, symbolsRes, reposRes, docsRes] = await Promise.all([
          api.get(`/repo/${id}/issues`),
          api.get(`/repo/${id}/tree`),
          api.get(`/repo/${id}/symbols`),
          api.get(`/repos`),
          api.get(`/repo/${id}/docs`),
        ]);
        setIssues(issuesRes.data.issues);
        setFiles(treeRes.data.files);
        setSymbols(symbolsRes.data.symbols);
        const match = reposRes.data.find((r: any) => r.id === id);
        setRepoName(match?.name ?? "Repository");
        setDocs(docsRes.data.documents);
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

  async function generateDoc(docType: "readme" | "architecture" | "api") {
  setDocLoading(docType);
  try {
    const res = await api.post(`/repo/${id}/docs/${docType}`);
    setDocs((prev) => {
      const filtered = prev.filter((d) => d.doc_type !== docType);
      return [...filtered, { doc_type: docType, content: res.data.content, generated_at: new Date().toISOString() }];
    });
    setActiveDoc(docType);
  } catch (err: any) {
    setActionMsg(err.response?.data?.error ?? `${docType} generation failed`);
  } finally {
    setDocLoading(null);
  }
}

  const total = issues.length;

  const filteredIssues = severityFilter ? issues.filter((i) => i.severity === severityFilter) : issues;
  const totalPages = Math.max(1, Math.ceil(filteredIssues.length / PAGE_SIZE));
  const paginatedIssues = filteredIssues.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading)
    return (
      <div>
        <div className="skeleton" style={{ height: 24, width: 200, marginBottom: "1.5rem" }} />
        <div className="skeleton" style={{ height: 10, marginBottom: "2rem" }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 220, borderRadius: 10 }} />
          ))}
        </div>
      </div>
    );
  if (error) return <p style={{ color: "var(--critical)" }}>{error}</p>;

  return (
    <div>
      <Link to="/" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
        ← Back to repositories
      </Link>
      <h1 style={{ fontSize: "1.5rem", margin: "0.5rem 0 1.5rem" }}>{repoName}</h1>

      {/* Signature element: risk spectrum bar */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Risk spectrum</span>
          <span className="mono" style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            {total} issue{total !== 1 ? "s" : ""}
          </span>
        </div>
        <div
          className="animate-grow"
          style={{
            display: "flex",
            height: 12,
            borderRadius: 999,
            overflow: "hidden",
            background: "var(--surface-hover)",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.2)",
          }}
        >
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
        <button onClick={runParse} disabled={!!actionLoading} style={actionBtnStyle}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}>

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
          style={{
            ...actionBtnStyle,
            background: "linear-gradient(135deg, var(--accent), var(--accent2))",
            border: "none",
            color: "#0B0E14",
            fontWeight: 700,
            boxShadow: "0 2px 12px var(--accent-glow)",
          }}
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
        <section>
          <h2 style={{ fontSize: "1.05rem", marginBottom: "0.75rem" }}>Issues</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: 500, overflowY: "auto" }}>
            {filteredIssues.length === 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>No issues to show.</p>
            )}
            {paginatedIssues.map((issue, idx) => (
              <div
                key={idx}
                className="card"
                style={{
                  borderLeft: `3px solid ${SEVERITY_COLORS[issue.severity]}`,
                  borderRadius: "var(--radius-sm)",
                  padding: "0.7rem 0.9rem",
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
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "0.5rem",
                marginTop: "0.75rem",
              }}
            >
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={pageBtnStyle}>
                ← Prev
              </button>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={pageBtnStyle}
              >
                Next →
              </button>
            </div>
          )}
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
          <div style={{ maxHeight: 500, overflowY: "auto" }}>
            {files.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>No files yet. Run Parse first.</p>
            ) : (
              buildFileTree(files).children.map((node) => <FileTreeNode key={node.path} node={node} depth={0} />)
            )}
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
  background: "var(--surface-hover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  padding: "0.55rem 1rem",
  cursor: "pointer",
  fontSize: "0.82rem",
  fontWeight: 500,
  transition: "all 0.18s ease",
};

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  language?: string | null;
  children: TreeNode[];
}

function buildFileTree(files: FileEntry[]): TreeNode {
  const root: TreeNode = { name: "", path: "", isDir: true, children: [] };
  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;
    parts.forEach((part, i) => {
      const isLast = i === parts.length - 1;
      let existing = current.children.find((c) => c.name === part);
      if (!existing) {
        existing = {
          name: part,
          path: parts.slice(0, i + 1).join("/"),
          isDir: !isLast,
          language: isLast ? file.language : undefined,
          children: [],
        };
        current.children.push(existing);
      }
      current = existing;
    });
  }
  function sortNode(node: TreeNode) {
    node.children.sort((a, b) =>
      a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1
    );
    node.children.forEach(sortNode);
  }
  sortNode(root);
  return root;
}

function FileTreeNode({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(depth < 1);

  if (!node.isDir) {
    return (
      <div
        className="mono"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          padding: "0.3rem 0.4rem",
          paddingLeft: `${depth * 1.1 + 0.4}rem`,
          fontSize: "0.78rem",
          color: "var(--text)",
          borderRadius: 4,
        }}
      >
        <FileIcon size={13} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
        {node.language && (
          <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: "0.7rem" }}>
            {node.language}
          </span>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="mono"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
          padding: "0.3rem 0.4rem",
          paddingLeft: `${depth * 1.1}rem`,
          fontSize: "0.78rem",
          color: "var(--text)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
          fontWeight: 600,
          borderRadius: 4,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRightIcon size={13} />}
        {open ? (
          <FolderOpen size={14} color="var(--accent)" />
        ) : (
          <Folder size={14} color="var(--accent)" />
        )}
        {node.name || "root"}
        <span style={{ marginLeft: "0.3rem", color: "var(--text-muted)", fontWeight: 400, fontSize: "0.7rem" }}>
          ({node.children.length})
        </span>
      </button>
      {open && node.children.map((child) => <FileTreeNode key={child.path} node={child} depth={depth + 1} />)}
    </div>
  );
}